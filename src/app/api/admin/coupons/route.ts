import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const coupons = await prisma.coupon.findMany({
      include: {
        shop: { select: { id: true, name: true } },
        _count: { select: { userCoupons: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return ok({ coupons });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<{
      shopId?: string | null;
      title?: string;
      description?: string;
      type?: "FULL_REDUCTION" | "DISCOUNT";
      threshold?: number;
      value?: number;
      discountRate?: number;
      totalQty?: number;
      perUserLimit?: number;
      startAt?: string;
      endAt?: string;
    }>(req);

    const title = body.title?.trim();
    if (!title) return fail("请输入优惠券名称");
    if (body.shopId) {
      const shop = await prisma.shop.findUnique({ where: { id: body.shopId } });
      if (!shop) return fail("门店不存在", 404);
    }
    const type = body.type === "DISCOUNT" ? "DISCOUNT" : "FULL_REDUCTION";
    const value = Math.max(0, Math.floor(Number(body.value) || 0));
    const discountRate = Math.min(
      99,
      Math.max(1, Math.floor(Number(body.discountRate) || 90))
    );
    if (type === "FULL_REDUCTION" && value <= 0) return fail("请输入满减金额");
    const startAt = body.startAt ? new Date(body.startAt) : new Date();
    const endAt = body.endAt
      ? new Date(body.endAt)
      : new Date(Date.now() + 30 * 24 * 3600 * 1000);
    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return fail("有效期不正确");
    }
    if (endAt <= startAt) return fail("结束时间需晚于开始时间");

    const coupon = await prisma.coupon.create({
      data: {
        shopId: body.shopId || null,
        title,
        description: body.description || "",
        type,
        threshold: Math.max(0, Math.floor(Number(body.threshold) || 0)),
        value: type === "DISCOUNT" ? 0 : value,
        discountRate: type === "DISCOUNT" ? discountRate : null,
        totalQty: Math.max(1, Math.floor(Number(body.totalQty) || 100)),
        perUserLimit: Math.max(1, Math.floor(Number(body.perUserLimit) || 1)),
        startAt,
        endAt,
        status: "ACTIVE",
        source: "ADMIN"
      }
    });
    return ok({ coupon });
  } catch (error) {
    return serverError(error);
  }
}
