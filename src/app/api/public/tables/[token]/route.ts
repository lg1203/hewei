import { prisma } from "@/lib/prisma";
import { fail, ok, serverError } from "@/lib/http";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const table = await prisma.table.findUnique({
      where: { qrToken: token },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            status: true,
            address: true,
            businessHours: true
          }
        },
        sessions: {
          where: { status: "OPEN" },
          orderBy: { openedAt: "desc" },
          take: 1
        }
      }
    });
    if (!table || table.shop.status !== "ACTIVE") {
      return fail("桌码无效或门店已停业", 404);
    }
    return ok({
      table: {
        id: table.id,
        name: table.name,
        status: table.status,
        qrToken: table.qrToken,
        shop: table.shop,
        sessionId: table.sessions[0]?.id || null
      }
    });
  } catch (error) {
    return serverError(error);
  }
}
