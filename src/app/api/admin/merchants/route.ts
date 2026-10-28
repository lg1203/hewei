import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { endOfToday, startOfToday } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const start = startOfToday();
    const end = endOfToday();
    const merchants = await prisma.merchant.findMany({
      include: {
        shop: {
          include: {
            _count: { select: { dishes: true, tables: true, coupons: true } }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    const todayOrders = await prisma.order.groupBy({
      by: ["shopId"],
      where: { status: "PAID", paidAt: { gte: start, lte: end } },
      _sum: { total: true },
      _count: { _all: true }
    });
    const revenueMap = new Map(
      todayOrders.map((r) => [r.shopId, { revenue: r._sum.total || 0, orders: r._count._all }])
    );
    return ok({
      merchants: merchants.map((m) => ({
        ...m,
        todayRevenue: m.shop ? revenueMap.get(m.shop.id)?.revenue || 0 : 0,
        todayOrders: m.shop ? revenueMap.get(m.shop.id)?.orders || 0 : 0
      }))
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<{
      name?: string;
      phone?: string;
      password?: string;
      shopName?: string;
      address?: string;
      shopPhone?: string;
    }>(req);

    const name = body.name?.trim();
    const phone = body.phone?.trim();
    const password = body.password || "123456";
    const shopName = body.shopName?.trim() || `${name}的门店`;
    if (!name) return fail("请输入商户姓名");
    if (!phone || !/^1\d{10}$/.test(phone)) return fail("请输入正确的商户手机号");
    if (password.length < 6) return fail("密码至少 6 位");

    const exists = await prisma.merchant.findUnique({ where: { phone } });
    if (exists) return fail("该手机号已存在");

    const result = await prisma.$transaction(async (tx) => {
      const merchant = await tx.merchant.create({
        data: {
          name,
          phone,
          password: await bcrypt.hash(password, 10),
          status: "ACTIVE"
        }
      });
      const shop = await tx.shop.create({
        data: {
          merchantId: merchant.id,
          name: shopName,
          address: body.address || "",
          phone: body.shopPhone || phone,
          description: "欢迎光临，扫码点餐更便捷。",
          announcement: "本店支持会员积分抵扣，消费即可积攒积分。",
          businessHours: "10:00-21:00"
        }
      });
      const categoryNames = ["招牌推荐", "热菜", "主食", "饮品"];
      for (let i = 0; i < categoryNames.length; i++) {
        await tx.category.create({
          data: { shopId: shop.id, name: categoryNames[i], sort: i + 1 }
        });
      }
      return { merchant, shop };
    });

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
