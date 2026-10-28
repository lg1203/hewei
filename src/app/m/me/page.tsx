"use client";

import {
  ChevronRight,
  Coins,
  CreditCard,
  Crown,
  LogOut,
  ReceiptText,
  Sparkles,
  TicketPercent,
  UserRound,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageLoading } from "@/components/ui/Spinner";
import { postJson } from "@/lib/api";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE, POINT_TYPE_LABEL } from "@/lib/constants";
import { cn, formatDate, formatDateTime, formatMoney, maskPhone } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type ProfileResponse = {
  user: {
    id: string;
    name: string;
    phone: string;
    balance: number;
    points: number;
    status: string;
    createdAt: string;
    _count: { coupons: number; orders: number };
  };
  membership: {
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
  } | null;
  trialEligible: boolean;
  unusedCoupons: number;
  recentOrders: {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    createdAt: string;
    shop: { name: string };
    items: { id: string; dishName: string; quantity: number }[];
  }[];
  pointTx: {
    id: string;
    amount: number;
    type: string;
    note: string;
    createdAt: string;
  }[];
  balanceTx: {
    id: string;
    amount: number;
    type: string;
    note: string;
    createdAt: string;
  }[];
};

export default function MobileMePage() {
  const router = useRouter();
  const { data, loading, error } = useApi<ProfileResponse>("/api/user/profile");

  async function logout() {
    try {
      await postJson("/api/auth/logout");
      toast.success("已退出登录");
      router.replace("/m");
      router.refresh();
    } catch {
      toast.error("退出失败");
    }
  }

  if (loading) return <PageLoading label="正在加载个人中心" />;

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-brand-500 to-orange-400 px-5 pb-16 pt-10 text-white">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <UserRound className="h-8 w-8" />
          </div>
          <h1 className="mt-4 text-xl font-semibold">登录禾味会员</h1>
          <p className="mt-1 text-xs text-white/70">
            登录后可查看订单、积分、余额与优惠券
          </p>
        </div>
        <div className="-mt-8 px-4">
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <p className="text-sm font-semibold text-ink-900">还没有登录</p>
            <p className="mt-1 text-xs text-ink-400">
              {error || "使用手机号登录或注册一个新账号"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Link href={`/m/login?redirect=${encodeURIComponent("/m/me")}`}>
                <Button className="w-full" size="lg">
                  登录
                </Button>
              </Link>
              <Link href={`/m/login?redirect=${encodeURIComponent("/m/me")}`}>
                <Button variant="outline" size="lg" className="w-full">
                  注册
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { user } = data;

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-brand-500 to-orange-400 px-5 pb-20 pt-8 text-white">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-xl font-semibold text-brand-600 shadow-lg shadow-brand-900/10">
            {user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {user.name}
              </h1>
              {data.membership ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold text-ink-900">
                  <Crown className="h-3 w-3" />
                  {data.membership.plan.name}
                </span>
              ) : (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px]">
                  会员
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-white/70">{maskPhone(user.phone)}</p>
            <p className="mt-1 text-[10px] text-white/50">
              {formatDateTime(user.createdAt)} 加入
            </p>
          </div>
        </div>
      </div>

      <div className="-mt-12 px-4">
        <div className="grid grid-cols-3 divide-x divide-ink-100 rounded-2xl bg-white py-4 shadow-card">
          <Link href="/m/me/transactions?tab=balance" className="text-center">
            <p className="text-lg font-semibold text-ink-900">
              {formatMoney(user.balance)}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">余额</p>
          </Link>
          <Link href="/m/me/transactions?tab=points" className="text-center">
            <p className="text-lg font-semibold text-violet-600">
              {user.points.toLocaleString()}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">积分</p>
          </Link>
          <Link href="/m/coupons?tab=mine" className="text-center">
            <p className="text-lg font-semibold text-rose-500">
              {data.unusedCoupons}
            </p>
            <p className="mt-0.5 text-[10px] text-ink-400">可用券</p>
          </Link>
        </div>

        <Link
          href="/m/membership"
          className="mt-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-brand-700 px-4 py-3.5 text-white shadow-card transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold">
                {data.membership
                  ? `${data.membership.plan.name} · ${(
                      data.membership.plan.discountRate / 10
                    ).toFixed(1)} 折`
                  : data.trialEligible
                    ? "开通会员 · 首月 0 元体验"
                    : "开通会员 · 享结账折扣"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/60">
                {data.membership
                  ? `有效期至 ${formatDate(
                      data.membership.currentPeriodEnd
                    )} · ${data.membership.autoRenew ? "自动续费中" : "已退订"}`
                  : "结账打折 · 每次就餐赠饮 · 随时退订"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
        </Link>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-white p-4 shadow-card">
          {[
            { href: "/m/orders", label: "我的订单", icon: ReceiptText },
            { href: "/m/coupons?tab=mine", label: "优惠券", icon: TicketPercent },
            {
              href: "/m/me/transactions?tab=points",
              label: "积分明细",
              icon: Sparkles
            },
            {
              href: "/m/me/transactions?tab=balance",
              label: "余额明细",
              icon: Wallet
            }
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1.5 rounded-xl py-1 text-center transition active:bg-ink-50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" />
              </div>
              <span className="text-[10px] text-ink-500">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-4 rounded-2xl bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
            <p className="text-sm font-semibold text-ink-900">最近订单</p>
            <Link
              href="/m/orders"
              className="flex items-center gap-0.5 text-[11px] text-ink-400"
            >
              全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {data.recentOrders.length ? (
            <div className="divide-y divide-ink-100">
              {data.recentOrders.map((order) => (
                <Link
                  key={order.id}
                  href="/m/orders"
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-ink-500">
                    <ReceiptText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink-800">
                      {order.shop.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-ink-400">
                      {order.items
                        .slice(0, 2)
                        .map((item) => item.dishName)
                        .join("、") || "订单"}
                      {order.items.length > 2 ? "…" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-ink-900">
                      {formatMoney(order.total)}
                    </p>
                    <span
                      className={cn(
                        "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-medium ring-1 ring-inset",
                        ORDER_STATUS_STYLE[order.status] || ""
                      )}
                    >
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-ink-400">还没有订单，去点一餐吧</p>
              <Link href="/m" className="mt-2 inline-block text-[11px] font-medium text-brand-600">
                去点餐
              </Link>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white shadow-card">
          <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3.5">
            <p className="text-sm font-semibold text-ink-900">最近积分</p>
            <Link
              href="/m/me/transactions?tab=points"
              className="flex items-center gap-0.5 text-[11px] text-ink-400"
            >
              全部
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {data.pointTx.length ? (
            <div className="divide-y divide-ink-100">
              {data.pointTx.slice(0, 4).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
                    <Coins className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-ink-700">
                      {tx.note || POINT_TYPE_LABEL[tx.type] || "积分变动"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {formatDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      tx.amount > 0 ? "text-emerald-600" : "text-rose-500"
                    )}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-8 text-center text-xs text-ink-400">
              暂无积分记录
            </p>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-ink-500">
            <span className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-ink-400" />
              会员余额
            </span>
            <span className="font-semibold text-ink-900">
              {formatMoney(user.balance)}
            </span>
          </div>
          <p className="mt-2 text-[10px] leading-5 text-ink-400">
            余额可通过平台充值，结账时可直接抵扣消费金额。
          </p>
        </div>

        <Button
          variant="outline"
          size="lg"
          className="mt-4 w-full text-rose-500 hover:border-rose-200 hover:bg-rose-50"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          退出登录
        </Button>

        <p className="py-6 text-center text-[10px] text-ink-300">
          禾味点餐 · 会员中心
        </p>
      </div>
    </div>
  );
}
