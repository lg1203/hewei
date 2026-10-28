import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const status = req.nextUrl.searchParams.get("status");
    const q = req.nextUrl.searchParams.get("q")?.trim();
    const orders = await prisma.order.findMany({
      where: {
        ...(status && status !== "ALL" ? { status } : {}),
        ...(q
          ? {
              OR: [
                { orderNo: { contains: q } },
                { shop: { name: { contains: q } } },
                { user: { phone: { contains: q } } }
              ]
            }
          : {})
      },
      include: {
        shop: { select: { id: true, name: true } },
        table: { select: { name: true } },
        user: { select: { name: true, phone: true } },
        items: true
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });
    return ok({ orders });
  } catch (error) {
    return serverError(error);
  }
}
