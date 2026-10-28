import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { checkoutSession } from "@/lib/services/orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const bill = await prisma.diningSession.findUnique({
      where: { id },
      select: { shopId: true }
    });
    if (!bill || bill.shopId !== session.shopId) {
      return fail("账单不存在", 404);
    }
    const body = await readBody<{
      paymentMethod?: "CASH" | "BALANCE";
      userId?: string;
      userCouponId?: string;
      pointsUsed?: number;
    }>(req);
    const result = await checkoutSession({
      sessionId: id,
      userId: body.userId,
      userCouponId: body.userCouponId,
      pointsUsed: body.pointsUsed,
      paymentMethod: body.paymentMethod === "BALANCE" ? "BALANCE" : "CASH",
      actorRole: "MERCHANT"
    });
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
