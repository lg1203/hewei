import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const body = await readBody<{ name?: string; sort?: number }>(req);
    const category = await prisma.category.findFirst({
      where: { id, shopId: session.shopId }
    });
    if (!category) return fail("分类不存在", 404);
    const updated = await prisma.category.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.sort !== undefined ? { sort: Number(body.sort) || 0 } : {})
      }
    });
    return ok({ category: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const category = await prisma.category.findFirst({
      where: { id, shopId: session.shopId },
      include: { _count: { select: { dishes: true } } }
    });
    if (!category) return fail("分类不存在", 404);
    if (category._count.dishes > 0) {
      return fail("该分类下还有菜品，请先移动或删除菜品");
    }
    await prisma.category.delete({ where: { id } });
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
