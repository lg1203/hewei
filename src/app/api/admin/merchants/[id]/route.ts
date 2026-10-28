import bcrypt from "bcryptjs";
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
    const merchant = await prisma.merchant.findUnique({
      where: { id },
      include: { shop: true }
    });
    if (!merchant) return fail("商户不存在", 404);
    const body = await readBody<{
      name?: string;
      status?: string;
      password?: string;
      shopName?: string;
      address?: string;
      shopPhone?: string;
      shopStatus?: string;
    }>(req);

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.update({
        where: { id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.password
            ? { password: await bcrypt.hash(body.password, 10) }
            : {})
        }
      });
      if (merchant.shop) {
        await tx.shop.update({
          where: { id: merchant.shop.id },
          data: {
            ...(body.shopName !== undefined ? { name: body.shopName.trim() } : {}),
            ...(body.address !== undefined ? { address: body.address } : {}),
            ...(body.shopPhone !== undefined ? { phone: body.shopPhone } : {}),
            ...(body.shopStatus !== undefined ? { status: body.shopStatus } : {})
          }
        });
      }
      return m;
    });

    return ok({ merchant: updated });
  } catch (error) {
    return serverError(error);
  }
}
