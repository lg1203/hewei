import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { syncMembership } from "@/lib/services/membership";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        id: true,
        name: true,
        phone: true,
        balance: true,
        points: true,
        status: true,
        hasUsedMembershipTrial: true,
        createdAt: true,
        _count: { select: { coupons: true, orders: true } }
      }
    });
    if (!user) return fail("用户不存在", 404);
    const membership = await syncMembership(session.id).catch((error) => {
      console.error("sync membership failed", error);
      return null;
    });
    const [unusedCoupons, recentOrders, pointTx, balanceTx] = await Promise.all([
      prisma.userCoupon.count({
        where: { userId: session.id, status: "UNUSED" }
      }),
      prisma.order.findMany({
        where: { userId: session.id },
        include: { shop: { select: { name: true } }, items: true },
        orderBy: { createdAt: "desc" },
        take: 3
      }),
      prisma.pointTransaction.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 5
      }),
      prisma.balanceTransaction.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);
    return ok({
      user,
      membership,
      trialEligible: !user.hasUsedMembershipTrial,
      unusedCoupons,
      recentOrders,
      pointTx,
      balanceTx
    });
  } catch (error) {
    return serverError(error);
  }
}
