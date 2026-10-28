import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const body = await readBody<{ amount?: number; note?: string }>(req);
    const amount = Math.floor(Number(body.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail("请输入正确的充值金额");
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return fail("用户不存在", 404);

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: { balance: { increment: amount } }
      });
      await tx.balanceTransaction.create({
        data: {
          userId: id,
          amount,
          type: "ADMIN",
          note: body.note || "平台充值"
        }
      });
      return updated;
    });
    return ok({ user: result });
  } catch (error) {
    return serverError(error);
  }
}
