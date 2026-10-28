import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, string> = {
  platform_name: "禾味点餐",
  points_earn_rate: "1",
  points_redeem_rate: "100",
  max_points_ratio: "50"
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const rows = await prisma.config.findMany();
    const config = { ...DEFAULTS };
    for (const row of rows) config[row.key] = row.value;
    return ok({ config });
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<Record<string, string>>(req);
    const allowed = new Set(Object.keys(DEFAULTS));
    const entries = Object.entries(body).filter(([key]) => allowed.has(key));
    if (!entries.length) return fail("没有可保存的设置");

    for (const [key, value] of entries) {
      await prisma.config.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      });
    }
    return ok({ ok: true });
  } catch (error) {
    return serverError(error);
  }
}
