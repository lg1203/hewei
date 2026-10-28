"use client";

import {
  ChevronLeft,
  Loader2,
  Sparkles,
  Store,
  TicketPercent
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import { postJson } from "@/lib/api";
import { cn, formatDate, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type AvailableCoupon = {
  id: string;
  title: string;
  description: string;
  type: string;
  threshold: number;
  value: number;
  discountRate: number | null;
  totalQty: number;
  claimedQty: number;
  perUserLimit: number;
  startAt: string;
  endAt: string;
  status: string;
  source: string;
  shop: { id: string; name: string } | null;
  claimedByMe: number;
};

type MyCoupon = {
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
    startAt: string;
    endAt: string;
    shop: { id: string; name: string } | null;
  };
};

type Me = {
  user: {
    id: string;
    name: string;
    role?: string;
    points: number;
    balance: number;
  };
};

function couponValue(coupon: {
  type: string;
  value: number;
  discountRate: number | null;
}) {
  return coupon.type === "FULL_REDUCTION"
    ? formatMoney(coupon.value, false)
    : `${(coupon.discountRate || 90) / 10}折`;
}

function CouponsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "mine" ? "mine" : "available";
  const [tab, setTab] = useState<"available" | "mine">(initialTab);
  const [claimingId, setClaimingId] = useState("");

  const { data: meData, loading: meLoading } = useApi<Me>("/api/auth/me");
  const me = meData?.user?.role === "USER" ? meData.user : undefined;

  const {
    data: availableData,
    loading: availableLoading,
    refresh: refreshAvailable
  } = useApi<{ coupons: AvailableCoupon[] }>("/api/user/coupons?scope=available");
  const {
    data: mineData,
    loading: mineLoading,
    refresh: refreshMine
  } = useApi<{ coupons: MyCoupon[] }>(
    me ? "/api/user/coupons?scope=mine" : null
  );

  const available = availableData?.coupons || [];
  const mine = mineData?.coupons || [];
  const loading =
    tab === "available" ? availableLoading : meLoading || mineLoading;

  async function claim(coupon: AvailableCoupon) {
    if (!me) {
      router.push(`/m/login?redirect=${encodeURIComponent("/m/coupons")}`);
      return;
    }
    setClaimingId(coupon.id);
    try {
      await postJson(`/api/user/coupons/${coupon.id}/claim`);
      toast.success("领取成功，可在「我的券」中查看");
      refreshAvailable();
      refreshMine();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "领取失败");
    } finally {
      setClaimingId("");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">领券中心</p>
        </div>
        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-xl bg-ink-50 p-1">
            {[
              { key: "available", label: "可领取" },
              { key: "mine", label: "我的券" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as "available" | "mine")}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-medium transition",
                  tab === item.key
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-4">
        {!me && !meLoading ? (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-2.5">
            <p className="text-[11px] text-brand-700">
              登录后可领取优惠券，结账时自动可用
            </p>
            <Link
              href={`/m/login?redirect=${encodeURIComponent("/m/coupons")}`}
              className="rounded-full bg-brand-500 px-3 py-1 text-[10px] font-medium text-white"
            >
              去登录
            </Link>
          </div>
        ) : null}

        {loading ? (
          <PageLoading label="正在加载优惠券" />
        ) : tab === "available" ? (
          available.length ? (
            <div className="space-y-3">
              {available.map((coupon) => {
                const reachedLimit = coupon.claimedByMe >= coupon.perUserLimit;
                const soldOut = coupon.claimedQty >= coupon.totalQty;
                return (
                  <div
                    key={coupon.id}
                    className="flex overflow-hidden rounded-2xl bg-white shadow-card"
                  >
                    <div className="relative flex w-[104px] shrink-0 flex-col items-center justify-center bg-gradient-to-br from-rose-500 to-orange-400 px-2 py-5 text-white">
                      <p className="text-2xl font-semibold leading-none">
                        {couponValue(coupon)}
                      </p>
                      <p className="mt-1.5 text-[10px] text-white/80">
                        {coupon.threshold > 0
                          ? `满${formatMoney(coupon.threshold, false)}可用`
                          : "无门槛"}
                      </p>
                      <span className="mt-2 rounded-full bg-white/20 px-2 py-0.5 text-[9px]">
                        {coupon.type === "FULL_REDUCTION" ? "满减券" : "折扣券"}
                      </span>
                      <div className="absolute -right-1 top-0 h-full w-2">
                        <div className="h-full w-2 rounded-full bg-[#f6f7f9]" />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between px-3.5 py-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {coupon.title}
                        </p>
                        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-ink-400">
                          {coupon.description || "店铺优惠券"}
                        </p>
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-ink-400">
                          <Store className="h-2.5 w-2.5" />
                          {coupon.shop?.name || "全平台通用"}
                          <span className="text-ink-200">|</span>
                          {formatDate(coupon.endAt)} 前有效
                        </p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] text-ink-400">
                          {coupon.claimedByMe > 0
                            ? `已领 ${coupon.claimedByMe}/${coupon.perUserLimit}`
                            : `每人限领 ${coupon.perUserLimit} 张`}
                        </span>
                        <Button
                          size="sm"
                          variant={reachedLimit || soldOut ? "outline" : "primary"}
                          disabled={reachedLimit || soldOut}
                          loading={claimingId === coupon.id}
                          onClick={() => claim(coupon)}
                        >
                          {soldOut
                            ? "已领完"
                            : reachedLimit
                              ? "已领取"
                              : me
                                ? "立即领取"
                                : "登录领取"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl bg-white shadow-card">
              <EmptyState
                icon={<TicketPercent className="h-5 w-5" />}
                title="暂无可领取的优惠券"
                description="店铺上新优惠券后会展示在这里"
              />
            </div>
          )
        ) : mine.length ? (
          <div className="space-y-3">
            {mine.map((item) => {
              const expired =
                item.status === "UNUSED" &&
                new Date(item.coupon.endAt).getTime() < Date.now();
              const usable = item.status === "UNUSED" && !expired;
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex overflow-hidden rounded-2xl bg-white shadow-card",
                    !usable && "opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "flex w-[104px] shrink-0 flex-col items-center justify-center px-2 py-5 text-white",
                      usable
                        ? "bg-gradient-to-br from-rose-500 to-orange-400"
                        : "bg-gradient-to-br from-ink-400 to-ink-500"
                    )}
                  >
                    <p className="text-2xl font-semibold leading-none">
                      {couponValue(item.coupon)}
                    </p>
                    <p className="mt-1.5 text-[10px] text-white/80">
                      {item.coupon.threshold > 0
                        ? `满${formatMoney(item.coupon.threshold, false)}可用`
                        : "无门槛"}
                    </p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-between px-3.5 py-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {item.coupon.title}
                        </p>
                        <Badge tone={usable ? "green" : "slate"}>
                          {item.status === "USED"
                            ? "已使用"
                            : expired
                              ? "已过期"
                              : "未使用"}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-[10px] text-ink-400">
                        {item.coupon.description || "店铺优惠券"}
                      </p>
                      <p className="mt-1.5 text-[10px] text-ink-400">
                        {item.coupon.shop?.name || "全平台通用"} ·{" "}
                        {formatDate(item.coupon.startAt)} ~{" "}
                        {formatDate(item.coupon.endAt)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-ink-400">
                        {item.usedAt
                          ? `使用于 ${formatDate(item.usedAt)}`
                          : `领取于 ${formatDate(item.claimedAt)}`}
                      </span>
                      {usable ? (
                        <Link
                          href="/m"
                          className="text-[11px] font-medium text-brand-600"
                        >
                          去使用
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-card">
            <EmptyState
              icon={<TicketPercent className="h-5 w-5" />}
              title="还没有优惠券"
              description="去「可领取」看看有哪些优惠"
              action={
                <Button onClick={() => setTab("available")}>去领券</Button>
              }
            />
          </div>
        )}

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-3 text-[10px] leading-5 text-amber-700">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          优惠券在结账时选择使用，每笔账单限用一张；积分抵扣与优惠券可同时使用。
        </div>
      </div>
    </div>
  );
}

export default function CouponsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <CouponsContent />
    </Suspense>
  );
}
