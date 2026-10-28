import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { checkoutSession } from "@/lib/services/orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const { id } = await params;
    const body = await readBody<{
      userCouponId?: string;
      pointsUsed?: number;
      paymentMethod?: "BALANCE" | "WECHAT";
    }>(req);

    const result = await checkoutSession({
      sessionId: id,
      userId: session.id,
      userCouponId: body.userCouponId,
      pointsUsed: body.pointsUsed,
      paymentMethod: body.paymentMethod === "WECHAT" ? "WECHAT" : "BALANCE",
      actorRole: "USER"
    });
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
