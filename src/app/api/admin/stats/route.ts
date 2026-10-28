import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { endOfToday, startOfToday } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);

    const start = startOfToday();
    const end = endOfToday();
    const weekStart = new Date(start.getTime() - 6 * 24 * 3600 * 1000);

    const [
      merchantCount,
      activeMerchantCount,
      userCount,
      shopCount,
      activeCouponCount,
      todayOrders,
      weekOrders,
      userAgg,
      recentOrders
    ] = await Promise.all([
      prisma.merchant.count(),
      prisma.merchant.count({ where: { status: "ACTIVE" } }),
      prisma.user.count(),
      prisma.shop.count(),
      prisma.coupon.count({ where: { status: "ACTIVE" } }),
      prisma.order.findMany({
        where: { createdAt: { gte: start, lte: end } },
        include: { shop: { select: { name: true } } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.order.findMany({
        where: {
          status: "PAID",
          paidAt: { gte: weekStart, lte: end }
        },
        select: { total: true, paidAt: true }
      }),
      prisma.user.aggregate({
        _sum: { balance: true, points: true }
      }),
      prisma.order.findMany({
        include: {
          shop: { select: { name: true } },
          table: { select: { name: true } },
          user: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" },
        take: 8
      })
    ]);

    const todayPaid = todayOrders.filter((o) => o.status === "PAID");
    const todayRevenue = todayPaid.reduce((sum, o) => sum + o.total, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart.getTime() + i * 24 * 3600 * 1000);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      return { date: key, revenue: 0, orders: 0 };
    });
    for (const order of weekOrders) {
      if (!order.paidAt) continue;
      const d = new Date(order.paidAt);
      const key = `${d.getMonth() + 1}/${d.getDate()}`;
      const row = days.find((x) => x.date === key);
      if (row) {
        row.revenue += order.total;
        row.orders += 1;
      }
    }

    const shopRevenue = new Map<string, number>();
    for (const order of todayPaid) {
      shopRevenue.set(
        order.shop.name,
        (shopRevenue.get(order.shop.name) || 0) + order.total
      );
    }
    const topShops = [...shopRevenue.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return ok({
      stats: {
        merchantCount,
        activeMerchantCount,
        userCount,
        shopCount,
        activeCouponCount,
        todayOrderCount: todayOrders.length,
        todayPaidCount: todayPaid.length,
        todayRevenue,
        totalBalance: userAgg._sum.balance || 0,
        totalPoints: userAgg._sum.points || 0
      },
      days,
      topShops,
      recentOrders
    });
  } catch (error) {
    return serverError(error);
  }
}
