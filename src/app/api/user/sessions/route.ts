import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const body = await readBody<{ tableToken?: string }>(req);
    if (!body.tableToken) return fail("缺少桌码");

    const table = await prisma.table.findUnique({
      where: { qrToken: body.tableToken },
      include: { shop: true }
    });
    if (!table || table.shop.status !== "ACTIVE") {
      return fail("桌码无效或门店已停业", 404);
    }

    let diningSession = await prisma.diningSession.findFirst({
      where: { tableId: table.id, status: "OPEN" },
      orderBy: { openedAt: "desc" }
    });
    if (!diningSession) {
      diningSession = await prisma.diningSession.create({
        data: { shopId: table.shopId, tableId: table.id }
      });
    }
    if (table.status !== "OCCUPIED") {
      await prisma.table.update({
        where: { id: table.id },
        data: { status: "OCCUPIED" }
      });
    }

    return ok({
      session: diningSession,
      shop: {
        id: table.shop.id,
        name: table.shop.name,
        address: table.shop.address,
        businessHours: table.shop.businessHours
      },
      table: { id: table.id, name: table.name }
    });
  } catch (error) {
    return serverError(error);
  }
}
