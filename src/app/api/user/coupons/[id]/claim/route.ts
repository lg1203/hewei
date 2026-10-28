import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { claimCoupon } from "@/lib/services/orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const { id } = await params;
    const coupon = await claimCoupon(session.id, id);
    return ok({ coupon });
  } catch (error) {
    return serverError(error);
  }
}
