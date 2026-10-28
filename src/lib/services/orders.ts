import { Coupon, Prisma, User, UserCoupon } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  findActiveMembershipTx,
  type MembershipWithPlan
} from "@/lib/services/membership";
import {
  findMissingRequiredDishes,
  listRequiredDishes,
  missingDishMessage
} from "@/lib/services/required-dishes";
import {
  endOfToday,
  generateOrderNo,
  startOfToday,
  todayKey
} from "@/lib/utils";

type Tx = Prisma.TransactionClient;

export type CartItemInput = {
  dishId: string;
  quantity: number;
};

export async function ensureDailyStock(tx: Tx, dishId: string, date: string) {
  const dish = await tx.dish.findUnique({
    where: { id: dishId },
    select: { id: true, defaultQty: true, status: true }
  });
  if (!dish) throw new Error("菜品不存在");
  if (dish.status !== "ACTIVE") throw new Error("菜品已下架");
  return tx.dishDaily.upsert({
    where: { dishId_date: { dishId, date } },
    update: {},
    create: { dishId, date, totalQty: dish.defaultQty, soldQty: 0 }
  });
}

/**
 * 为会员挑选赠饮：优先从方案指定的分类中选取当日还有库存的菜品。
 */
async function pickGiftDrink(
  tx: Tx,
  shopId: string,
  categoryName: string,
  date: string
) {
  const dishes = await tx.dish.findMany({
    where: {
      shopId,
      status: "ACTIVE",
      category: { name: categoryName }
    },
    orderBy: [{ sort: "asc" }, { price: "asc" }]
  });
  for (const dish of dishes) {
    const daily = await ensureDailyStock(tx, dish.id, date);
    if (daily.soldQty < daily.totalQty) return dish;
  }
  return null;
}

export async function createPendingOrder(input: {
  shopId: string;
  tableId: string;
  userId?: string;
  type: "SELF" | "OFFLINE";
  items: CartItemInput[];
  remark?: string;
}) {
  if (!input.items.length) throw new Error("请先选择菜品");
  const date = todayKey();

  return prisma.$transaction(async (tx) => {
    const table = await tx.table.findFirst({
      where: { id: input.tableId, shopId: input.shopId }
    });
    if (!table) throw new Error("桌台不存在或不属于该门店");

    let session = await tx.diningSession.findFirst({
      where: { tableId: table.id, status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });
    if (!session) {
      session = await tx.diningSession.create({
        data: { shopId: input.shopId, tableId: table.id }
      });
    }
    if (table.status !== "OCCUPIED") {
      await tx.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" }
      });
    }

    const dishIds = [...new Set(input.items.map((i) => i.dishId))];
    const dishes = await tx.dish.findMany({
      where: {
        id: { in: dishIds },
        shopId: input.shopId,
        status: "ACTIVE"
      }
    });
    const dishMap = new Map(dishes.map((d) => [d.id, d]));

    let subtotal = 0;
    const itemsData: {
      dishId: string;
      dishName: string;
      price: number;
      quantity: number;
      amount: number;
    }[] = [];

    for (const item of input.items) {
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        throw new Error("菜品数量不正确");
      }
      const dish = dishMap.get(item.dishId);
      if (!dish) throw new Error("菜品已下架或不存在");

      await ensureDailyStock(tx, dish.id, date);
      const updated = await tx.$executeRaw`
        UPDATE "DishDaily"
        SET "soldQty" = "soldQty" + ${quantity}
        WHERE "dishId" = ${dish.id}
          AND "date" = ${date}
          AND "soldQty" + ${quantity} <= "totalQty"
      `;
      if (updated === 0) throw new Error(`${dish.name} 今日库存不足`);

      const amount = dish.price * quantity;
      subtotal += amount;
      itemsData.push({
        dishId: dish.id,
        dishName: dish.name,
        price: dish.price,
        quantity,
        amount
      });
    }

    const missingRequired = await findMissingRequiredDishes(tx, {
      shopId: input.shopId,
      sessionId: session.id,
      items: itemsData.map((item) => ({ dishId: item.dishId }))
    });
    if (missingRequired.length) {
      throw new Error(missingDishMessage(missingRequired));
    }

    const order = await tx.order.create({
      data: {
        orderNo: generateOrderNo(),
        shopId: input.shopId,
        tableId: table.id,
        sessionId: session.id,
        userId: input.userId,
        type: input.type,
        status: "PENDING",
        subtotal,
        total: subtotal,
        remark: input.remark || "",
        items: { create: itemsData }
      },
      include: { items: true }
    });

    await tx.diningSession.update({
      where: { id: session.id },
      data: {
        subtotal: { increment: subtotal },
        totalAmount: { increment: subtotal }
      }
    });

    return order;
  });
}

