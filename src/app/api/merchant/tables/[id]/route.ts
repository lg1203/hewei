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
    const table = await prisma.table.findFirst({
      where: { id, shopId: session.shopId }
    });
    if (!table) return fail("桌台不存在", 404);
    const body = await readBody<{ name?: string }>(req);
    const name = body.name?.trim();
    if (!name) return fail("请输入桌台名称");
    const updated = await prisma.table.update({
      where: { id },
      data: { name }
    });
    return ok({ table: updated });
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
    const table = await prisma.table.findFirst({
      where: { id, shopId: session.shopId },
      include: { sessions: { where: { status: "OPEN" } } }
    });
    if (!table) return fail("桌台不存在", 404);
    if (table.sessions.length > 0) {
      return fail("该桌台正在用餐中，请先结账或清台");
    }
    await prisma.table.delete({ where: { id } });
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
