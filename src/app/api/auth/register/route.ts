import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setSessionCookie, signToken } from "@/lib/auth";

const schema = z.object({
  phone: z.string().regex(/^1\d{10}$/, "请输入 11 位手机号"),
  name: z.string().min(1, "请输入昵称").max(20),
  password: z.string().min(6, "密码至少 6 位").max(32)
});

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "参数不正确" },
        { status: 400 }
      );
    }
    const { phone, name, password } = parsed.data;
    const exists = await prisma.user.findUnique({ where: { phone } });
    if (exists) {
      return NextResponse.json({ error: "该手机号已注册" }, { status: 409 });
    }
    const user = await prisma.user.create({
      data: {
        phone,
        name,
        password: await bcrypt.hash(password, 10),
        balance: 0,
        points: 0
      }
    });
    const session = {
      id: user.id,
      role: "USER" as const,
      name: user.name,
      phone: user.phone
    };
    const token = await signToken(session);
    const res = NextResponse.json({ token, user: session });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "注册失败，请稍后重试" }, { status: 500 });
  }
}
