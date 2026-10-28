import { Prisma } from "@prisma/client";

export type RequiredDishInfo = {
  id: string;
  name: string;
};

export async function listRequiredDishes(
  tx: Prisma.TransactionClient,
  shopId: string
): Promise<RequiredDishInfo[]> {
  return tx.dish.findMany({
    where: { shopId, status: "ACTIVE", isRequired: true },
    select: { id: true, name: true },
    orderBy: [{ sort: "asc" }, { createdAt: "asc" }]
  });
}

/**
 * 找出本次下单后仍然缺少的必点菜。
 *
 * - 同一用餐会话内，只要历史订单或本次提交的菜品里包含过必点菜，即视为已点；
 * - 已取消订单里的菜品不算；
 * - 会员赠饮（isGift）不算作必点菜。
 */
export async function findMissingRequiredDishes(
  tx: Prisma.TransactionClient,
  input: {
    shopId: string;
    sessionId?: string | null;
    items?: { dishId: string }[];
  }
): Promise<RequiredDishInfo[]> {
  const required = await listRequiredDishes(tx, input.shopId);
  if (!required.length) return [];

  const orderedDishIds = new Set<string>();
  if (input.sessionId) {
    const orderedItems = await tx.orderItem.findMany({
      where: {
        order: {
          sessionId: input.sessionId,
          status: { not: "CANCELLED" }
        },
        isGift: false,
        dishId: { not: null }
      },
      select: { dishId: true }
    });
    for (const item of orderedItems) {
      if (item.dishId) orderedDishIds.add(item.dishId);
    }
  }

  for (const item of input.items || []) {
    if (item.dishId) orderedDishIds.add(item.dishId);
  }

  return required.filter((dish) => !orderedDishIds.has(dish.id));
}

export function missingDishMessage(dishes: RequiredDishInfo[]) {
  return `请先点必点菜：${dishes.map((dish) => dish.name).join("、")}`;
}
