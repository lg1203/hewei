import { fail, ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const now = new Date();
    const activity = await prisma.activity.findFirst({
      where: {
        id,
        status: "ACTIVE",
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] }
        ]
      }
    });
    if (!activity) return fail("活动不存在或已结束", 404);
    return ok({ activity });
  } catch (error) {
    return serverError(error);
  }
}
