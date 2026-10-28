"use client";

import {
  BadgeCheck,
  ChevronDown,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  UtensilsCrossed,
  Wallet,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { apiFetch, postJson } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type TableRow = {
  id: string;
  name: string;
  status: string;
  sessions: {
    id: string;
    orders: {
      id: string;
      subtotal: number;
      items: {
        id: string;
        dishId: string | null;
        dishName: string;
        quantity: number;
        isGift: boolean;
      }[];
    }[];
  }[];
};

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  status: string;
  categoryId: string | null;
  isRequired: boolean;
  totalQty: number;
  soldQty: number;
  remaining: number;
  soldOut: boolean;
};

type DishesResponse = {
  categories: { id: string; name: string }[];
  dishes: Dish[];
};

type MembershipInfo = {
  id: string;
  status: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  plan: {
    id: string;
    name: string;
    discountRate: number;
    freeDrink: boolean;
    giftCategoryName: string;
    billingCycle: string;
    price: number;
  };
};

type Member = {
  id: string;
  name: string;
  phone: string;
  points: number;
  balance: number;
  status: string;
  membership?: MembershipInfo | null;
};

type Bill = {
  id: string;
  status: string;
  shop: {
    name: string;
    pointsRedeemRate: number;
    maxPointsRatio: number;
    pointsEarnRate: number;
  };
  table: { name: string };
  orders: {
    id: string;
    status: string;
    subtotal: number;
    total: number;
    items: {
      id: string;
      dishId: string | null;
      dishName: string;
      quantity: number;
      amount: number;
      isGift: boolean;
    }[];
  }[];
  pendingSubtotal: number;
  pendingCount: number;
  requiredDishes: { id: string; name: string }[];
  missingRequiredDishes: { id: string; name: string }[];
};

