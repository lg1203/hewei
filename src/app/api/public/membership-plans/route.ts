import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    const plans = await prisma.membershipPlan.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
    });
    return ok({ plans });
  } catch (error) {
    return serverError(error);
  }
}
