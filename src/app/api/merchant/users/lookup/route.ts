import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { findActiveMembership } from "@/lib/services/membership";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const phone = req.nextUrl.searchParams.get("phone")?.trim();
    if (!phone) return fail("请输入手机号");
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        name: true,
        phone: true,
        points: true,
        balance: true,
        status: true,
        hasUsedMembershipTrial: true
      }
    });
    if (!user) return fail("未找到该会员", 404);
    const membership = await findActiveMembership(user.id);
    return ok({
      user,
      membership,
      trialEligible: !user.hasUsedMembershipTrial
    });
  } catch (error) {
    return serverError(error);
  }
}