function allocate(total: number, weights: number[]) {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) return weights.map(() => 0);
  let allocated = 0;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - allocated;
    const share = Math.floor((weight / sum) * total);
    allocated += share;
    return share;
  });
}

export async function checkoutSession(input: {
  sessionId: string;
  userId?: string;
  userCouponId?: string;
  pointsUsed?: number;
  paymentMethod: "BALANCE" | "WECHAT" | "CASH";
  actorRole: "USER" | "MERCHANT";
}) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.diningSession.findUnique({
      where: { id: input.sessionId },
      include: {
        shop: true,
        table: true,
        orders: {
          where: { status: "PENDING" },
          include: { items: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!session) throw new Error("账单不存在");
    if (session.status !== "OPEN") throw new Error("该桌台已结账");
    if (!session.orders.length) throw new Error("当前没有待结账订单");

    const missingRequired = await findMissingRequiredDishes(tx, {
      shopId: session.shopId,
      sessionId: session.id
    });
    if (missingRequired.length) {
      throw new Error(missingDishMessage(missingRequired));
    }

    const subtotal = session.orders.reduce((sum, o) => sum + o.subtotal, 0);
    let couponDiscount = 0;
    let userCoupon: (UserCoupon & { coupon: Coupon }) | null = null;

    if (input.userCouponId) {
      if (!input.userId) throw new Error("使用优惠券需要先登录");
      const found = await tx.userCoupon.findUnique({
        where: { id: input.userCouponId },
        include: { coupon: true }
      });
      if (!found || found.userId !== input.userId) {
        throw new Error("优惠券不存在");
      }
      if (found.status !== "UNUSED") throw new Error("优惠券已使用或已失效");
      const coupon = found.coupon;
      const now = new Date();
      if (coupon.status !== "ACTIVE") throw new Error("优惠券已停用");
      if (now < coupon.startAt || now > coupon.endAt) {
        throw new Error("优惠券不在有效期内");
      }
      if (coupon.shopId && coupon.shopId !== session.shopId) {
        throw new Error("该优惠券不适用于当前门店");
      }
      if (subtotal < coupon.threshold) {
        throw new Error(`订单未达到优惠券使用门槛`);
      }
      if (coupon.type === "FULL_REDUCTION") {
        couponDiscount = Math.min(coupon.value, subtotal);
      } else if (coupon.type === "DISCOUNT") {
        const rate = coupon.discountRate ?? 100;
        couponDiscount = subtotal - Math.floor((subtotal * rate) / 100);
      }
      userCoupon = found;
    }

    let pointsUsed = 0;
    let pointsDiscount = 0;
    let memberDiscount = 0;
    let membership: MembershipWithPlan | null = null;
    let user: User | null = null;
    if (input.userId) {
      user = await tx.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new Error("用户不存在");
      if (user.status !== "ACTIVE") throw new Error("账号已被停用");
      membership = await findActiveMembershipTx(tx, input.userId);
    }

    if (membership) {
      const rate = Math.min(
        100,
        Math.max(1, membership.plan.discountRate || 100)
      );
      memberDiscount = Math.floor(
        ((subtotal - couponDiscount) * (100 - rate)) / 100
      );
      memberDiscount = Math.max(
        0,
        Math.min(memberDiscount, subtotal - couponDiscount)
      );
    }

    const requestedPoints = Math.max(0, Math.floor(Number(input.pointsUsed || 0)));
    if (requestedPoints > 0) {
      if (!user) throw new Error("使用积分需要先登录");
      const maxDiscount = Math.floor(
        ((subtotal - couponDiscount - memberDiscount) *
          session.shop.maxPointsRatio) /
          100
      );
      const maxPoints = Math.floor(
        (maxDiscount * session.shop.pointsRedeemRate) / 100
      );
      pointsUsed = Math.min(requestedPoints, user.points, maxPoints);
      pointsDiscount = Math.floor(
        (pointsUsed * 100) / session.shop.pointsRedeemRate
      );
      pointsDiscount = Math.min(pointsDiscount, maxDiscount);
      pointsUsed = Math.floor(
        (pointsDiscount * session.shop.pointsRedeemRate) / 100
      );
      if (pointsUsed <= 0) {
        pointsDiscount = 0;
        pointsUsed = 0;
      }
    }

    const total = Math.max(
      0,
      subtotal - couponDiscount - memberDiscount - pointsDiscount
    );
    const now = new Date();

    if (input.paymentMethod === "BALANCE") {
      if (!user) throw new Error("余额支付需要先登录");
      if (user.balance < total) throw new Error("余额不足，请先充值");
      await tx.user.update({
        where: { id: user.id },
        data: { balance: { decrement: total } }
      });
      await tx.balanceTransaction.create({
        data: {
          userId: user.id,
          amount: -total,
          type: "CONSUME",
          note: `${session.shop.name} 消费`,
          orderId: session.orders[0]?.id
        }
      });
    }

    if (input.paymentMethod === "CASH" && input.actorRole !== "MERCHANT") {
      throw new Error("现金支付仅支持商户端操作");
    }
    if (input.paymentMethod === "WECHAT" && !user) {
      throw new Error("微信支付需要先登录");
    }

    const couponShares = allocate(
      couponDiscount,
      session.orders.map((o) => o.subtotal)
    );
    const memberShares = allocate(
      memberDiscount,
      session.orders.map((o) => o.subtotal)
    );
    const pointShares = allocate(
      pointsDiscount,
      session.orders.map((o) => o.subtotal)
    );

    for (let i = 0; i < session.orders.length; i++) {
      const order = session.orders[i];
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          paidAt: now,
          paymentMethod: input.paymentMethod,
          couponDiscount: couponShares[i],
          memberDiscount: memberShares[i],
          pointsDiscount: pointShares[i],
          pointsUsed:
            pointsDiscount > 0
              ? Math.floor(
                  (pointsUsed * pointShares[i]) / Math.max(pointsDiscount, 1)
                )
              : 0,
          total:
            order.subtotal -
            couponShares[i] -
            memberShares[i] -
            pointShares[i]
        }
      });
    }

    let giftDrink: { dishName: string; price: number } | null = null;
    if (membership?.plan.freeDrink && session.orders.length) {
      const alreadyGift = session.orders.some((order) =>
        order.items.some((item) => item.isGift)
      );
      if (!alreadyGift) {
        const date = todayKey();
        const giftDish = await pickGiftDrink(
          tx,
          session.shopId,
          membership.plan.giftCategoryName || "饮品甜点",
          date
        );
        if (giftDish) {
          const updated = await tx.$executeRaw`
            UPDATE "DishDaily"
            SET "soldQty" = "soldQty" + 1
            WHERE "dishId" = ${giftDish.id}
              AND "date" = ${date}
              AND "soldQty" + 1 <= "totalQty"
          `;
          if (updated > 0) {
            await tx.orderItem.create({
              data: {
                orderId: session.orders[0].id,
                dishId: giftDish.id,
                dishName: giftDish.name,
                price: giftDish.price,
                quantity: 1,
                amount: 0,
                isGift: true
              }
            });
            giftDrink = { dishName: giftDish.name, price: giftDish.price };
          }
        }
      }
    }

    if (userCoupon) {
      await tx.userCoupon.update({
        where: { id: userCoupon.id },
        data: {
          status: "USED",
          usedAt: now,
          sessionId: session.id
        }
      });
    }

    let earnedPoints = 0;
    if (user) {
      if (pointsUsed > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { decrement: pointsUsed } }
        });
        await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: -pointsUsed,
            type: "REDEEM",
            note: `积分抵扣 ${(pointsDiscount / 100).toFixed(2)} 元`,
            orderId: session.orders[0]?.id
          }
        });
      }
      earnedPoints =
        Math.floor(total / 100) * Math.max(0, session.shop.pointsEarnRate);
      if (earnedPoints > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { points: { increment: earnedPoints } }
        });
        await tx.pointTransaction.create({
          data: {
            userId: user.id,
            amount: earnedPoints,
            type: "EARN",
            note: `${session.shop.name} 消费获得`,
            orderId: session.orders[0]?.id
          }
        });
      }
    }

    const updatedSession = await tx.diningSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        closedAt: now,
        subtotal,
        couponDiscount,
        pointsUsed,
        pointsDiscount,
        memberDiscount,
        totalAmount: total,
        paymentMethod: input.paymentMethod,
        paidAt: now
      },
      include: {
        shop: true,
        table: true,
        orders: { include: { items: true } }
      }
    });

    await tx.table.update({
      where: { id: session.tableId },
      data: { status: "IDLE" }
    });

    return {
      session: updatedSession,
      subtotal,
      couponDiscount,
      memberDiscount,
      pointsDiscount,
      total,
      pointsUsed,
      earnedPoints,
      giftDrink,
      membership: membership
        ? {
            id: membership.id,
            planName: membership.plan.name,
            discountRate: membership.plan.discountRate
          }
        : null
    };
  });
}

