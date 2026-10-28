import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const [points, balance] = await Promise.all([
      prisma.pointTransaction.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 50
      }),
      prisma.balanceTransaction.findMany({
        where: { userId: session.id },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);
    return ok({ points, balance });
  } catch (error) {
    return serverError(error);
  }
}
