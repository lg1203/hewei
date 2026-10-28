"use client";

import {
  BadgeCheck,
  CalendarClock,
  Check,
  ChevronLeft,
  CreditCard,
  Crown,
  Gift,
  RefreshCw,
  Sparkles,
  TicketPercent,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";
import { patchJson, postJson } from "@/lib/api";
import {
  BILLING_CYCLE_LABEL,
  MEMBERSHIP_STATUS_LABEL,
  MEMBERSHIP_STATUS_STYLE,
  MEMBERSHIP_TX_TYPE_LABEL
} from "@/lib/constants";
import { cn, formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Plan = {
  id: string;
  name: string;
  description: string;
  billingCycle: string;
  price: number;
  originalPrice: number;
  firstMonthFree: boolean;
  trialDays: number;
  discountRate: number;
  freeDrink: boolean;
  giftCategoryName: string;
  status: string;
  sort: number;
};

type Membership = {
  id: string;
  status: string;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  trialUsed: boolean;
  cancelledAt: string | null;
  plan: Plan;
};

type Transaction = {
  id: string;
  planName: string;
  type: string;
  amount: number;
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string;
  note: string;
  createdAt: string;
};

type Overview = {
  membership: Membership | null;
  plans: Plan[];
  transactions: Transaction[];
  trialEligible: boolean;
  user: {
    id: string;
    name: string;
    balance: number;
    points: number;
    hasUsedMembershipTrial: boolean;
  };
};

export default function MobileMembershipPage() {
  const router = useRouter();
  const { data, loading, error, refresh } = useApi<Overview>(
    "/api/user/membership"
  );
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"BALANCE" | "WECHAT">(
    "BALANCE"
  );
  const [submitting, setSubmitting] = useState(false);
  const [updatingRenew, setUpdatingRenew] = useState(false);

  const membership = data?.membership || null;
  const plans = data?.plans || [];
  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === selectedPlanId) || plans[0] || null,
    [plans, selectedPlanId]
  );
  const trialEligible = Boolean(data?.trialEligible);
  const willUseTrial = Boolean(
    selectedPlan?.firstMonthFree && trialEligible && !membership
  );
  const payable = willUseTrial ? 0 : selectedPlan?.price || 0;
  const discountLabel = membership
    ? `${(membership.plan.discountRate / 10).toFixed(1)} 折`
    : "";

  async function subscribe() {
    if (!selectedPlan) {
      toast.error("请选择会员方案");
      return;
    }
    if (paymentMethod === "BALANCE" && (data?.user.balance || 0) < payable) {
      toast.error("余额不足，请先充值或选择微信支付");
      return;
    }
    setSubmitting(true);
    try {
      const res = await postJson<{
        trial: boolean;
        charged: number;
        membership: Membership;
      }>("/api/user/membership", {
        planId: selectedPlan.id,
        paymentMethod
      });
      toast.success(
        res.trial
          ? "首月 0 元体验已开通，会员权益立即生效"
          : `开通成功，已支付 ${formatMoney(res.charged)}`
      );
      setSelectedPlanId("");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "开通失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleAutoRenew(autoRenew: boolean) {
    setUpdatingRenew(true);
    try {
      await patchJson("/api/user/membership", { autoRenew });
      toast.success(
        autoRenew
          ? "已恢复自动续费，会员权益将继续保持"
          : "已关闭自动续费，会员权益保留至本周期结束"
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "操作失败");
    } finally {
      setUpdatingRenew(false);
    }
  }

  if (loading) return <PageLoading label="正在加载会员信息" />;

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
          <Crown className="h-8 w-8" />
        </div>
        <p className="mt-4 text-sm font-semibold text-ink-900">会员中心</p>
        <p className="mt-1 text-xs leading-5 text-ink-400">{error}</p>
        <Button
          className="mt-5"
          onClick={() =>
            router.push(
              `/m/login?redirect=${encodeURIComponent("/m/membership")}`
            )
          }
        >
          去登录
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m/me")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">会员中心</p>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink-900 via-ink-800 to-brand-700 p-5 text-white shadow-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="flex items-center gap-1.5 text-[11px] text-white/70">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                稻香会员
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">
                {membership ? membership.plan.name : "开通会员，吃得更好更省"}
              </p>
              <p className="mt-1 text-[11px] text-white/60">
                {membership
                  ? `${MEMBERSHIP_STATUS_LABEL[membership.status] || membership.status} · 有效期至 ${formatDate(
                      membership.currentPeriodEnd
                    )}`
                  : "首月 0 元体验，随时可退订"}
              </p>
            </div>
            {membership ? (
              <Badge
                tone="amber"
                className={cn(
                  "ring-white/30",
                  MEMBERSHIP_STATUS_STYLE[membership.status]
                )}
              >
                {MEMBERSHIP_STATUS_LABEL[membership.status] || membership.status}
              </Badge>
            ) : (
              <Sparkles className="h-6 w-6 text-amber-300" />
            )}
          </div>

          {membership ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 text-[11px]">
                <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
                  <p className="text-white/60">结账折扣</p>
                  <p className="mt-1 text-base font-semibold">{discountLabel}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
                  <p className="text-white/60">每次就餐赠饮</p>
                  <p className="mt-1 truncate text-base font-semibold">
                    {membership.plan.freeDrink
                      ? `1 份${membership.plan.giftCategoryName}`
                      : "暂无"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-[11px] backdrop-blur">
                <span className="text-white/70">
                  自动续费
                  <span className="ml-1 font-medium text-white">
                    {membership.autoRenew ? "已开启" : "已关闭"}
                  </span>
                  <span className="ml-2 text-white/50">
                    {BILLING_CYCLE_LABEL[membership.plan.billingCycle] ||
                      membership.plan.billingCycle}
                    · {formatMoney(membership.plan.price)}
                  </span>
                </span>
                <button
                  onClick={() => toggleAutoRenew(!membership.autoRenew)}
                  disabled={updatingRenew}
                  className="rounded-lg bg-white/15 px-2.5 py-1 font-medium text-white transition hover:bg-white/25 disabled:opacity-50"
                >
                  {membership.autoRenew ? "退订" : "恢复续费"}
                </button>
              </div>
              {!membership.autoRenew ? (
                <p className="mt-2 text-[10px] leading-5 text-amber-200">
                  已关闭自动续费，本周期结束前权益仍然有效，到期后不会扣费。
                </p>
              ) : null}
            </>
          ) : (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
                <p className="text-sm font-semibold text-amber-300">
                  {plans.length
                    ? `低至 ${(
                        Math.min(...plans.map((plan) => plan.discountRate)) / 10
                      ).toFixed(1)} 折`
                    : "会员折扣"}
                </p>
                <p className="mt-1 text-white/60">结账立减</p>
              </div>
              <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
                <p className="text-sm font-semibold text-amber-300">每次赠饮</p>
                <p className="mt-1 text-white/60">就餐即送</p>
              </div>
              <div className="rounded-xl bg-white/10 px-2 py-2.5 backdrop-blur">
                <p className="text-sm font-semibold text-amber-300">随时退订</p>
                <p className="mt-1 text-white/60">不自动扣费</p>
              </div>
            </div>
          )}
        </div>

        {membership ? (
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
            <p className="text-xs font-medium text-ink-500">本周期权益</p>
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                  <TicketPercent className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">结账折扣</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    优惠券之后再享 {discountLabel}，可与积分抵扣叠加
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">每次就餐赠饮</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {membership.plan.freeDrink
                      ? `结账时自动赠送 1 份${membership.plan.giftCategoryName}`
                      : "当前方案不含赠饮"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                  <CalendarClock className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-800">
                    {BILLING_CYCLE_LABEL[membership.plan.billingCycle] ||
                      membership.plan.billingCycle}
                    会员
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-400">
                    {formatDate(membership.currentPeriodStart)} 至{" "}
                    {formatDate(membership.currentPeriodEnd)}，到期后按{" "}
                    {formatMoney(membership.plan.price)} 续费
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-ink-900">选择方案</p>
              {trialEligible ? (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  新会员首月 0 元
                </span>
              ) : null}
            </div>

            <div className="mt-2 space-y-3">
              {plans.length ? (
                plans.map((plan) => {
                  const active = selectedPlan?.id === plan.id;
                  const trial = plan.firstMonthFree && trialEligible;
                  const showOriginal =
                    plan.originalPrice > 0 && plan.originalPrice > plan.price;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={cn(
                        "w-full rounded-2xl border bg-white p-4 text-left shadow-card transition",
                        active
                          ? "border-brand-400 ring-2 ring-brand-100"
                          : "border-ink-100"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-ink-900">
                              {plan.name}
                            </p>
                            <Badge tone="brand">
                              {BILLING_CYCLE_LABEL[plan.billingCycle] ||
                                plan.billingCycle}
                            </Badge>
                            {trial ? <Badge tone="amber">首月 0 元</Badge> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-ink-400">
                            {plan.description ||
                              `结账 ${(plan.discountRate / 10).toFixed(
                                1
                              )} 折${plan.freeDrink ? `，每次赠 1 份${plan.giftCategoryName}` : ""}`}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-ink-500">
                            <span className="flex items-center gap-1">
                              <TicketPercent className="h-3 w-3 text-brand-400" />
                              {(plan.discountRate / 10).toFixed(1)} 折
                            </span>
                            <span className="flex items-center gap-1">
                              <Gift className="h-3 w-3 text-emerald-400" />
                              {plan.freeDrink
                                ? `赠${plan.giftCategoryName}`
                                : "无赠饮"}
                            </span>
                            <span className="flex items-center gap-1">
                              <CalendarClock className="h-3 w-3 text-amber-400" />
                              {plan.trialDays} 天体验
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-semibold text-ink-900">
                            {trial ? "¥0" : formatMoney(plan.price)}
                          </p>
                          {showOriginal ? (
                            <p className="text-[10px] text-ink-400 line-through">
                              {formatMoney(plan.originalPrice)}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[10px] text-ink-400">
                            {trial ? "体验后" : "每"}
                            {plan.billingCycle === "YEARLY" ? "年" : "月"}
                            {trial ? ` ${formatMoney(plan.price)}` : ""}
                          </p>
                        </div>
                      </div>
                      {active ? (
                        <div className="mt-3 flex items-center gap-1 border-t border-ink-100 pt-2.5 text-[11px] font-medium text-brand-600">
                          <Check className="h-3.5 w-3.5" />
                          已选择
                        </div>
                      ) : null}
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-white px-4 py-8 text-center shadow-card">
                  <Crown className="mx-auto h-6 w-6 text-ink-300" />
                  <p className="mt-2 text-xs text-ink-400">
                    暂无可用会员方案，请稍后再来看看
                  </p>
                </div>
              )}
            </div>

            {plans.length ? (
              <>
                <div className="mt-5">
                  <p className="mb-2 px-1 text-xs font-medium text-ink-500">
                    支付方式
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setPaymentMethod("BALANCE")}
                      className={cn(
                        "rounded-2xl border bg-white p-3.5 text-left transition",
                        paymentMethod === "BALANCE"
                          ? "border-brand-400 ring-2 ring-brand-100"
                          : "border-ink-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-brand-500" />
                        <span className="text-sm font-medium text-ink-800">
                          余额支付
                        </span>
                        {paymentMethod === "BALANCE" ? (
                          <Check className="ml-auto h-4 w-4 text-brand-500" />
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[10px] text-ink-400">
                        余额 {formatMoney(data?.user.balance || 0)}
                      </p>
                    </button>
                    <button
                      onClick={() => setPaymentMethod("WECHAT")}
                      className={cn(
                        "rounded-2xl border bg-white p-3.5 text-left transition",
                        paymentMethod === "WECHAT"
                          ? "border-emerald-400 ring-2 ring-emerald-100"
                          : "border-ink-100"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium text-ink-800">
                          微信支付
                        </span>
                        {paymentMethod === "WECHAT" ? (
                          <Check className="ml-auto h-4 w-4 text-emerald-500" />
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[10px] text-ink-400">
                        演示环境模拟支付
                      </p>
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-ink-500">
                      <span>方案</span>
                      <span className="text-ink-800">{selectedPlan?.name}</span>
                    </div>
                    <div className="flex justify-between text-ink-500">
                      <span>计费周期</span>
                      <span className="text-ink-800">
                        {selectedPlan
                          ? BILLING_CYCLE_LABEL[selectedPlan.billingCycle] ||
                            selectedPlan.billingCycle
                          : "-"}
                      </span>
                    </div>
                    {willUseTrial ? (
                      <div className="flex justify-between text-amber-600">
                        <span>新会员首月体验</span>
                        <span>-{formatMoney(selectedPlan?.price || 0)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-end justify-between border-t border-ink-100 pt-2.5">
                      <span className="text-sm font-medium text-ink-700">
                        本次支付
                      </span>
                      <span className="text-xl font-semibold text-ink-900">
                        {formatMoney(payable)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-ink-400">
                    {willUseTrial
                      ? `0 元体验 ${selectedPlan?.trialDays || 30} 天，体验结束后按 ${formatMoney(
                          selectedPlan?.price || 0
                        )}/${
                          selectedPlan?.billingCycle === "YEARLY" ? "年" : "月"
                        } 自动续费，可随时退订。`
                      : `开通后立即生效，到期按 ${formatMoney(
                          selectedPlan?.price || 0
                        )}/${
                          selectedPlan?.billingCycle === "YEARLY" ? "年" : "月"
                        } 自动续费，可随时退订。`}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    size="lg"
                    onClick={subscribe}
                    loading={submitting}
                  >
                    {willUseTrial
                      ? "0 元开通体验"
                      : `立即支付 ${formatMoney(payable)}`}
                  </Button>
                </div>
              </>
            ) : null}
          </>
        )}

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-ink-900">会员记录</p>
            {membership ? (
              <Link
                href="/m/me/transactions"
                className="flex items-center gap-0.5 text-[11px] text-ink-400"
              >
                <RefreshCw className="h-3 w-3" />
                全部记录
              </Link>
            ) : null}
          </div>
          <div className="mt-2 overflow-hidden rounded-2xl bg-white shadow-card">
            {data?.transactions.length ? (
              <div className="divide-y divide-ink-100">
                {data.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                      {tx.type === "TRIAL" ? (
                        <Sparkles className="h-4 w-4" />
                      ) : tx.type === "RENEWAL" ? (
                        <RefreshCw className="h-4 w-4" />
                      ) : (
                        <BadgeCheck className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {MEMBERSHIP_TX_TYPE_LABEL[tx.type] || tx.type} ·{" "}
                        {tx.planName}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {formatDateTime(tx.createdAt)} ·{" "}
                        {BILLING_CYCLE_LABEL[tx.billingCycle] || tx.billingCycle}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink-900">
                        {tx.amount > 0 ? formatMoney(tx.amount) : "¥0"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-ink-400">
                        {tx.paymentMethod === "FREE"
                          ? "免费"
                          : tx.paymentMethod === "WECHAT"
                            ? "微信"
                            : tx.paymentMethod === "BALANCE"
                              ? "余额"
                              : tx.paymentMethod}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <Crown className="mx-auto h-6 w-6 text-ink-300" />
                <p className="mt-2 text-xs text-ink-400">
                  暂无会员记录，开通后在这里查看
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[10px] leading-5 text-ink-400">
          会员权益仅限本人使用；退订后权益保留至本周期结束，到期不再自动扣费。
        </p>
      </div>
    </div>
  );
}