export async function cancelPendingOrder(orderId: string, shopId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, shopId, status: "PENDING" },
      include: { items: true }
    });
    if (!order) throw new Error("订单不存在或已结账");
    const date = todayKey();
    for (const item of order.items) {
      if (!item.dishId) continue;
      await tx.dishDaily.updateMany({
        where: {
          dishId: item.dishId,
          date,
          soldQty: { gte: item.quantity }
        },
        data: { soldQty: { decrement: item.quantity } }
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" }
    });
    if (order.sessionId) {
      await tx.diningSession.update({
        where: { id: order.sessionId },
        data: {
          subtotal: { decrement: order.subtotal },
          totalAmount: { decrement: order.subtotal }
        }
      });
      const pendingCount = await tx.order.count({
        where: { sessionId: order.sessionId, status: "PENDING" }
      });
      if (pendingCount === 0) {
        await tx.diningSession.update({
          where: { id: order.sessionId },
          data: { status: "CLOSED", closedAt: new Date() }
        });
        if (order.tableId) {
          await tx.table.update({
            where: { id: order.tableId },
            data: { status: "IDLE" }
          });
        }
      }
    }
    return { ok: true };
  });
}

export async function getSessionBill(sessionId: string) {
  const session = await prisma.diningSession.findUnique({
    where: { id: sessionId },
    include: {
      shop: true,
      table: true,
      orders: {
        include: {
          items: true,
          user: { select: { id: true, name: true, phone: true } }
        },
        orderBy: { createdAt: "asc" }
      },
      userCoupon: { include: { coupon: true } }
    }
  });
  if (!session) throw new Error("账单不存在");
  const [requiredDishes, missingRequiredDishes] = await Promise.all([
    listRequiredDishes(prisma, session.shopId),
    findMissingRequiredDishes(prisma, {
      shopId: session.shopId,
      sessionId: session.id
    })
  ]);
  const pendingOrders = session.orders.filter((o) => o.status === "PENDING");
  const subtotal = pendingOrders.reduce((sum, o) => sum + o.subtotal, 0);
  return {
    ...session,
    pendingOrders,
    pendingSubtotal: subtotal,
    pendingCount: pendingOrders.length,
    requiredDishes,
    missingRequiredDishes
  };
}

