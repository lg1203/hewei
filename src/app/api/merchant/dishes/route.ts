import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { fail, ok, readBody, serverError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { todayKey } from "@/lib/utils";

export async function GET(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const date = todayKey();
    const [categories, dishes] = await Promise.all([
      prisma.category.findMany({
        where: { shopId: session.shopId },
        orderBy: { sort: "asc" }
      }),
      prisma.dish.findMany({
        where: { shopId: session.shopId },
        include: {
          category: true,
          dailyStocks: { where: { date } }
        },
        orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
      })
    ]);
    return ok({
      categories,
      dishes: dishes.map((dish) => {
        const daily = dish.dailyStocks[0];
        const total = daily?.totalQty ?? dish.defaultQty;
        const sold = daily?.soldQty ?? 0;
        return {
          ...dish,
          totalQty: total,
          soldQty: sold,
          remaining: Math.max(0, total - sold),
          soldOut: total - sold <= 0
        };
      })
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ["MERCHANT"]);
    if (!session?.shopId) return fail("请先登录商户端", 401);
    const body = await readBody<{
      name?: string;
      categoryId?: string | null;
      price?: number;
      description?: string;
      image?: string;
      defaultQty?: number;
      sort?: number;
      isRequired?: boolean;
    }>(req);
    const name = body.name?.trim();
    const price = Math.floor(Number(body.price));
    if (!name) return fail("请输入菜品名称");
    if (!Number.isFinite(price) || price <= 0) return fail("请输入正确的价格");

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, shopId: session.shopId }
      });
      if (!category) return fail("分类不存在", 404);
    }

    const dish = await prisma.dish.create({
      data: {
        shopId: session.shopId,
        name,
        categoryId: body.categoryId || null,
        price,
        description: body.description || "",
        image: body.image || "",
        isRequired: Boolean(body.isRequired),
        defaultQty: Math.max(0, Math.floor(Number(body.defaultQty) || 50)),
        sort: Math.floor(Number(body.sort) || 0)
      }
    });
    return ok({ dish });
  } catch (error) {
    return serverError(error);
  }
}
