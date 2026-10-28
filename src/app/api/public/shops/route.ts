import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { ok, serverError } from "@/lib/http";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim() || "";
    const shops = await prisma.shop.findMany({
      where: {
        status: "ACTIVE",
        merchant: { status: "ACTIVE" },
        ...(q
          ? {
              OR: [
                { name: { contains: q } },
                { description: { contains: q } },
                { address: { contains: q } }
              ]
            }
          : {})
      },
      include: {
        merchant: { select: { name: true } },
        categories: { select: { id: true } },
        _count: { select: { dishes: true, tables: true } }
      },
      orderBy: { createdAt: "asc" }
    });
    return ok({ shops });
  } catch (error) {
    return serverError(error);
  }
}
