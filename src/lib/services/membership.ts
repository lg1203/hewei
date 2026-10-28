import { Membership, MembershipPlan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type MembershipWithPlan = Membership & { plan: MembershipPlan };

export const MEMBERSHIP_STATUS = {
  TRIAL: "TRIAL",
  ACTIVE: "ACTIVE",
  EXPIRED: "EXPIRED"
} as const;

export function addBillingCycle(date: Date, cycle: string) {
  const next = new Date(date);
  if (cycle === "YEARLY") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}

export async function findActiveMembership(
  userId: string,
  now = new Date()
): Promise<MembershipWithPlan | null> {
  return prisma.membership.findFirst({
    where: {
      userId,
      status: { in: ["TRIAL", "ACTIVE"] },
      currentPeriodEnd: { gt: now }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function findActiveMembershipTx(
  tx: Prisma.TransactionClient,
  userId: string,
  now = new Date()
): Promise<MembershipWithPlan | null> {
  return tx.membership.findFirst({
    where: {
      userId,
      status: { in: ["TRIAL", "ACTIVE"] },
      currentPeriodEnd: { gt: now }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * 结算到期会员：
 * - 已关闭自动续费的会员到期后置为 EXPIRED；
 * - 开启自动续费的会员从余额自动扣费并顺延周期；
 * - 余额不足时停止续费并置为 EXPIRED。
 *
 * 该函数是幂等的：周期未到期时只做一次查询，不会重复扣费。
 */
export async function syncMembership(
  userId: string
): Promise<MembershipWithPlan | null> {
  const now = new Date();
  const current = await prisma.membership.findFirst({
    where: { userId, status: { in: ["TRIAL", "ACTIVE"] } },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
  if (!current) return null;
  if (current.currentPeriodEnd.getTime() > now.getTime()) return current;

  if (!current.autoRenew) {
    await prisma.membership.update({
      where: { id: current.id },
      data: { status: "EXPIRED" }
    });
    return null;
  }

  return prisma.$transaction(async (tx) => {
    const membership = await tx.membership.findUnique({
      where: { id: current.id },
      include: { plan: true }
    });
    if (!membership) return null;
    if (!["TRIAL", "ACTIVE"].includes(membership.status)) return null;
    if (membership.currentPeriodEnd.getTime() > now.getTime()) {
      return membership;
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    let periodStart = membership.currentPeriodStart;
    let periodEnd = membership.currentPeriodEnd;
    let status = membership.status;
    let autoRenew = membership.autoRenew;
    let balance = user.balance;
    let renewed = 0;

    while (periodEnd.getTime() <= now.getTime() && renewed < 12) {
      if (!autoRenew) break;
      const price = Math.max(0, membership.plan.price);
      if (price > 0 && balance < price) {
        status = "EXPIRED";
        autoRenew = false;
        break;
      }

      if (price > 0) {
        balance -= price;
        await tx.user.update({
          where: { id: userId },
          data: { balance: { decrement: price } }
        });
        await tx.balanceTransaction.create({
          data: {
            userId,
            amount: -price,
            type: "MEMBERSHIP",
            note: `${membership.plan.name} 自动续费`
          }
        });
      }

      const nextEnd = addBillingCycle(periodEnd, membership.plan.billingCycle);
      await tx.membershipTransaction.create({
        data: {
          membershipId: membership.id,
          userId,
          planName: membership.plan.name,
          type: "RENEWAL",
          amount: price,
          billingCycle: membership.plan.billingCycle,
          periodStart: periodEnd,
          periodEnd: nextEnd,
          paymentMethod: price > 0 ? "BALANCE" : "FREE",
          note: "自动续费"
        }
      });

      periodStart = periodEnd;
      periodEnd = nextEnd;
      status = "ACTIVE";
      renewed += 1;
    }

    if (periodEnd.getTime() <= now.getTime()) {
      status = "EXPIRED";
      autoRenew = false;
    }

    const updated = await tx.membership.update({
      where: { id: membership.id },
      data: {
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        status,
        autoRenew,
        cancelledAt: autoRenew ? null : membership.cancelledAt ?? now
      },
      include: { plan: true }
    });

    return status === "EXPIRED" ? null : updated;
  });
}

export async function subscribeMembership(input: {
  userId: string;
  planId: string;
  paymentMethod: "BALANCE" | "WECHAT";
}) {
  // 先处理到期会员，避免同一用户同时存在两条生效中的会员记录。
  await syncMembership(input.userId).catch((error) => {
    console.error("sync membership before subscribe failed", error);
  });

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: input.userId } });
    if (!user) throw new Error("用户不存在");
    if (user.status !== "ACTIVE") throw new Error("账号已被停用");

    const plan = await tx.membershipPlan.findUnique({
      where: { id: input.planId }
    });
    if (!plan || plan.status !== "ACTIVE") {
      throw new Error("会员方案不存在或已停用");
    }

    const now = new Date();
    const existing = await tx.membership.findFirst({
      where: {
        userId: input.userId,
        status: { in: ["TRIAL", "ACTIVE"] },
        currentPeriodEnd: { gt: now }
      },
      orderBy: { createdAt: "desc" }
    });
    if (existing) throw new Error("你已是会员，无需重复开通");

    const trial = plan.firstMonthFree && !user.hasUsedMembershipTrial;
    const amount = trial ? 0 : plan.price;

    if (amount > 0 && input.paymentMethod === "BALANCE") {
      if (user.balance < amount) {
        throw new Error("余额不足，请先充值或选择微信支付");
      }
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: amount } }
      });
      await tx.balanceTransaction.create({
        data: {
          userId: user.id,
          amount: -amount,
          type: "MEMBERSHIP",
          note: `${plan.name} 开通会员`
        }
      });
    }

    const periodStart = now;
    const periodEnd = trial
      ? new Date(
          now.getTime() + Math.max(1, plan.trialDays || 30) * 86400000
        )
      : addBillingCycle(now, plan.billingCycle);

    const membership = await tx.membership.create({
      data: {
        userId: user.id,
        planId: plan.id,
        status: trial ? "TRIAL" : "ACTIVE",
        startedAt: now,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
        trialUsed: trial
      },
      include: { plan: true }
    });

    if (trial) {
      await tx.user.update({
        where: { id: user.id },
        data: { hasUsedMembershipTrial: true }
      });
    }

    await tx.membershipTransaction.create({
      data: {
        membershipId: membership.id,
        userId: user.id,
        planName: plan.name,
        type: trial ? "TRIAL" : "PURCHASE",
        amount,
        billingCycle: plan.billingCycle,
        periodStart,
        periodEnd,
        paymentMethod: trial ? "FREE" : input.paymentMethod,
        note: trial ? "首月 0 元体验" : "开通会员"
      }
    });

    return { membership, trial, charged: amount };
  });
}

export async function setMembershipAutoRenew(
  userId: string,
  autoRenew: boolean
) {
  const now = new Date();
  const membership = await prisma.membership.findFirst({
    where: {
      userId,
      status: { in: ["TRIAL", "ACTIVE"] },
      currentPeriodEnd: { gt: now }
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" }
  });
  if (!membership) throw new Error("当前没有生效中的会员");

  return prisma.membership.update({
    where: { id: membership.id },
    data: {
      autoRenew,
      cancelledAt: autoRenew ? null : now
    },
    include: { plan: true }
  });
}

export async function getMembershipOverview(userId: string) {
  const membership = await syncMembership(userId);
  const [user, plans, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        balance: true,
        points: true,
        hasUsedMembershipTrial: true
      }
    }),
    prisma.membershipPlan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
    }),
    prisma.membershipTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    })
  ]);
  if (!user) throw new Error("用户不存在");

  return {
    membership,
    plans,
    transactions,
    trialEligible: !user.hasUsedMembershipTrial,
    user
  };
}
