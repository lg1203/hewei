import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createPendingOrder, type CartItemInput } from "@/lib/services/orders";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const orders = await prisma.order.findMany({
      where: { userId: session.id },
      include: {
        items: true,
        shop: { select: { id: true, name: true, address: true } },
        table: { select: { id: true, name: true } },
        session: { select: { id: true, status: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return ok({ orders });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const body = await readBody<{
      tableToken?: string;
      items?: CartItemInput[];
      remark?: string;
    }>(req);
    if (!body.tableToken) return fail("请先扫描桌码");
    if (!Array.isArray(body.items) || !body.items.length) {
      return fail("请先选择菜品");
    }
    const table = await prisma.table.findUnique({
      where: { qrToken: body.tableToken },
      include: { shop: true }
    });
    if (!table || table.shop.status !== "ACTIVE") {
      return fail("桌码无效或门店已停业", 404);
    }
    const order = await createPendingOrder({
      shopId: table.shopId,
      tableId: table.id,
      userId: session.id,
      type: "SELF",
      items: body.items,
      remark: body.remark
    });
    return ok({ order });
  } catch (error) {
    return serverError(error);
  }
}
