import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncMembership } from "@/lib/services/membership";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  if (session.role === "ADMIN") {
    const admin = await prisma.admin.findUnique({
      where: { id: session.id },
      select: { id: true, username: true, name: true }
    });
    if (!admin) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    return NextResponse.json({ user: { ...admin, role: "ADMIN" } });
  }

  if (session.role === "MERCHANT") {
    const merchant = await prisma.merchant.findUnique({
      where: { id: session.id },
      include: { shop: true }
    });
    if (!merchant) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
    return NextResponse.json({
      user: {
        id: merchant.id,
        role: "MERCHANT",
        name: merchant.name,
        phone: merchant.phone,
        status: merchant.status,
        shop: merchant.shop
      }
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      phone: true,
      balance: true,
      points: true,
      status: true,
      hasUsedMembershipTrial: true,
      createdAt: true
    }
  });
  if (!user) return NextResponse.json({ error: "账号不存在" }, { status: 404 });
  const membership = await syncMembership(user.id).catch((error) => {
    console.error("sync membership failed", error);
    return null;
  });
  return NextResponse.json({
    user: { ...user, role: "USER", membership }
  });
}
