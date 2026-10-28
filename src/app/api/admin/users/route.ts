import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [{ name: { contains: q } }, { phone: { contains: q } }]
          }
        : undefined,
      include: {
        _count: { select: { orders: true, coupons: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    const totals = await prisma.order.groupBy({
      by: ["userId"],
      where: { status: "PAID", userId: { not: null } },
      _sum: { total: true },
      _count: { _all: true }
    });
    const totalMap = new Map(
      totals.map((t) => [
        t.userId,
        { spent: t._sum.total || 0, paidOrders: t._count._all }
      ])
    );
    return ok({
      users: users.map((u) => ({
        ...u,
        spent: totalMap.get(u.id)?.spent || 0,
        paidOrders: totalMap.get(u.id)?.paidOrders || 0
      }))
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<{
      phone?: string;
      name?: string;
      password?: string;
      balance?: number;
      points?: number;
    }>(req);
    const phone = body.phone?.trim();
    const name = body.name?.trim();
    if (!phone || !/^1\d{10}$/.test(phone)) return fail("请输入正确的手机号");
    if (!name) return fail("请输入用户昵称");
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) return fail("该手机号已注册");
    const user = await prisma.user.create({
      data: {
        phone,
        name,
        password: await bcrypt.hash(body.password || "123456", 10),
        balance: Math.max(0, Math.floor(Number(body.balance) || 0)),
        points: Math.max(0, Math.floor(Number(body.points) || 0))
      }
    });
    return ok({ user });
  } catch (error) {
    return serverError(error);
  }
}
