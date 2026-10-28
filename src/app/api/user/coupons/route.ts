import { NextRequest } from "next/server";
import { getSessionFromRequest, requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { getAvailableCoupons, getUserCoupons } from "@/lib/services/orders";

export async function GET(req: NextRequest) {
  try {
    const scope = req.nextUrl.searchParams.get("scope") || "available";
    const shopId = req.nextUrl.searchParams.get("shopId") || undefined;

    if (scope === "mine") {
      const session = await requireRole(req, ["USER"]);
      if (!session) return fail("请先登录", 401);
      return ok({ coupons: await getUserCoupons(session.id) });
    }

    const session = await getSessionFromRequest(req);
    const userId = session?.role === "USER" ? session.id : undefined;
    return ok({ coupons: await getAvailableCoupons(userId, shopId) });
  } catch (error) {
    return serverError(error);
  }
}
