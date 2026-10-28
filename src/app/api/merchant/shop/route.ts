import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const shop = await prisma.shop.findUnique({
      where: { id: session.shopId },
      include: {
        _count: { select: { dishes: true, tables: true, coupons: true } }
      }
    });
    if (!shop) return fail("门店不存在", 404);
    return ok({ shop });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const body = await readBody<{
      name?: string;
      address?: string;
      phone?: string;
      description?: string;
      announcement?: string;
      businessHours?: string;
      cover?: string;
      pointsEarnRate?: number;
      pointsRedeemRate?: number;
      maxPointsRatio?: number;
    }>(req);

    const shop = await prisma.shop.update({
      where: { id: session.shopId },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.address !== undefined ? { address: body.address } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.announcement !== undefined
          ? { announcement: body.announcement }
          : {}),
        ...(body.businessHours !== undefined
          ? { businessHours: body.businessHours }
          : {}),
        ...(body.cover !== undefined ? { cover: body.cover } : {}),
        ...(body.pointsEarnRate !== undefined
          ? { pointsEarnRate: Math.max(0, Math.floor(Number(body.pointsEarnRate))) }
          : {}),
        ...(body.pointsRedeemRate !== undefined
          ? {
              pointsRedeemRate: Math.max(
                1,
                Math.floor(Number(body.pointsRedeemRate))
              )
            }
          : {}),
        ...(body.maxPointsRatio !== undefined
          ? {
              maxPointsRatio: Math.min(
                100,
                Math.max(0, Math.floor(Number(body.maxPointsRatio)))
              )
            }
          : {})
      }
    });
    return ok({ shop });
  } catch (error) {
    return serverError(error);
  }
}
