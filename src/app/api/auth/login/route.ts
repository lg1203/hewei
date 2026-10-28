import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signToken, type Role, type SessionUser } from "@/lib/auth";

const schema = z.object({
  role: z.enum(["ADMIN", "MERCHANT", "USER"]),
  account: z.string().min(1),
  password: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "请输入账号和密码" }, { status: 400 });
    }
    const { role, account, password } = parsed.data;
    let session: SessionUser | null = null;

    if (role === "ADMIN") {
      const admin = await prisma.admin.findUnique({ where: { username: account } });
      if (!admin || !(await bcrypt.compare(password, admin.password))) {
        return NextResponse.json({ error: "管理员账号或密码错误" }, { status: 401 });
      }
      session = { id: admin.id, role: "ADMIN", name: admin.name };
    }

    if (role === "MERCHANT") {
      const merchant = await prisma.merchant.findUnique({
        where: { phone: account },
        include: { shop: true }
      });
      if (!merchant || !(await bcrypt.compare(password, merchant.password))) {
        return NextResponse.json({ error: "商户账号或密码错误" }, { status: 401 });
      }
      if (merchant.status !== "ACTIVE") {
        return NextResponse.json({ error: "商户账号已被停用" }, { status: 403 });
      }
      if (!merchant.shop) {
        return NextResponse.json({ error: "商户尚未创建门店，请联系管理员" }, { status: 403 });
      }
      session = {
        id: merchant.id,
        role: "MERCHANT",
        name: merchant.name,
        phone: merchant.phone,
        merchantId: merchant.id,
        shopId: merchant.shop.id
      };
    }

    if (role === "USER") {
      const user = await prisma.user.findUnique({ where: { phone: account } });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return NextResponse.json({ error: "手机号或密码错误" }, { status: 401 });
      }
      if (user.status !== "ACTIVE") {
        return NextResponse.json({ error: "账号已被停用" }, { status: 403 });
      }
      session = {
        id: user.id,
        role: "USER",
        name: user.name,
        phone: user.phone
      };
    }

    if (!session) {
      return NextResponse.json({ error: "登录失败" }, { status: 400 });
    }

    const token = await signToken(session);
    const res = NextResponse.json({ token, user: session });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "登录失败，请稍后重试" }, { status: 500 });
  }
}
