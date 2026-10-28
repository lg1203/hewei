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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) return fail("活动不存在", 404);

    const body = await readBody<ActivityBody>(req);
    const data: {
      title?: string;
      subtitle?: string;
      content?: string;
      poster?: string;
      link?: string;
      status?: string;
      sort?: number;
      startAt?: Date | null;
      endAt?: Date | null;
    } = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return fail("请输入活动标题");
      if (title.length > 60) return fail("活动标题不能超过 60 个字符");
      data.title = title;
    }
    if (body.subtitle !== undefined) {
      data.subtitle = String(body.subtitle).trim();
    }
    if (body.content !== undefined) {
      data.content = String(body.content);
    }
    if (body.poster !== undefined) {
      const poster = String(body.poster).trim();
      const posterError = validateActivityUrl(poster);
      if (posterError) return fail(`海报地址${posterError}`);
      data.poster = poster;
    }
    if (body.link !== undefined) {
      const link = String(body.link).trim();
      const linkError = validateActivityUrl(link);
      if (linkError) return fail(`跳转链接${linkError}`);
      data.link = link;
    }
    if (body.status !== undefined) {
      if (!["ACTIVE", "DISABLED"].includes(body.status)) {
        return fail("活动状态不正确");
      }
      data.status = body.status;
    }
    if (body.sort !== undefined) {
      const sort = Math.trunc(Number(body.sort));
      if (!Number.isFinite(sort)) return fail("排序值不正确");
      data.sort = sort;
    }

    let nextStart = activity.startAt;
    if (body.startAt !== undefined) {
      const startAt = parseOptionalDate(body.startAt);
      if (!startAt.ok) return fail(startAt.message);
      nextStart = startAt.value ?? null;
      data.startAt = nextStart;
    }
    let nextEnd = activity.endAt;
    if (body.endAt !== undefined) {
      const endAt = parseOptionalDate(body.endAt);
      if (!endAt.ok) return fail(endAt.message);
      nextEnd = endAt.value ?? null;
      data.endAt = nextEnd;
    }
    if (nextStart && nextEnd && nextEnd <= nextStart) {
      return fail("结束时间必须晚于开始时间");
    }

    if (!Object.keys(data).length) return fail("没有需要更新的内容");

    const updated = await prisma.activity.update({ where: { id }, data });
    return ok({ activity: updated });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["ADMIN"]);
    if (!session) return fail("请先登录管理员端", 401);
    const { id } = await params;
    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) return fail("活动不存在", 404);
    await prisma.activity.delete({ where: { id } });
    return ok({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