export default function MerchantOfflinePage() {
  const {
    data: tableData,
    loading: tableLoading,
    refresh: refreshTables
  } = useApi<{ tables: TableRow[] }>("/api/merchant/tables");
  const {
    data: dishData,
    loading: dishLoading,
    refresh: refreshDishes
  } = useApi<DishesResponse>("/api/merchant/dishes");

  const [tableId, setTableId] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [remark, setRemark] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bill, setBill] = useState<Bill | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "BALANCE">("CASH");
  const [pointsUsed, setPointsUsed] = useState("0");
  const [checkingOut, setCheckingOut] = useState(false);

  const tables = tableData?.tables || [];
  const categories = dishData?.categories || [];
  const dishes = dishData?.dishes || [];
  const selectedTable = tables.find((t) => t.id === tableId);
  const session = selectedTable?.sessions[0];
  const pendingAmount =
    session?.orders.reduce((sum, o) => sum + o.subtotal, 0) || 0;
  const pendingCount = session?.orders.length || 0;

  const requiredDishes = useMemo(
    () => dishes.filter((dish) => dish.status === "ACTIVE" && dish.isRequired),
    [dishes]
  );

  const orderedDishIds = useMemo(() => {
    const ids = new Set<string>();
    for (const order of session?.orders || []) {
      for (const item of order.items) {
        if (item.dishId && !item.isGift) ids.add(item.dishId);
      }
    }
    return ids;
  }, [session]);

  const missingRequiredDishes = useMemo(
    () =>
      requiredDishes.filter(
        (dish) => !cart[dish.id] && !orderedDishIds.has(dish.id)
      ),
    [requiredDishes, cart, orderedDishIds]
  );

  useEffect(() => {
    const queryTable =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("table")
        : null;
    if (!tableId && tables.length) {
      const exists = queryTable && tables.some((t) => t.id === queryTable);
      setTableId(exists ? queryTable! : tables[0].id);
    }
  }, [tables, tableId]);

  const visibleDishes = useMemo(() => {
    let list = dishes.filter((d) => d.status === "ACTIVE");
    if (activeCategory !== "ALL") {
      list = list.filter((d) => d.categoryId === activeCategory);
    }
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(keyword) ||
          d.description.toLowerCase().includes(keyword)
      );
    }
    return list;
  }, [dishes, activeCategory, q]);

  const cartItems = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, quantity]) => {
          const dish = dishes.find((d) => d.id === id);
          return dish ? { dish, quantity } : null;
        })
        .filter(Boolean) as { dish: Dish; quantity: number }[],
    [cart, dishes]
  );
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.dish.price * item.quantity,
    0
  );

  function addDish(dish: Dish) {
    if (dish.soldOut) {
      toast.error(`${dish.name} 今日已售罄`);
      return;
    }
    setCart((prev) => {
      const nextQty = (prev[dish.id] || 0) + 1;
      if (nextQty > dish.remaining) {
        toast.error(`${dish.name} 今日仅剩 ${dish.remaining} 份`);
        return prev;
      }
      return { ...prev, [dish.id]: nextQty };
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

  async function lookupMember() {
    if (!memberPhone.trim()) {
      toast.error("请输入会员手机号");
      return;
    }
    setLookingUp(true);
    try {
      const res = await apiFetch<{
        user: Member;
        membership: MembershipInfo | null;
      }>(
        `/api/merchant/users/lookup?phone=${encodeURIComponent(memberPhone.trim())}`
      );
      setMember({ ...res.user, membership: res.membership });
      toast.success(`已关联会员 ${res.user.name}`);
    } catch (error) {
      setMember(null);
      toast.error(error instanceof Error ? error.message : "未找到会员");
    } finally {
      setLookingUp(false);
    }
  }

  async function submitOrder() {
    if (!selectedTable) {
      toast.error("请先选择桌台");
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
      await postJson("/api/merchant/orders", {
        tableId: selectedTable.id,
        items: cartItems.map((item) => ({
          dishId: item.dish.id,
          quantity: item.quantity
        })),
        remark,
        userId: member?.id
      });
      toast.success("订单已提交，可在右侧结账");
      setCart({});
      setRemark("");
      refreshTables();
      refreshDishes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下单失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function openCheckout() {
    if (!session) {
      toast.error("当前桌台没有待结账订单");
      return;
    }
    setCheckoutOpen(true);
    setBillLoading(true);
    setPointsUsed("0");
    try {
      const res = await apiFetch<{
        bill: Bill;
        user: Member | null;
        membership: MembershipInfo | null;
      }>(`/api/merchant/session/${session.id}`);
      setBill(res.bill);
      if (res.user) {
        setMember({ ...res.user, membership: res.membership });
        setMemberPhone(res.user.phone);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "账单加载失败");
      setCheckoutOpen(false);
    } finally {
      setBillLoading(false);
    }
  }

  const memberDiscount = useMemo(() => {
    if (!bill || !member?.membership) return 0;
    const rate = Math.min(
      100,
      Math.max(1, member.membership.plan.discountRate || 100)
    );
    return Math.floor((bill.pendingSubtotal * (100 - rate)) / 100);
  }, [bill, member]);

  const maxPoints = useMemo(() => {
    if (!bill) return 0;
    const maxDiscount = Math.floor(
      ((bill.pendingSubtotal - memberDiscount) * bill.shop.maxPointsRatio) / 100
    );
    return Math.floor((maxDiscount * bill.shop.pointsRedeemRate) / 100);
  }, [bill, memberDiscount]);

  const pointsDiscount = useMemo(() => {
    if (!bill) return 0;
    const points = Math.min(
      Math.max(0, Math.floor(Number(pointsUsed) || 0)),
      member?.points || 0,
      maxPoints
    );
    return Math.min(
      Math.floor((points * 100) / bill.shop.pointsRedeemRate),
      Math.floor(
        ((bill.pendingSubtotal - memberDiscount) * bill.shop.maxPointsRatio) /
          100
      )
    );
  }, [bill, member, memberDiscount, maxPoints, pointsUsed]);

  const payable = Math.max(
    0,
    (bill?.pendingSubtotal || 0) - memberDiscount - pointsDiscount
  );

  async function doCheckout() {
    if (!bill) return;
    if (bill.missingRequiredDishes.length) {
      toast.error(
        `请先点必点菜：${bill.missingRequiredDishes
          .map((dish) => dish.name)
          .join("、")}`
      );
      return;
    }
    if (paymentMethod === "BALANCE" && !member) {
      toast.error("余额支付需要先关联会员");
      return;
    }
    if (paymentMethod === "BALANCE" && member && member.balance < payable) {
      toast.error("会员余额不足");
      return;
    }
    setCheckingOut(true);
    try {
      const res = await postJson<{
        giftDrink?: { dishName: string } | null;
      }>(`/api/merchant/session/${bill.id}/checkout`, {
        paymentMethod,
        userId: member?.id,
        pointsUsed: Math.min(
          Math.max(0, Math.floor(Number(pointsUsed) || 0)),
          maxPoints
        )
      });
      toast.success(
        `结账成功，实收 ${formatMoney(payable)}，桌台已恢复空闲${
          res.giftDrink ? `，会员赠饮：${res.giftDrink.dishName}` : ""
        }`
      );
      setCheckoutOpen(false);
      setBill(null);
      setPointsUsed("0");
      setMember(null);
      setMemberPhone("");
      refreshTables();
      refreshDishes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "结账失败");
    } finally {
      setCheckingOut(false);
    }
  }

  if (tableLoading || dishLoading) {
    return <PageLoading label="正在加载点餐数据" />;
  }

  return (
    <div>
      <PageHeader
        title="线下点餐"
        description="商户协助到店顾客点餐、加菜与结账；结账后桌台自动恢复空闲。"
        action={
          <Button
            variant="outline"
            onClick={() => {
              refreshTables();
              refreshDishes();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </Button>
        }
      />

      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-800">选择桌台</p>
              <p className="mt-0.5 text-xs text-ink-400">
                点击桌台切换；用餐中的桌台可继续加菜
              </p>
            </div>
            {selectedTable ? (
              <Badge tone={selectedTable.status === "OCCUPIED" ? "brand" : "green"}>
                {selectedTable.status === "OCCUPIED" ? "用餐中" : "空闲"}
              </Badge>
            ) : null}
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {tables.map((table) => (
              <button
                key={table.id}
                onClick={() => {
                  setTableId(table.id);
                  setCart({});
                  setMember(null);
                  setMemberPhone("");
                }}
                className={`min-w-[92px] rounded-xl border px-4 py-3 text-left transition ${
                  table.id === tableId
                    ? "border-brand-400 bg-brand-50 text-brand-800 ring-2 ring-brand-100"
                    : table.status === "OCCUPIED"
                      ? "border-amber-200 bg-amber-50/60 text-amber-800 hover:border-amber-300"
                      : "border-ink-100 bg-white text-ink-600 hover:border-ink-200"
                }`}
              >
                <p className="text-base font-semibold">{table.name}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {table.status === "OCCUPIED"
                    ? `待结 ${formatMoney(
                        table.sessions[0]?.orders.reduce(
                          (sum, o) => sum + o.subtotal,
                          0
                        ) || 0
                      )}`
                    : "空闲"}
                </p>
              </button>
            ))}
            {!tables.length ? (
              <p className="py-3 text-xs text-ink-400">
                暂无桌台，请先在「桌码管理」中添加桌台。
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <div>
          <Card>
            <CardContent className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink-50 p-1">
                  <button
                    onClick={() => setActiveCategory("ALL")}
                    className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                      activeCategory === "ALL"
                        ? "bg-white text-ink-900 shadow-sm"
                        : "text-ink-500"
                    }`}
                  >
                    全部
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setActiveCategory(c.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        activeCategory === c.id
                          ? "bg-white text-ink-900 shadow-sm"
                          : "text-ink-500"
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="relative w-full lg:max-w-[220px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                  <Input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="搜索菜品"
                    className="pl-9"
                  />
                </div>
              </div>
            </CardContent>

            {visibleDishes.length ? (
              <div className="grid gap-2 p-4 pt-0 sm:grid-cols-2">
                {visibleDishes.map((dish) => (
                  <div
                    key={dish.id}
                    className={`flex gap-3 rounded-xl border p-3 transition ${
                      dish.soldOut
                        ? "border-ink-100 bg-ink-50/60 opacity-60"
                        : "border-ink-100 hover:border-brand-200 hover:bg-brand-50/30"
                    }`}
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-brand-100 to-ink-100">
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
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-sm font-medium text-ink-900">
                            <span>{dish.name}</span>
                            {dish.isRequired ? (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                                必点
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-ink-400">
                            {dish.description || "暂无描述"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-brand-600">
                          {formatMoney(dish.price)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-ink-400">
                          {dish.soldOut ? "今日售罄" : `剩 ${dish.remaining} 份`}
                        </span>
                        {cart[dish.id] ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => removeDish(dish)}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-600 hover:border-brand-300"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-4 text-center text-xs font-semibold">
                              {cart[dish.id]}
                            </span>
                            <button
                              onClick={() => addDish(dish)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white hover:bg-brand-600"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled={dish.soldOut}
                            onClick={() => addDish(dish)}
                            className="flex h-6 items-center gap-1 rounded-full bg-brand-500 px-2.5 text-[11px] font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-ink-300"
                          >
                            <Plus className="h-3 w-3" />
                            添加
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有可售菜品"
                description="请先在菜品管理中上架菜品或调整今日库存"
              />
            )}
          </Card>
        </div>

        <div className="space-y-4">
          {pendingCount > 0 ? (
            <Card className="border-brand-200 bg-brand-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-brand-700">当前桌台待结账</p>
                    <p className="mt-1 text-xl font-semibold text-brand-800">
                      {formatMoney(pendingAmount)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-brand-600/70">
                      {pendingCount} 笔订单 · 可继续加菜
                    </p>
                  </div>
                  <Button size="sm" onClick={openCheckout}>
                    <Wallet className="h-3.5 w-3.5" />
                    结账
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card className="xl:sticky xl:top-24">
            <CardHeader className="flex flex-row items-center justify-between pb-0">
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-brand-500" />
                当前点餐
              </CardTitle>
              {cartItems.length ? (
                <button
                  onClick={() => setCart({})}
                  className="text-xs text-ink-400 hover:text-rose-500"
                >
                  清空
                </button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {cartItems.length ? (
                <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1">
                  {cartItems.map(({ dish, quantity }) => (
                    <div key={dish.id} className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {dish.name}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-400">
                          {formatMoney(dish.price)} × {quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => removeDish(dish)}
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 text-ink-500"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-xs font-semibold">
                          {quantity}
                        </span>
                        <button
                          onClick={() => addDish(dish)}
                          className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white"
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
                <div className="py-8 text-center">
                  <UtensilsCrossed className="mx-auto h-8 w-8 text-ink-200" />
                  <p className="mt-2 text-xs text-ink-400">还没有选择菜品</p>
                </div>
              )}

              {requiredDishes.length ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] leading-5 text-amber-700">
                  <span className="font-medium">本店必点：</span>
                  {requiredDishes.map((dish) => dish.name).join("、")}
                  {missingRequiredDishes.length ? (
                    <span className="mt-0.5 block font-medium text-rose-600">
                      当前还差：{missingRequiredDishes
                        .map((dish) => dish.name)
                        .join("、")}
                    </span>
                  ) : (
                    <span className="mt-0.5 block font-medium text-emerald-600">
                      已点齐必点菜
                    </span>
                  )}
                </div>
              ) : null}

              <div className="border-t border-ink-100 pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">小计</span>
                  <span className="text-lg font-semibold text-ink-900">
                    {formatMoney(subtotal)}
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-ink-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-600">关联会员（选填）</p>
                  {member ? (
                    <button
                      onClick={() => {
                        setMember(null);
                        setMemberPhone("");
                      }}
                      className="text-[11px] text-ink-400 hover:text-rose-500"
                    >
                      取消关联
                    </button>
                  ) : null}
                </div>
                {member ? (
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink-800">
                        {member.name} · {member.phone}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        积分 {member.points} · 余额 {formatMoney(member.balance)}
                      </p>
                    </div>
                    <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={memberPhone}
                      onChange={(e) => setMemberPhone(e.target.value)}
                      placeholder="会员手机号"
                      className="h-9 text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={lookupMember}
                      loading={lookingUp}
                    >
                      查找
                    </Button>
                  </div>
                )}
              </div>

              <Field label="备注">
                <Textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="如：少辣、先上凉菜"
                  className="min-h-[60px] text-xs"
                />
              </Field>

              <Button
                className="w-full"
                size="lg"
                onClick={submitOrder}
                loading={submitting}
                disabled={!cartItems.length || !selectedTable}
              >
                提交订单
              </Button>
              <p className="text-center text-[10px] text-ink-400">
                提交后可在上方「当前桌台待结账」中完成结账
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Modal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        title="桌台结账"
        description={
          bill
            ? `${bill.table.name} · ${bill.pendingCount} 笔待结账订单`
            : "正在加载账单"
        }
        className="max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>
              取消
            </Button>
            <Button
              onClick={doCheckout}
              loading={checkingOut}
              disabled={!bill || (bill?.missingRequiredDishes.length || 0) > 0}
            >
              确认收款 {formatMoney(payable)}
            </Button>
          </>
        }
      >
        {billLoading || !bill ? (
          <PageLoading label="正在加载账单" />
        ) : (
          <div className="space-y-4">
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-ink-100 p-3">
              {bill.orders.flatMap((order) =>
                order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-ink-600">
                      {item.dishName} × {item.quantity}
                      {item.isGift ? (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                          赠饮
                        </span>
                      ) : null}
                    </span>
                    <span className="font-medium text-ink-800">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="rounded-xl bg-ink-50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink-500">小计</span>
                <span className="font-medium">{formatMoney(bill.pendingSubtotal)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">会员折扣</span>
                <span className="font-medium text-brand-600">
                  -{formatMoney(memberDiscount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">积分抵扣</span>
                <span className="font-medium text-brand-600">
                  -{formatMoney(pointsDiscount)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-ink-200 pt-2">
                <span className="text-sm font-medium text-ink-700">应收</span>
                <span className="text-xl font-semibold text-ink-900">
                  {formatMoney(payable)}
                </span>
              </div>
            </div>

            {bill.missingRequiredDishes.length ? (
              <p className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-xs text-rose-600">
                请先点必点菜：
                {bill.missingRequiredDishes.map((dish) => dish.name).join("、")}
                ，完成后才能结账。
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="支付方式">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod("CASH")}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-medium ${
                      paymentMethod === "CASH"
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-ink-200 text-ink-500"
                    }`}
                  >
                    现金 / 线下
                  </button>
                  <button
                    onClick={() => setPaymentMethod("BALANCE")}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-medium ${
                      paymentMethod === "BALANCE"
                        ? "border-brand-400 bg-brand-50 text-brand-700"
                        : "border-ink-200 text-ink-500"
                    }`}
                  >
                    会员余额
                  </button>
                </div>
              </Field>
              <Field
                label="使用积分"
                hint={
                  member
                    ? `可用 ${Math.min(member.points, maxPoints)} 积分，最多抵 ${formatMoney(
                        Math.floor(
                          ((bill.pendingSubtotal - memberDiscount) *
                            bill.shop.maxPointsRatio) /
                            100
                        )
                      )}`
                    : "关联会员后可使用积分"
                }
              >
                <Input
                  type="number"
                  min="0"
                  max={member ? Math.min(member.points, maxPoints) : 0}
                  value={pointsUsed}
                  onChange={(e) => setPointsUsed(e.target.value)}
                  disabled={!member}
                />
              </Field>
            </div>

            {member ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-700">
                    会员 {member.name} · 当前积分 {member.points} · 余额{" "}
                    {formatMoney(member.balance)}
                  </span>
                  <Badge tone="green">已关联</Badge>
                </div>
                {member.membership ? (
                  <p className="mt-1.5 text-[11px] text-emerald-700">
                    {member.membership.plan.name} ·{" "}
                    {member.membership.plan.discountRate / 10} 折 ·{" "}
                    {member.membership.plan.freeDrink
                      ? `结账赠 1 份${member.membership.plan.giftCategoryName}`
                      : "暂无赠饮"}
                  </p>
                ) : (
                  <p className="mt-1.5 text-[11px] text-ink-400">
                    该会员暂无生效中的付费会员方案
                  </p>
                )}
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                未关联会员：本单不产生积分，也无法享受会员折扣和赠饮。可在点餐前通过手机号关联会员。
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
