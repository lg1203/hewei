import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { cancelPendingOrder } from "@/lib/services/orders";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    await cancelPendingOrder(id, session.shopId);
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
