"use client";

import {
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Loader2,
  Sparkles,
  TicketPercent,
  Wallet,
  X
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PageLoading } from "@/components/ui/Spinner";
import { postJson } from "@/lib/api";
import { PAYMENT_LABEL } from "@/lib/constants";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type BillItem = {
  id: string;
  dishName: string;
  price: number;
  quantity: number;
  amount: number;
  isGift: boolean;
};

type BillOrder = {
  id: string;
  orderNo: string;
  status: string;
  subtotal: number;
  couponDiscount: number;
  memberDiscount: number;
  pointsDiscount: number;
  pointsUsed: number;
  total: number;
  createdAt: string;
  items: BillItem[];
};

type Bill = {
  id: string;
  shopId: string;
  tableId: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  subtotal: number;
  couponDiscount: number;
  pointsUsed: number;
  pointsDiscount: number;
  memberDiscount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paidAt: string | null;
  requiredDishes: { id: string; name: string }[];
  missingRequiredDishes: { id: string; name: string }[];
  shop: {
    id: string;
    name: string;
    announcement: string;
    pointsEarnRate: number;
    pointsRedeemRate: number;
    maxPointsRatio: number;
  };
  table: { id: string; name: string; qrToken: string };
  orders: BillOrder[];
  pendingOrders: BillOrder[];
  pendingSubtotal: number;
  pendingCount: number;
};

type Me = {
  user: {
    id: string;
    name: string;
    phone: string;
    role?: string;
    balance: number;
    points: number;
    membership?: MembershipInfo | null;
  };
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
  };
};

type UserCoupon = {
  id: string;
  status: string;
  claimedAt: string;
  usedAt: string | null;
  coupon: {
    id: string;
    title: string;
    description: string;
    type: string;
    threshold: number;
    value: number;
    discountRate: number | null;
    shopId: string | null;
    startAt: string;
    endAt: string;
    status: string;
    shop: { id: string; name: string } | null;
  };
};

type CheckoutResult = {
  session: Bill;
  subtotal: number;
  couponDiscount: number;
  memberDiscount: number;
  pointsDiscount: number;
  total: number;
  pointsUsed: number;
  earnedPoints: number;
  giftDrink: { dishName: string; price: number } | null;
};

function couponDiscountFor(coupon: UserCoupon["coupon"], subtotal: number) {
  if (subtotal < coupon.threshold) return 0;
  if (coupon.type === "FULL_REDUCTION") {
    return Math.min(coupon.value, subtotal);
  }
  const rate = coupon.discountRate ?? 100;
  return subtotal - Math.floor((subtotal * rate) / 100);
}

function isCouponUsable(uc: UserCoupon, bill: Bill, now = Date.now()) {
  if (uc.status !== "UNUSED") return false;
  if (uc.coupon.status !== "ACTIVE") return false;
  if (uc.coupon.shopId && uc.coupon.shopId !== bill.shopId) return false;
  if (new Date(uc.coupon.startAt).getTime() > now) return false;
  if (new Date(uc.coupon.endAt).getTime() < now) return false;
  if (bill.pendingSubtotal < uc.coupon.threshold) return false;
  return true;
}

