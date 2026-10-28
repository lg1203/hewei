import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { findActiveMembership } from "@/lib/services/membership";
import { getSessionBill } from "@/lib/services/orders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const { id } = await params;
    const bill = await getSessionBill(id);
    if (bill.shopId !== session.shopId) return fail("无权查看该账单", 403);
    const billUser = bill.orders.find((o) => o.userId)?.user || null;
    const user = billUser
      ? await prisma.user.findUnique({
          where: { id: billUser.id },
          select: {
            id: true,
            name: true,
            phone: true,
            points: true,
            balance: true,
            status: true
          }
        })
      : null;
    const membership = user ? await findActiveMembership(user.id) : null;
    return ok({ bill, user, membership });
  } catch (error) {
    return serverError(error);
  }
}
