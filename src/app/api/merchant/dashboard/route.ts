import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { getTodayDashboard } from "@/lib/services/orders";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const data = await getTodayDashboard(session.shopId);
    return ok(data);
  } catch (error) {
    return serverError(error);
  }
}
