import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { createPendingOrder, type CartItemInput } from "@/lib/services/orders";
import { endOfToday, startOfToday } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const status = req.nextUrl.searchParams.get("status");
    const date = req.nextUrl.searchParams.get("date") || "today";
    const orders = await prisma.order.findMany({
      where: {
        shopId: session.shopId,
        ...(status && status !== "ALL" ? { status } : {}),
        ...(date === "today"
          ? { createdAt: { gte: startOfToday(), lte: endOfToday() } }
          : {})
      },
      include: {
        items: true,
        table: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, phone: true } },
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
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const body = await readBody<{
      tableId?: string;
      items?: CartItemInput[];
      remark?: string;
      userId?: string;
    }>(req);
    if (!body.tableId) return fail("请选择桌台");
    if (!Array.isArray(body.items) || !body.items.length) {
      return fail("请先选择菜品");
    }
    if (body.userId) {
      const user = await prisma.user.findUnique({ where: { id: body.userId } });
      if (!user) return fail("会员不存在", 404);
    }
    const order = await createPendingOrder({
      shopId: session.shopId,
      tableId: body.tableId,
      userId: body.userId,
      type: "OFFLINE",
      items: body.items,
      remark: body.remark
    });
    return ok({ order });
  } catch (error) {
    return serverError(error);
  }
}
