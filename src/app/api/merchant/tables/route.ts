import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const tables = await prisma.table.findMany({
      where: { shopId: session.shopId },
      include: {
        sessions: {
          where: { status: "OPEN" },
          orderBy: { openedAt: "desc" },
          take: 1,
          include: {
            orders: {
              where: { status: "PENDING" },
              include: { items: true }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    });
    return ok({ tables });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const body = await readBody<{ name?: string }>(req);
    const name = body.name?.trim();
    if (!name) return fail("请输入桌台名称");
    const exists = await prisma.table.findFirst({
      where: { shopId: session.shopId, name }
    });
    if (exists) return fail("桌台名称已存在");
    const table = await prisma.table.create({
      data: {
        shopId: session.shopId,
        name,
        qrToken: `t-${randomUUID().replace(/-/g, "").slice(0, 12)}`
      }
    });
    return ok({ table });
  } catch (error) {
    return serverError(error);
  }
}
