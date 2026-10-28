import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { validatePlanBody, type PlanBody } from "@/lib/membership-plans";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const [plans, activeMembers] = await Promise.all([
      prisma.membershipPlan.findMany({
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
        include: { _count: { select: { memberships: true } } }
      }),
      prisma.membership.count({
        where: { status: { in: ["TRIAL", "ACTIVE"] } }
      })
    ]);
    return ok({ plans, activeMembers });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<PlanBody>(req);
    const result = validatePlanBody(body);
    if (result.error) return fail(result.error);
    const data = result.data;

    const exists = await prisma.membershipPlan.findUnique({
      where: { name: data.name! }
    });
    if (exists) return fail("方案名称已存在");

    const plan = await prisma.membershipPlan.create({
      data: {
        name: data.name!,
        description: data.description ?? "",
        billingCycle: data.billingCycle ?? "MONTHLY",
        price: data.price ?? 0,
        originalPrice: data.originalPrice ?? 0,
        firstMonthFree: data.firstMonthFree ?? true,
        trialDays: data.trialDays ?? 30,
        discountRate: data.discountRate ?? 100,
        freeDrink: data.freeDrink ?? true,
        giftCategoryName: data.giftCategoryName ?? "饮品甜点",
        status: data.status ?? "ACTIVE",
        sort: data.sort ?? 0
      }
    });
    return ok({ plan });
  } catch (error) {
    return serverError(error);
  }
}
