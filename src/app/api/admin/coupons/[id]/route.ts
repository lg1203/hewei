import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const coupon = await prisma.coupon.findUnique({ where: { id } });
    if (!coupon) return fail("优惠券不存在", 404);
    const body = await readBody<{ status?: string; title?: string; totalQty?: number }>(req);
    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.title !== undefined ? { title: body.title.trim() } : {}),
        ...(body.totalQty !== undefined
          ? { totalQty: Math.max(1, Math.floor(Number(body.totalQty))) }
          : {})
      }
    });
    return ok({ coupon: updated });
  } catch (error) {
    return serverError(error);
  }
}
