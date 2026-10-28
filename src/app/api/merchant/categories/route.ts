import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const categories = await prisma.category.findMany({
      where: { shopId: session.shopId },
      include: { _count: { select: { dishes: true } } },
      orderBy: { sort: "asc" }
    });
    return ok({ categories });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const body = await readBody<{ name?: string; sort?: number }>(req);
    const name = body.name?.trim();
    if (!name) return fail("请输入分类名称");
    const category = await prisma.category.create({
      data: {
        shopId: session.shopId,
        name,
        sort: Number(body.sort) || 0
      }
    });
    return ok({ category });
  } catch (error) {
    return serverError(error);
  }
}
