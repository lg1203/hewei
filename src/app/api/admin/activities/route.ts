import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseOptionalDate, validateActivityUrl } from "@/lib/activities";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

type ActivityBody = {
  title?: string;
  subtitle?: string;
  content?: string;
  poster?: string;
  link?: string;
  status?: string;
  sort?: number | string;
  startAt?: string | null;
  endAt?: string | null;
};

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const activities = await prisma.activity.findMany({
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }]
    });
    return ok({ activities });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const body = await readBody<ActivityBody>(req);

    const title = String(body.title || "").trim();
    if (!title) return fail("请输入活动标题");
    if (title.length > 60) return fail("活动标题不能超过 60 个字符");

    const status = body.status || "ACTIVE";
    if (!["ACTIVE", "DISABLED"].includes(status)) {
      return fail("活动状态不正确");
    }

    const sort = Math.trunc(Number(body.sort ?? 0));
    if (!Number.isFinite(sort)) return fail("排序值不正确");

    const startAt = parseOptionalDate(body.startAt);
    if (!startAt.ok) return fail(startAt.message);
    const endAt = parseOptionalDate(body.endAt);
    if (!endAt.ok) return fail(endAt.message);
    if (startAt.value && endAt.value && endAt.value <= startAt.value) {
      return fail("结束时间必须晚于开始时间");
    }

    const poster = String(body.poster || "").trim();
    const posterError = validateActivityUrl(poster);
    if (posterError) return fail(`海报地址${posterError}`);
    const link = String(body.link || "").trim();
    const linkError = validateActivityUrl(link);
    if (linkError) return fail(`跳转链接${linkError}`);

    const activity = await prisma.activity.create({
      data: {
        title,
        subtitle: String(body.subtitle || "").trim(),
        content: String(body.content || ""),
        poster,
        link,
        status,
        sort,
        startAt: startAt.value ?? null,
        endAt: endAt.value ?? null
      }
    });
    return ok({ activity });
  } catch (error) {
    return serverError(error);
  }
}
