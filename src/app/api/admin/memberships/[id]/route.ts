import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { validatePlanBody, type PlanBody } from "@/lib/membership-plans";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const plan = await prisma.membershipPlan.findUnique({ where: { id } });
    if (!plan) return fail("会员方案不存在", 404);

    const body = await readBody<PlanBody>(req);
    const result = validatePlanBody(body, true);
    if (result.error) return fail(result.error);
    if (!Object.keys(result.data).length) return fail("没有需要更新的内容");

    if (result.data.name && result.data.name !== plan.name) {
      const exists = await prisma.membershipPlan.findUnique({
        where: { name: result.data.name }
      });
      if (exists) return fail("方案名称已存在");
    }

    const updated = await prisma.membershipPlan.update({
      where: { id },
      data: result.data
    });
    return ok({ plan: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const plan = await prisma.membershipPlan.findUnique({
      where: { id },
      include: { _count: { select: { memberships: true } } }
    });
    if (!plan) return fail("会员方案不存在", 404);
    if (plan._count.memberships > 0) {
      return fail("该方案已有会员使用，请改为停用而不是删除");
    }
    await prisma.membershipPlan.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