export async function getTodayDashboard(shopId: string) {
  const start = startOfToday();
  const end = endOfToday();
  const [shop, tables, orders] = await Promise.all([
    prisma.shop.findUnique({ where: { id: shopId } }),
    prisma.table.findMany({
      where: { shopId },
      include: {
        sessions: {
          where: { status: "OPEN" },
          orderBy: { openedAt: "desc" },
          take: 1,
          include: { orders: { where: { status: "PENDING" } } }
        }
      },
      orderBy: { name: "asc" }
    }),
    prisma.order.findMany({
      where: { shopId, createdAt: { gte: start, lte: end } },
      include: { items: true, user: true, table: true },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const paidOrders = orders.filter((o) => o.status === "PAID");
  const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const pendingSessions = tables.filter((t) => t.sessions.length > 0).length;

  const dishMap = new Map<string, { name: string; quantity: number; amount: number }>();
  for (const order of paidOrders) {
    for (const item of order.items) {
      const current = dishMap.get(item.dishName) || {
        name: item.dishName,
        quantity: 0,
        amount: 0
      };
      current.quantity += item.quantity;
      current.amount += item.amount;
      dishMap.set(item.dishName, current);
    }
  }
  const topDishes = [...dishMap.values()]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const hourly = Array.from({ length: 24 }, (_, i) => ({
    hour: `${String(i).padStart(2, "0")}:00`,
    revenue: 0,
    orders: 0
  }));
  for (const order of paidOrders) {
    const hour = order.paidAt ? new Date(order.paidAt).getHours() : new Date(order.createdAt).getHours();
    if (hour >= 0 && hour < hourly.length) {
      hourly[hour].revenue += order.total;
      hourly[hour].orders += 1;
    }
  }

  const dishes = await prisma.dish.findMany({
    where: { shopId, status: "ACTIVE" },
    include: { dailyStocks: { where: { date: todayKey() } } },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
  });
  const lowStock = dishes
    .map((d) => {
      const daily = d.dailyStocks[0];
      const total = daily?.totalQty ?? d.defaultQty;
      const sold = daily?.soldQty ?? 0;
      return {
        id: d.id,
        name: d.name,
        total,
        sold,
        remaining: Math.max(0, total - sold),
        soldOut: total - sold <= 0
      };
    })
    .filter((d) => d.remaining <= 5)
    .slice(0, 6);

  return {
    shop,
    stats: {
      revenue,
      orderCount: orders.length,
      paidCount: paidOrders.length,
      avgOrder: paidOrders.length ? Math.round(revenue / paidOrders.length) : 0,
      occupiedTables,
      totalTables: tables.length,
      pendingSessions,
      lowStockCount: lowStock.length
    },
    tables,
    topDishes,
    hourly,
    lowStock,
    recentOrders: orders.slice(0, 8)
  };
}

export async function getMenu(shopId: string) {
  const date = todayKey();
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      categories: {
        orderBy: { sort: "asc" },
        include: {
          dishes: {
            where: { status: "ACTIVE" },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            include: { dailyStocks: { where: { date } } }
          }
        }
      },
      dishes: {
        where: { status: "ACTIVE", categoryId: null },
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
        include: { dailyStocks: { where: { date } } }
      }
    }
  });
  if (!shop) throw new Error("门店不存在");
  const normalize = (dish: (typeof shop.dishes)[number]) => {
    const daily = dish.dailyStocks[0];
    const total = daily?.totalQty ?? dish.defaultQty;
    const sold = daily?.soldQty ?? 0;
    const remaining = Math.max(0, total - sold);
    return {
      ...dish,
      totalQty: total,
      soldQty: sold,
      remaining,
      soldOut: remaining <= 0
    };
  };
  return {
    ...shop,
    categories: shop.categories.map((c) => ({
      ...c,
      dishes: c.dishes.map(normalize)
    })),
    uncategorized: shop.dishes.map(normalize)
  };
}

export async function claimCoupon(userId: string, couponId: string) {
  return prisma.$transaction(async (tx) => {
    const coupon = await tx.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new Error("优惠券不存在");
    const now = new Date();
    if (coupon.status !== "ACTIVE") throw new Error("优惠券已停用");
    if (now < coupon.startAt || now > coupon.endAt) throw new Error("优惠券不在有效期内");
    if (coupon.claimedQty >= coupon.totalQty) throw new Error("优惠券已领完");
    const claimed = await tx.userCoupon.count({
      where: { userId, couponId }
    });
    if (claimed >= coupon.perUserLimit) throw new Error("已达到领取上限");
    const userCoupon = await tx.userCoupon.create({
      data: { userId, couponId }
    });
    await tx.coupon.update({
      where: { id: couponId },
      data: { claimedQty: { increment: 1 } }
    });
    return userCoupon;
  });
}

export async function getAvailableCoupons(userId: string | undefined, shopId?: string) {
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      status: "ACTIVE",
      startAt: { lte: now },
      endAt: { gte: now },
      OR: shopId
        ? [{ shopId: null }, { shopId }]
        : [{ shopId: null }, { shopId: { not: null } }]
    },
    include: { shop: { select: { id: true, name: true } } },
    orderBy: [{ source: "desc" }, { createdAt: "desc" }]
  });
  if (!userId) return coupons.map((c) => ({ ...c, claimedByMe: 0 }));
  const counts = await prisma.userCoupon.groupBy({
    by: ["couponId"],
    where: { userId, couponId: { in: coupons.map((c) => c.id) } },
    _count: { _all: true }
  });
  const countMap = new Map(counts.map((c) => [c.couponId, c._count._all]));
  return coupons.map((c) => ({
    ...c,
    claimedByMe: countMap.get(c.id) || 0
  }));
}

export async function getUserCoupons(userId: string) {
  return prisma.userCoupon.findMany({
    where: { userId },
    include: { coupon: { include: { shop: true } } },
    orderBy: { claimedAt: "desc" }
  });
}
