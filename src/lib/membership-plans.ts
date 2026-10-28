export type PlanBody = {
  name?: string;
  description?: string;
  billingCycle?: string;
  price?: number | string;
  originalPrice?: number | string;
  firstMonthFree?: boolean;
  trialDays?: number | string;
  discountRate?: number | string;
  freeDrink?: boolean;
  giftCategoryName?: string;
  status?: string;
  sort?: number | string;
};

export type PlanData = {
  name?: string;
  description?: string;
  billingCycle?: string;
  price?: number;
  originalPrice?: number;
  firstMonthFree?: boolean;
  trialDays?: number;
  discountRate?: number;
  freeDrink?: boolean;
  giftCategoryName?: string;
  status?: string;
  sort?: number;
};

export function validatePlanBody(
  body: PlanBody,
  partial = false
): { data: PlanData; error?: string } {
  const data: PlanData = {};

  if (body.name !== undefined || !partial) {
    const name = String(body.name || "").trim();
    if (!name) return { data, error: "请输入方案名称" };
    if (name.length > 40) return { data, error: "方案名称不能超过 40 个字符" };
    data.name = name;
  }
  if (body.description !== undefined) {
    data.description = String(body.description || "").trim();
  }
  if (body.billingCycle !== undefined || !partial) {
    const cycle = body.billingCycle || "MONTHLY";
    if (!["MONTHLY", "YEARLY"].includes(cycle)) {
      return { data, error: "计费周期不正确" };
    }
    data.billingCycle = cycle;
  }
  if (body.price !== undefined || !partial) {
    const price = Math.floor(Number(body.price));
    if (!Number.isFinite(price) || price < 0) {
      return { data, error: "请输入正确的价格" };
    }
    data.price = price;
  }
  if (body.originalPrice !== undefined) {
    const originalPrice = Math.floor(Number(body.originalPrice));
    if (!Number.isFinite(originalPrice) || originalPrice < 0) {
      return { data, error: "请输入正确的原价" };
    }
    data.originalPrice = originalPrice;
  }
  if (body.firstMonthFree !== undefined) {
    data.firstMonthFree = Boolean(body.firstMonthFree);
  }
  if (body.trialDays !== undefined) {
    const trialDays = Math.floor(Number(body.trialDays));
    if (!Number.isFinite(trialDays) || trialDays < 0 || trialDays > 365) {
      return { data, error: "体验天数需在 0-365 天之间" };
    }
    data.trialDays = trialDays;
  }
  if (body.discountRate !== undefined || !partial) {
    const rate = Math.floor(Number(body.discountRate));
    if (!Number.isFinite(rate) || rate < 1 || rate > 100) {
      return { data, error: "折扣需在 1-100 之间（100 表示不打折）" };
    }
    data.discountRate = rate;
  }
  if (body.freeDrink !== undefined) {
    data.freeDrink = Boolean(body.freeDrink);
  }
  if (body.giftCategoryName !== undefined) {
    data.giftCategoryName =
      String(body.giftCategoryName || "").trim() || "饮品甜点";
  }
  if (body.status !== undefined || !partial) {
    const status = body.status || "ACTIVE";
    if (!["ACTIVE", "DISABLED"].includes(status)) {
      return { data, error: "方案状态不正确" };
    }
    data.status = status;
  }
  if (body.sort !== undefined) {
    const sort = Math.trunc(Number(body.sort));
    if (!Number.isFinite(sort)) return { data, error: "排序值不正确" };
    data.sort = sort;
  }

  return { data };
}
