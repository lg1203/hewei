import { ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const activities = await prisma.activity.findMany({
      where: {
        status: "ACTIVE",
        AND: [
          { OR: [{ startAt: null }, { startAt: { lte: now } }] },
          { OR: [{ endAt: null }, { endAt: { gte: now } }] }
        ]
      },
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        title: true,
        subtitle: true,
        poster: true,
        link: true,
        sort: true,
        startAt: true,
        endAt: true,
        createdAt: true
      }
    });
    return ok({ activities });
  } catch (error) {
    return serverError(error);
  }
}
