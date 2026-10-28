import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import {
  getMembershipOverview,
  setMembershipAutoRenew,
  subscribeMembership
} from "@/lib/services/membership";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const overview = await getMembershipOverview(session.id);
    return ok(overview);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const body = await readBody<{
      planId?: string;
      paymentMethod?: "BALANCE" | "WECHAT";
    }>(req);
    if (!body.planId) return fail("请选择会员方案");
    const result = await subscribeMembership({
      userId: session.id,
      planId: body.planId,
      paymentMethod: body.paymentMethod === "WECHAT" ? "WECHAT" : "BALANCE"
    });
    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const body = await readBody<{ autoRenew?: boolean }>(req);
    if (typeof body.autoRenew !== "boolean") {
      return fail("请选择是否自动续费");
    }
    const membership = await setMembershipAutoRenew(
      session.id,
      body.autoRenew
    );
    return ok({ membership });
  } catch (error) {
    return serverError(error);
  }
}
