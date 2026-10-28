import { getMenu } from "@/lib/services/orders";
import { ok, serverError } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const menu = await getMenu(id);
    if (!menu || menu.status !== "ACTIVE") {
      return ok({ error: "门店不存在或已停业" });
    }
    return ok(menu);
  } catch (error) {
    return serverError(error);
  }
}
