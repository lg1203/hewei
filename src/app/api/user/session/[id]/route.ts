import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, serverError } from "@/lib/http";
import { getSessionBill } from "@/lib/services/orders";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(req, ["USER"]);
    if (!session) return fail("请先登录", 401);
    const { id } = await params;
    const bill = await getSessionBill(id);
    return ok({ bill });
  } catch (error) {
    return serverError(error);
  }
}
