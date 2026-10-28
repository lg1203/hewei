import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const safeUserSelect = {
  id: true,
  name: true,
  phone: true,
  balance: true,
  points: true,
  status: true,
  createdAt: true
} as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return fail("用户不存在", 404);

    const body = await readBody<{
      name?: string;
      phone?: string;
      status?: string;
      password?: string;
    }>(req);

    const data: {
      name?: string;
      phone?: string;
      status?: string;
      password?: string;
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return fail("请输入用户昵称");
      if (name.length > 30) return fail("昵称不能超过 30 个字符");
      data.name = name;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (!/^1\d{10}$/.test(phone)) return fail("请输入正确的手机号");
      if (phone !== user.phone) {
        const exists = await prisma.user.findUnique({ where: { phone } });
        if (exists) return fail("该手机号已被其他用户使用");
      }
      data.phone = phone;
    }

    if (body.status !== undefined) {
      if (!["ACTIVE", "DISABLED"].includes(body.status)) {
        return fail("用户状态不正确");
      }
      data.status = body.status;
    }

    if (body.password !== undefined && String(body.password).length > 0) {
      const password = String(body.password);
      if (password.length < 6) return fail("密码至少 6 位");
      data.password = await bcrypt.hash(password, 10);
    }

    if (!Object.keys(data).length) return fail("没有需要更新的内容");

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: safeUserSelect
    });
    return ok({ user: updated });
  } catch (error) {
    return serverError(error);
  }
}
