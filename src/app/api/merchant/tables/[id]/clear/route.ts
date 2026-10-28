import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const table = await prisma.table.findFirst({
      where: { id, shopId: session.shopId },
      include: {
        sessions: {
          where: { status: "OPEN" },
          include: { orders: { where: { status: "PENDING" } } }
        }
      }
    });
    if (!table) return fail("桌台不存在", 404);
    const open = table.sessions[0];
    if (open?.orders.length) {
      return fail("该桌台还有待结账订单，请先完成结账");
    }
    await prisma.$transaction(async (tx) => {
      if (open) {
        await tx.diningSession.update({
          where: { id: open.id },
          data: { status: "CLOSED", closedAt: new Date() }
        });
      }
      await tx.table.update({
        where: { id },
        data: { status: "IDLE" }
      });
    });
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