export default function BillPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const billId = typeof params?.id === "string" ? params.id : "";

  const { data: billData, loading, error } = useApi<{ bill: Bill }>(
    billId ? `/api/user/session/${billId}` : null
  );
  const { data: meData, refresh: refreshMe } = useApi<Me>("/api/auth/me");
  const { data: couponData, refresh: refreshCoupons } = useApi<{
    coupons: UserCoupon[];
  }>("/api/user/coupons?scope=mine");

  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [pointsInput, setPointsInput] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<"BALANCE" | "WECHAT">(
    "BALANCE"
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const defaultsAppliedFor = useRef<string | null>(null);

  const bill = billData?.bill;
  const me = meData?.user?.role === "USER" ? meData.user : undefined;

  const usableCoupons = useMemo(() => {
    if (!bill || !couponData?.coupons) return [] as UserCoupon[];
    return couponData.coupons.filter((uc) => isCouponUsable(uc, bill));
  }, [bill, couponData]);

  const selectedCoupon = useMemo(
    () => usableCoupons.find((uc) => uc.id === selectedCouponId) || null,
    [usableCoupons, selectedCouponId]
  );

  const subtotal = bill?.pendingSubtotal || 0;
  const couponDiscount = selectedCoupon
    ? couponDiscountFor(selectedCoupon.coupon, subtotal)
    : 0;
  const membership = me?.membership || null;
  const memberRate = membership
    ? Math.min(100, Math.max(1, membership.plan.discountRate || 100))
    : 100;
  const memberDiscount = bill
    ? Math.floor(((subtotal - couponDiscount) * (100 - memberRate)) / 100)
    : 0;
  const maxDiscount = bill
    ? Math.floor(
        ((subtotal - couponDiscount - memberDiscount) *
          bill.shop.maxPointsRatio) /
          100
      )
    : 0;
  const maxPoints = bill
    ? Math.floor((maxDiscount * bill.shop.pointsRedeemRate) / 100)
    : 0;
  const usablePoints = Math.min(me?.points || 0, maxPoints);
  const pointsUsed = Math.min(
    Math.max(0, Math.floor(Number(pointsInput) || 0)),
    usablePoints
  );
  const pointsDiscount = bill
    ? Math.min(
        Math.floor((pointsUsed * 100) / bill.shop.pointsRedeemRate),
        maxDiscount
      )
    : 0;
  const payable = Math.max(
    0,
    subtotal - couponDiscount - memberDiscount - pointsDiscount
  );
  const balanceEnough = (me?.balance || 0) >= payable;

  // 进入账单时默认帮用户选中优惠力度最大的可用券，并把积分抵扣拉满。
  useEffect(() => {
    if (!bill || !me || !couponData?.coupons) return;
    const key = `${bill.id}:${me.id}`;
    if (defaultsAppliedFor.current === key) return;

    const usable = couponData.coupons.filter((uc) => isCouponUsable(uc, bill));
    const best = [...usable].sort((a, b) => {
      const diff =
        couponDiscountFor(b.coupon, bill.pendingSubtotal) -
        couponDiscountFor(a.coupon, bill.pendingSubtotal);
      if (diff !== 0) return diff;
      return (
        new Date(a.coupon.endAt).getTime() - new Date(b.coupon.endAt).getTime()
      );
    })[0];

    const bestDiscount = best
      ? couponDiscountFor(best.coupon, bill.pendingSubtotal)
      : 0;
    const bestMemberDiscount = membership
      ? Math.floor(
          ((bill.pendingSubtotal - bestDiscount) * (100 - memberRate)) / 100
        )
      : 0;
    const maxDiscount = Math.floor(
      ((bill.pendingSubtotal - bestDiscount - bestMemberDiscount) *
        bill.shop.maxPointsRatio) /
        100
    );
    const maxPoints = Math.floor(
      (maxDiscount * bill.shop.pointsRedeemRate) / 100
    );

    setSelectedCouponId(best?.id || "");
    setPointsInput(String(Math.min(me.points, maxPoints)));
    defaultsAppliedFor.current = key;
  }, [bill, me, couponData, membership, memberRate]);

  // 切换优惠券后，积分最多可用数量会变化，自动收敛到新的上限。
  useEffect(() => {
    setPointsInput((prev) => {
      const value = Math.max(0, Math.floor(Number(prev) || 0));
      return String(Math.min(value, usablePoints));
    });
  }, [usablePoints]);

  async function submitCheckout() {
    if (!bill) return;
    if (bill.missingRequiredDishes.length) {
      toast.error(
        `请先点必点菜：${bill.missingRequiredDishes
          .map((dish) => dish.name)
          .join("、")}`
      );
      return;
    }
    if (paymentMethod === "BALANCE" && !balanceEnough) {
      toast.error("余额不足，请选择微信支付或先充值");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson<CheckoutResult>(
        `/api/user/session/${bill.id}/checkout`,
        {
          userCouponId: selectedCoupon?.id,
          pointsUsed,
          paymentMethod
        }
      );
      setResult(res);
      refreshMe();
      refreshCoupons();
      toast.success("结账成功，桌台已恢复空闲");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "结账失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoading label="正在加载账单" />;

  if (error || !bill) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <ClipboardList className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink-900">账单无法查看</p>
        <p className="mt-1 text-xs leading-5 text-ink-400">
          {error || "账单不存在，或你还没有登录。"}
        </p>
        <div className="mt-5 grid w-full max-w-[260px] grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => router.push("/m")}>
            返回首页
          </Button>
          <Button
            onClick={() =>
              router.push(
                `/m/login?redirect=${encodeURIComponent(`/m/bill/${billId}`)}`
              )
            }
          >
            去登录
          </Button>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="flex min-h-screen flex-col px-5 pb-10 pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight text-ink-900">
            结账成功
          </h1>
          <p className="mt-1 text-xs text-ink-400">
            {bill.shop.name} · 桌台 {bill.table.name}
          </p>
          <p className="mt-6 text-4xl font-semibold tracking-tight text-ink-900">
            {formatMoney(result.total)}
          </p>
          <p className="mt-1 text-[11px] text-ink-400">
            {PAYMENT_LABEL[paymentMethod] || paymentMethod}
          </p>
        </div>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-card">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>小计</span>
              <span>{formatMoney(result.subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>优惠券</span>
              <span className="text-emerald-600">
                -{formatMoney(result.couponDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>会员折扣</span>
              <span className="text-emerald-600">
                -{formatMoney(result.memberDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>积分抵扣</span>
              <span className="text-emerald-600">
                -{formatMoney(result.pointsDiscount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2.5 text-base font-semibold text-ink-900">
              <span>实付</span>
              <span>{formatMoney(result.total)}</span>
            </div>
          </div>
          {result.giftDrink ? (
            <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3.5 py-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <Sparkles className="h-3.5 w-3.5" />
                会员赠饮
              </span>
              <span className="font-semibold text-emerald-700">
                {result.giftDrink.dishName} × 1
              </span>
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-3.5 py-3 text-xs">
            <span className="flex items-center gap-1.5 text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />
              本单获得积分
            </span>
            <span className="font-semibold text-amber-700">
              +{result.earnedPoints}
            </span>
          </div>
          <p className="mt-3 text-center text-[10px] text-ink-400">
            桌台已恢复空闲，欢迎下次光临
          </p>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Link href="/m/orders">
            <Button variant="outline" size="lg" className="w-full">
              查看订单
            </Button>
          </Link>
          <Link href="/m">
            <Button size="lg" className="w-full">
              返回首页
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (bill.status !== "OPEN") {
    return (
      <div className="min-h-screen">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m/orders")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">账单详情</p>
        </div>
        <div className="px-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-900">该账单已结清</p>
            <p className="mt-1 text-xs text-ink-400">
              {bill.shop.name} · 桌台 {bill.table.name}
            </p>
            <p className="mt-5 text-3xl font-semibold text-ink-900">
              {formatMoney(bill.totalAmount || bill.subtotal)}
            </p>
            <p className="mt-1 text-[11px] text-ink-400">
              {bill.paidAt ? `结账时间 ${formatDateTime(bill.paidAt)}` : ""}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Link href="/m/orders">
                <Button variant="outline" className="w-full">
                  查看订单
                </Button>
              </Link>
              <Link href="/m">
                <Button className="w-full">返回首页</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (bill.pendingCount === 0) {
    return (
      <div className="min-h-screen">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m/orders")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">账单详情</p>
        </div>
        <div className="px-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
              <ClipboardList className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-900">
              暂无待结账订单
            </p>
            <p className="mt-1 text-xs text-ink-400">
              {bill.shop.name} · 桌台 {bill.table.name}
            </p>
            <p className="mt-2 text-[11px] leading-5 text-ink-400">
              点餐后可在账单中统一结账，会员折扣与赠饮会自动生效。
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Link
                href={`/m/shop/${bill.shopId}?session=${bill.id}&table=${bill.table.qrToken}`}
              >
                <Button className="w-full">去点餐</Button>
              </Link>
              <Link href="/m/orders">
                <Button variant="outline" className="w-full">
                  我的订单
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() =>
              router.push(
                `/m/shop/${bill.shopId}?session=${bill.id}&table=${bill.table.qrToken}`
              )
            }
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="ml-1 min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-900">桌台账单</p>
            <p className="text-[10px] text-ink-400">
              {bill.shop.name} · {bill.table.name}
            </p>
          </div>
          <Badge tone="amber">待结账</Badge>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-ink-400">待结账金额</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-ink-900">
                {formatMoney(subtotal)}
              </p>
            </div>
            <div className="text-right text-[11px] text-ink-400">
              <p>{bill.pendingCount} 笔订单</p>
              <p className="mt-1">开桌 {formatDateTime(bill.openedAt)}</p>
            </div>
          </div>
        </div>

        {bill.missingRequiredDishes.length ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
            <p className="text-xs font-semibold text-rose-600">还差必点菜</p>
            <p className="mt-1 text-[11px] leading-5 text-rose-600">
              请先点：
              {bill.missingRequiredDishes.map((dish) => dish.name).join("、")}
              ，点齐后才能结账。
            </p>
            <button
              onClick={() =>
                router.push(
                  `/m/shop/${bill.shopId}?session=${bill.id}&table=${bill.table.qrToken}`
                )
              }
              className="mt-2 text-[11px] font-medium text-brand-600"
            >
              去点必点菜 →
            </button>
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {bill.pendingOrders.map((order) => (
            <div key={order.id} className="rounded-2xl bg-white p-4 shadow-card">
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <p className="font-mono text-[10px] text-ink-400">{order.orderNo}</p>
                <p className="text-[10px] text-ink-400">
                  {formatDateTime(order.createdAt)}
                </p>
              </div>
              <div className="mt-3 space-y-2.5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <span className="min-w-0 flex-1 truncate text-ink-700">
                      {item.dishName}
                      {item.isGift ? (
                        <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                          赠饮
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-ink-400">×{item.quantity}</span>
                    <span className="w-16 text-right font-medium text-ink-900">
                      {formatMoney(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-card">
          <button
            onClick={() => setCouponOpen(true)}
            className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500">
              <TicketPercent className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-800">优惠券</p>
              <p className="mt-0.5 text-[11px] text-ink-400">
                {selectedCoupon
                  ? selectedCoupon.coupon.title
                  : usableCoupons.length
                    ? `${usableCoupons.length} 张可用`
                    : "暂无可用优惠券"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {selectedCoupon ? (
                <span className="text-sm font-semibold text-rose-500">
                  -{formatMoney(couponDiscount)}
                </span>
              ) : null}
              <ChevronRight className="h-4 w-4 text-ink-300" />
            </div>
          </button>

          <div className="border-t border-ink-100 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-500">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-800">积分抵扣</p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  当前 {me?.points || 0} 积分，最多可用 {usablePoints} 积分
                </p>
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  min="0"
                  max={usablePoints}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  className="h-9 text-right text-xs"
                />
              </div>
            </div>
            {pointsDiscount > 0 ? (
              <p className="mt-2 text-right text-[11px] text-violet-600">
                已抵扣 {formatMoney(pointsDiscount)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 px-1 text-xs font-medium text-ink-500">支付方式</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod("BALANCE")}
              className={cn(
                "relative rounded-2xl border bg-white p-4 text-left transition",
                paymentMethod === "BALANCE"
                  ? "border-brand-400 ring-2 ring-brand-100"
                  : "border-ink-100"
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-brand-500" />
                <span className="text-sm font-medium text-ink-800">余额支付</span>
                {paymentMethod === "BALANCE" ? (
                  <Check className="ml-auto h-4 w-4 text-brand-500" />
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">
                余额 {formatMoney(me?.balance || 0)}
              </p>
              {!balanceEnough ? (
                <p className="mt-1 text-[10px] text-rose-500">余额不足</p>
              ) : null}
            </button>
            <button
              onClick={() => setPaymentMethod("WECHAT")}
              className={cn(
                "relative rounded-2xl border bg-white p-4 text-left transition",
                paymentMethod === "WECHAT"
                  ? "border-emerald-400 ring-2 ring-emerald-100"
                  : "border-ink-100"
              )}
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium text-ink-800">微信支付</span>
                {paymentMethod === "WECHAT" ? (
                  <Check className="ml-auto h-4 w-4 text-emerald-500" />
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-ink-400">演示环境模拟支付</p>
            </button>
          </div>
        </div>

        {membership ? (
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs font-medium text-amber-800">
                {membership.plan.name} · 本单享 {(memberRate / 10).toFixed(1)} 折
              </p>
            </div>
            <p className="mt-1 pl-5 text-[11px] leading-5 text-amber-700">
              结账后自动赠送 1 份
              {membership.plan.giftCategoryName || "饮品甜点"}
              ，赠饮不计入必点菜。
            </p>
          </div>
        ) : null}

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-ink-500">
              <span>小计</span>
              <span>{formatMoney(subtotal)}</span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>优惠券</span>
              <span className="text-emerald-600">
                -{formatMoney(couponDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>
                会员折扣
                {membership ? (
                  <span className="ml-1 text-[10px] text-ink-400">
                    {(memberRate / 10).toFixed(1)} 折
                  </span>
                ) : null}
              </span>
              <span className="text-emerald-600">
                -{formatMoney(memberDiscount)}
              </span>
            </div>
            <div className="flex justify-between text-ink-500">
              <span>积分抵扣</span>
              <span className="text-emerald-600">
                -{formatMoney(pointsDiscount)}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-ink-100 pt-2.5">
              <span className="text-sm font-medium text-ink-700">应付</span>
              <span className="text-2xl font-semibold text-ink-900">
                {formatMoney(payable)}
              </span>
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] leading-5 text-ink-400">
          结账后桌台将自动恢复空闲；积分将在结账后到账。
        </p>
      </div>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-ink-400">应付金额</p>
            <p className="text-xl font-semibold text-ink-900">
              {formatMoney(payable)}
            </p>
          </div>
          <Button
            size="lg"
            onClick={submitCheckout}
            loading={submitting}
            className="min-w-[140px]"
          >
            确认结账
          </Button>
        </div>
      </div>

      {couponOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
            onClick={() => setCouponOpen(false)}
          />
          <div className="safe-bottom relative z-10 max-h-[72vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-[#f6f7f9]">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3.5">
              <div>
                <p className="text-sm font-semibold text-ink-900">选择优惠券</p>
                <p className="mt-0.5 text-[10px] text-ink-400">
                  仅展示当前订单可用的优惠券
                </p>
              </div>
              <button
                onClick={() => setCouponOpen(false)}
                className="rounded-lg p-1.5 text-ink-400 hover:bg-ink-100"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <button
                onClick={() => {
                  setSelectedCouponId("");
                  setCouponOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border bg-white px-4 py-3.5 text-left",
                  !selectedCouponId ? "border-brand-400 ring-2 ring-brand-100" : "border-ink-100"
                )}
              >
                <span className="text-sm text-ink-700">不使用优惠券</span>
                {!selectedCouponId ? (
                  <Check className="h-4 w-4 text-brand-500" />
                ) : null}
              </button>

              {usableCoupons.map((uc) => {
                const discount = couponDiscountFor(uc.coupon, subtotal);
                const selected = selectedCouponId === uc.id;
                return (
                  <button
                    key={uc.id}
                    onClick={() => {
                      setSelectedCouponId(uc.id);
                      setCouponOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-stretch overflow-hidden rounded-xl border bg-white text-left",
                      selected ? "border-brand-400 ring-2 ring-brand-100" : "border-ink-100"
                    )}
                  >
                    <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-br from-rose-500 to-orange-400 px-2 py-4 text-white">
                      <p className="text-xl font-semibold">
                        {uc.coupon.type === "FULL_REDUCTION"
                          ? formatMoney(uc.coupon.value, false)
                          : `${(uc.coupon.discountRate || 90) / 10}折`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/80">
                        {uc.coupon.threshold > 0
                          ? `满${formatMoney(uc.coupon.threshold, false)}可用`
                          : "无门槛"}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1 px-3 py-3">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {uc.coupon.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-ink-400">
                        {uc.coupon.description || "店铺优惠券"}
                      </p>
                      <p className="mt-1.5 text-[10px] text-ink-400">
                        本单可减 {formatMoney(discount)}
                      </p>
                    </div>
                    {selected ? (
                      <div className="flex items-center pr-3">
                        <Check className="h-4 w-4 text-brand-500" />
                      </div>
                    ) : null}
                  </button>
                );
              })}

              {!usableCoupons.length ? (
                <div className="rounded-xl bg-white py-10 text-center">
                  <TicketPercent className="mx-auto h-8 w-8 text-ink-200" />
                  <p className="mt-2 text-xs text-ink-400">暂无可用优惠券</p>
                  <Link
                    href="/m/coupons"
                    className="mt-2 inline-block text-[11px] font-medium text-brand-600"
                  >
                    去领券中心看看
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
