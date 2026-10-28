import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const dish = await prisma.dish.findFirst({
      where: { id, shopId: session.shopId }
    });
    if (!dish) return fail("菜品不存在", 404);
    const body = await readBody<{ totalQty?: number }>(req);
    const totalQty = Math.floor(Number(body.totalQty));
    if (!Number.isFinite(totalQty) || totalQty < 0) {
      return fail("请输入正确的库存数量");
    }
    const date = todayKey();
    const daily = await prisma.dishDaily.findUnique({
      where: { dishId_date: { dishId: id, date } }
    });
    if (daily && totalQty < daily.soldQty) {
      return fail(`今日已售 ${daily.soldQty} 份，库存不能低于已售数量`);
    }
    const stock = await prisma.dishDaily.upsert({
      where: { dishId_date: { dishId: id, date } },
      update: { totalQty },
      create: { dishId: id, date, totalQty, soldQty: 0 }
    });
    return ok({ stock });
  } catch (error) {
    return serverError(error);
  }
}
