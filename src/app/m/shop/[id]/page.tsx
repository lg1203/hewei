"use client";

import {
  ChevronLeft,
  ChefHat,
  ClipboardList,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { PageLoading } from "@/components/ui/Spinner";
import { ApiError, postJson } from "@/lib/api";
import { cn, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  categoryId: string | null;
  isRequired: boolean;
  totalQty: number;
  soldQty: number;
  remaining: number;
  soldOut: boolean;
};

type Category = {
  id: string;
  name: string;
  sort: number;
  dishes: Dish[];
};

type Menu = {
  id: string;
  name: string;
  description: string;
  announcement: string;
  address: string;
  businessHours: string;
  cover: string;
  pointsEarnRate: number;
  pointsRedeemRate: number;
  maxPointsRatio: number;
  categories: Category[];
  uncategorized: Dish[];
};

type TableInfo = {
  table: {
    id: string;
    name: string;
    status: string;
    shop: { id: string; name: string };
  };
};

type OrderResponse = {
  order: { id: string; orderNo: string; sessionId: string | null };
};

type BillSummary = {
  orders: {
    items: { dishId: string | null; isGift: boolean }[];
  }[];
};

function ShopContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const shopId = typeof params?.id === "string" ? params.id : "";
  const tableToken = searchParams.get("table") || "";
  const sessionId = searchParams.get("session") || "";

  const { data: menu, loading, error } = useApi<Menu>(
    shopId ? `/api/public/shops/${shopId}` : null
  );
  const { data: tableData } = useApi<TableInfo>(
    tableToken ? `/api/public/tables/${encodeURIComponent(tableToken)}` : null
  );
  const { data: billData } = useApi<{ bill: BillSummary }>(
    sessionId ? `/api/user/session/${sessionId}` : null
  );

  const [activeCategory, setActiveCategory] = useState("ALL");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const allDishes = useMemo(() => {
    if (!menu) return [] as Dish[];
    return [
      ...menu.categories.flatMap((c) => c.dishes),
      ...(menu.uncategorized || [])
    ];
  }, [menu]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const dish = allDishes.find((d) => d.id === id);
          return dish ? { dish, quantity } : null;
        })
        .filter(Boolean) as { dish: Dish; quantity: number }[],
    [cart, allDishes]
  );

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0
  );
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const requiredDishes = useMemo(
    () => allDishes.filter((dish) => dish.isRequired),
    [allDishes]
  );

  const orderedDishIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of billData?.bill.orders || []) {
      for (const item of order.items) {
        if (item.dishId && !item.isGift) ids.add(item.dishId);
      }
    }
    return ids;
  }, [billData]);

  const missingRequiredDishes = useMemo(
    () =>
      requiredDishes.filter(
        (dish) => !cart[dish.id] && !orderedDishIds.has(dish.id)
      ),
    [requiredDishes, cart, orderedDishIds]
  );

  const sections = useMemo(() => {
    if (!menu) return [] as { id: string; name: string; dishes: Dish[] }[];
    const list = menu.categories.map((c) => ({
      id: c.id,
      name: c.name,
      dishes: c.dishes
    }));
    if (menu.uncategorized?.length) {
      list.push({ id: "UNCATEGORIZED", name: "其他", dishes: menu.uncategorized });
    }
    if (activeCategory === "ALL") return list;
    return list.filter((s) => s.id === activeCategory);
  }, [menu, activeCategory]);

  const categories = useMemo(() => {
    if (!menu) return [] as { id: string; name: string }[];
    const list = menu.categories.map((c) => ({ id: c.id, name: c.name }));
    if (menu.uncategorized?.length) {
      list.push({ id: "UNCATEGORIZED", name: "其他" });
    }
    return list;
  }, [menu]);

  function addDish(dish: Dish) {
    if (dish.soldOut) {
      toast.error(`${dish.name} 今日已售罄`);
      return;
    }
    setCart((prev) => {
      const next = (prev[dish.id] || 0) + 1;
      if (next > dish.remaining) {
        toast.error(`${dish.name} 今日仅剩 ${dish.remaining} 份`);
        return prev;
      }
      return { ...prev, [dish.id]: next };
    });
  }

  function removeDish(dish: Dish) {
    setCart((prev) => {
      const next = { ...prev };
      if (!next[dish.id]) return prev;
      next[dish.id] -= 1;
      if (next[dish.id] <= 0) delete next[dish.id];
      return next;
    });
  }

  async function submitOrder() {
    if (!tableToken) {
      toast.error("请先扫描桌码");
      router.push("/m/scan");
      return;
    }
    if (!cartItems.length) {
      toast.error("请先选择菜品");
      return;
    }
    if (missingRequiredDishes.length) {
      toast.error(
        `请先点必点菜：${missingRequiredDishes
          .map((dish) => dish.name)
          .join("、")}`
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson<OrderResponse>("/api/user/orders", {
        tableToken,
        items: cartItems.map((item) => ({
          dishId: item.dish.id,
          quantity: item.quantity
        })),
        remark
      });
      toast.success("下单成功");
      setCart({});
      setRemark("");
      setCartOpen(false);
      const nextSession = res.order.sessionId || sessionId;
      if (nextSession) {
        router.push(`/m/bill/${nextSession}`);
      } else {
        router.push("/m/orders");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const redirect = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
        router.push(`/m/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : "下单失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading label="正在加载菜单" />;

  if (error || !menu || !menu.id) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <ChefHat className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink-900">门店暂时无法点餐</p>
        <p className="mt-1 text-xs leading-5 text-ink-400">
          {error || "门店不存在或已停业，请稍后再试。"}
        </p>
        <Button className="mt-5" onClick={() => router.push("/m")}>
          返回首页
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-ink-100"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="ml-1 min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">{menu.name}</p>
            <p className="text-[10px] text-ink-400">
              {tableData?.table
                ? `桌台 ${tableData.table.name}`
                : tableToken
                  ? "桌台识别中"
                  : "未关联桌台 · 扫码后可下单"}
            </p>
          </div>
          {sessionId ? (
            <Link
              href={`/m/bill/${sessionId}`}
              className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              账单
            </Link>
          ) : null}
        </div>
      </header>

      <div className="bg-gradient-to-br from-brand-500 to-orange-400 px-4 pb-6 pt-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{menu.name}</h1>
            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-white/75">
              {menu.description || "欢迎光临，扫码点餐更便捷。"}
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <ChefHat className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
            营业 {menu.businessHours}
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
            消费 {menu.pointsEarnRate} 元 = 1 积分
          </span>
          <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur">
            {menu.pointsRedeemRate} 积分抵 1 元
          </span>
        </div>
      </div>

      {menu.announcement ? (
        <div className="-mt-3 px-4">
          <div className="flex items-start gap-2 rounded-xl bg-white px-3.5 py-2.5 shadow-card">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-[11px] leading-5 text-ink-500">{menu.announcement}</p>
          </div>
        </div>
      ) : null}

      {requiredDishes.length ? (
        <div className={cn("px-4", menu.announcement ? "mt-3" : "-mt-3")}>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5">
            <p className="text-[11px] font-medium text-amber-800">本店必点</p>
            <p className="mt-0.5 text-[10px] leading-5 text-amber-700">
              {requiredDishes.map((dish) => dish.name).join("、")}
              ：同一用餐会话至少点 1 份，未点无法下单和结账
            </p>
            {missingRequiredDishes.length ? (
              <p className="mt-1 text-[10px] font-medium text-rose-600">
                当前还差：{missingRequiredDishes.map((dish) => dish.name).join("、")}
              </p>
            ) : (
              <p className="mt-1 text-[10px] font-medium text-emerald-600">
                已点齐必点菜
              </p>
            )}
          </div>
        </div>
      ) : null}

      {!tableToken ? (
        <div className="mt-3 px-4">
          <Link
            href="/m/scan"
            className="flex items-center justify-between rounded-xl border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-xs font-medium text-brand-700"
          >
            <span>未关联桌台，扫码开桌后即可下单</span>
            <span className="rounded-full bg-brand-500 px-2.5 py-1 text-[10px] text-white">
              去扫码
            </span>
          </Link>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2 px-3">
        <div className="no-scrollbar sticky top-14 max-h-[calc(100vh-140px)] w-[74px] shrink-0 self-start overflow-y-auto">
          <div className="space-y-1 pb-4">
            <button
              onClick={() => setActiveCategory("ALL")}
              className={cn(
                "w-full rounded-lg px-2 py-2.5 text-left text-[11px] font-medium transition",
                activeCategory === "ALL"
                  ? "bg-white text-brand-600 shadow-sm"
                  : "text-ink-500"
              )}
            >
              全部
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  "w-full rounded-lg px-2 py-2.5 text-left text-[11px] font-medium transition",
                  activeCategory === category.id
                    ? "bg-white text-brand-600 shadow-sm"
                    : "text-ink-500"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-4 pb-4">
          {sections.map((section) => (
            <section key={section.id}>
              <div className="mb-2 flex items-center gap-2 px-1">
                <h2 className="text-sm font-semibold text-ink-900">{section.name}</h2>
                <span className="text-[10px] text-ink-400">
                  {section.dishes.length} 道
                </span>
              </div>
              {section.dishes.length ? (
                <div className="space-y-2">
                  {section.dishes.map((dish) => (
                    <div
                      key={dish.id}
                      className={cn(
                        "flex gap-3 rounded-xl bg-white p-3 shadow-card",
                        dish.soldOut && "opacity-60"
                      )}
                    >
                      <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-ink-100">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                        {dish.soldOut ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-ink-900/55">
                            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-ink-700">
                              售罄
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between">
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                            <span>{dish.name}</span>
                            {dish.isRequired ? (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                必点
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-ink-400">
                            {dish.description || "暂无描述"}
                          </p>
                        </div>
                        <div className="flex items-end justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-brand-600">
                              {formatMoney(dish.price)}
                            </p>
                            <p className="text-[10px] text-ink-400">
                              {dish.soldOut ? "今日售罄" : `剩 ${dish.remaining} 份`}
                            </p>
                          </div>
                          {cart[dish.id] ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => removeDish(dish)}
                                className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600"
                                aria-label="减少"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-4 text-center text-xs font-semibold text-ink-800">
                                {cart[dish.id]}
                              </span>
                              <button
                                onClick={() => addDish(dish)}
                                className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white"
                                aria-label="增加"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              disabled={dish.soldOut}
                              onClick={() => addDish(dish)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-300"
                              aria-label="添加"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-white py-8 text-center text-[11px] text-ink-400">
                  该分类暂无菜品
                </div>
              )}
            </section>
          ))}
        </div>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-ink-100 bg-white/95 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!cartItems.length) {
                toast.error("请先选择菜品");
                return;
              }
              setCartOpen(true);
            }}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ink-900 text-white"
            aria-label="购物车"
          >
            <ShoppingCart className="h-5 w-5" />
            {totalQuantity > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-semibold text-white">
                {totalQuantity}
              </span>
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            {cartItems.length ? (
              <>
                <p className="text-lg font-semibold leading-tight text-ink-900">
                  {formatMoney(subtotal)}
                </p>
                <p className="text-[10px] text-ink-400">共 {totalQuantity} 份菜品</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-ink-600">还没有选择菜品</p>
                <p className="text-[10px] text-ink-400">选择喜欢的菜品加入购物车</p>
              </>
            )}
          </div>
          {tableToken ? (
            <Button
              size="lg"
              disabled={!cartItems.length}
              onClick={() => setCartOpen(true)}
              className="min-w-[112px]"
            >
              选好了
            </Button>
          ) : (
            <Link href="/m/scan">
              <Button size="lg" className="min-w-[112px]">
                扫码开桌
              </Button>
            </Link>
          )}
        </div>
      </div>

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
            onClick={() => setCartOpen(false)}
          />
          <div className="safe-bottom relative z-10 w-full max-w-[480px] rounded-t-3xl bg-white">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-ink-900">已选菜品</p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  {tableData?.table
                    ? `桌台 ${tableData.table.name}`
                    : "未关联桌台"}
                </p>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[46vh] overflow-y-auto px-4 py-3">
              {cartItems.length ? (
                <div className="space-y-3">
                  {cartItems.map(({ dish, quantity }) => (
                    <div key={dish.id} className="flex items-center gap-3">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-ink-100">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {dish.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          {formatMoney(dish.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removeDish(dish)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 text-ink-500"
                          aria-label="减少"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-xs font-semibold">
                          {quantity}
                        </span>
                        <button
                          onClick={() => addDish(dish)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white"
                          aria-label="增加"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="w-16 text-right text-sm font-semibold text-ink-900">
                        {formatMoney(dish.price * quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-xs text-ink-400">购物车是空的</p>
              )}
            </div>

            <div className="border-t border-ink-100 px-4 py-3">
              <Textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="备注：如少辣、先上凉菜（选填）"
                className="min-h-[56px] text-xs"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  onClick={() => setCart({})}
                  className="flex h-10 items-center gap-1 rounded-xl px-2 text-xs text-ink-400 hover:text-rose-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  清空
                </button>
                <div className="min-w-0 flex-1 text-right">
                  <p className="text-[10px] text-ink-400">合计</p>
                  <p className="text-lg font-semibold text-ink-900">
                    {formatMoney(subtotal)}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={submitOrder}
                  loading={submitting}
                  disabled={!cartItems.length}
                  className="min-w-[120px]"
                >
                  提交订单
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function MobileShopPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <ShopContent />
    </Suspense>
  );
}
