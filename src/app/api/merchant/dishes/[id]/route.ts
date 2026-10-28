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
    const dish = await prisma.dish.findFirst({
      where: { id, shopId: session.shopId }
    });
    if (!dish) return fail("菜品不存在", 404);
    const body = await readBody<{
      name?: string;
      categoryId?: string | null;
      price?: number;
      description?: string;
      image?: string;
      defaultQty?: number;
      sort?: number;
      status?: string;
      isRequired?: boolean;
    }>(req);

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, shopId: session.shopId }
      });
      if (!category) return fail("分类不存在", 404);
    }

    const updated = await prisma.dish.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.categoryId !== undefined
          ? { categoryId: body.categoryId || null }
          : {}),
        ...(body.price !== undefined
          ? { price: Math.max(0, Math.floor(Number(body.price))) }
          : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.image !== undefined ? { image: body.image } : {}),
        ...(body.defaultQty !== undefined
          ? { defaultQty: Math.max(0, Math.floor(Number(body.defaultQty))) }
          : {}),
        ...(body.sort !== undefined ? { sort: Math.floor(Number(body.sort)) } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isRequired !== undefined
          ? { isRequired: Boolean(body.isRequired) }
          : {})
      }
    });
    return ok({ dish: updated });
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
    const dish = await prisma.dish.findFirst({
      where: { id, shopId: session.shopId }
    });
    if (!dish) return fail("菜品不存在", 404);
    await prisma.dish.update({
      where: { id },
      data: { status: "DISABLED" }
    });
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
