"use client";

import {
  ChefHat,
  ChevronRight,
  Crown,
  MapPin,
  Megaphone,
  QrCode,
  Sparkles,
  TicketPercent,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import { formatDate, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Shop = {
  id: string;
  name: string;
  address: string;
  description: string;
  announcement: string;
  businessHours: string;
  cover: string;
  pointsEarnRate: number;
  pointsRedeemRate: number;
  _count: { dishes: number; tables: number };
};

type Me = {
  user: {
    id: string;
    name: string;
    phone: string;
    role?: string;
    balance: number;
    points: number;
    membership?: {
      id: string;
      status: string;
      currentPeriodEnd: string;
      autoRenew: boolean;
      plan: {
        name: string;
        discountRate: number;
        freeDrink: boolean;
        giftCategoryName: string;
      };
    } | null;
  };
};

type Activity = {
  id: string;
  title: string;
  subtitle: string;
  poster: string;
  link: string;
  startAt: string | null;
  endAt: string | null;
};

export default function MobileHomePage() {
  const { data: shopData, loading } = useApi<{ shops: Shop[] }>("/api/public/shops");
  const { data: meData } = useApi<Me>("/api/auth/me");
  const { data: activityData } = useApi<{ activities: Activity[] }>(
    "/api/public/activities"
  );

  const shops = shopData?.shops || [];
  const me = meData?.user?.role === "USER" ? meData.user : undefined;
  const activities = activityData?.activities || [];

  return (
    <div>
      <header className="bg-gradient-to-br from-brand-500 via-brand-500 to-orange-400 px-4 pb-16 pt-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <ChefHat className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">禾味点餐</p>
              <p className="text-[10px] tracking-[0.16em] text-white/60">
                HEWEI DINING
              </p>
            </div>
          </div>
          {me ? (
            <Link
              href="/m/me"
              className="flex items-center gap-2 rounded-full bg-white/15 py-1 pl-1 pr-3 backdrop-blur"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-brand-600">
                {me.name.slice(0, 1)}
              </span>
              <span className="max-w-[80px] truncate text-xs font-medium">
                {me.name}
              </span>
            </Link>
          ) : (
            <Link
              href="/m/login"
              className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium backdrop-blur"
            >
              登录 / 注册
            </Link>
          )}
        </div>

        <div className="mt-7">
          <p className="text-xs text-white/70">
            {me ? `你好，${me.name}` : "扫码点餐，积分当钱花"}
          </p>
          <h1 className="mt-1.5 text-[26px] font-semibold leading-tight tracking-tight">
            今天想吃点什么？
          </h1>
        </div>
      </header>

      <main className="-mt-10 px-4">
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/m/scan"
            className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-card transition active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shadow-sm shadow-brand-500/30">
              <QrCode className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-900">扫码点餐</p>
            <p className="mt-0.5 text-[11px] text-ink-400">扫描桌码，立即开桌</p>
            <ChevronRight className="absolute right-3 top-4 h-4 w-4 text-ink-300" />
          </Link>
          <Link
            href="/m/coupons"
            className="group relative overflow-hidden rounded-2xl bg-white p-4 shadow-card transition active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500 text-white shadow-sm shadow-violet-500/30">
              <TicketPercent className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-ink-900">领券中心</p>
            <p className="mt-0.5 text-[11px] text-ink-400">优惠券天天领</p>
            <ChevronRight className="absolute right-3 top-4 h-4 w-4 text-ink-300" />
          </Link>
        </div>

        <Link
          href="/m/membership"
          className="mt-3 flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-r from-ink-900 via-ink-800 to-brand-700 px-4 py-3.5 text-white shadow-card transition active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Crown className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <p className="text-xs font-semibold">
                {me?.membership
                  ? `${me.membership.plan.name} · ${(
                      me.membership.plan.discountRate / 10
                    ).toFixed(1)} 折`
                  : "开通会员 · 首月 0 元体验"}
              </p>
              <p className="mt-0.5 text-[10px] text-white/60">
                {me?.membership
                  ? `有效期至 ${formatDate(me.membership.currentPeriodEnd)}${
                      me.membership.autoRenew ? " · 自动续费中" : " · 已退订"
                    }`
                  : "结账打折 · 每次就餐赠饮 · 随时退订"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/50" />
        </Link>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-card">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-500">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-800">会员积分</p>
              <p className="text-[10px] text-ink-400">消费 1 元 = 1 积分</p>
            </div>
          </div>
          {me ? (
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {me.points.toLocaleString()}
                </p>
                <p className="text-[10px] text-ink-400">积分</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {formatMoney(me.balance)}
                </p>
                <p className="text-[10px] text-ink-400">余额</p>
              </div>
            </div>
          ) : (
            <Link
              href="/m/login"
              className="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-medium text-brand-600"
            >
              登录查看
            </Link>
          )}
        </div>

        {activities.length ? (
          <section className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-ink-900">精彩活动</h2>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  限时优惠与会员福利
                </p>
              </div>
              <Link
                href="/m/activities"
                className="flex items-center gap-0.5 text-[11px] font-medium text-brand-600"
              >
                查看全部
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
              {activities.map((activity) => (
                <Link
                  key={activity.id}
                  href={`/m/activities/${activity.id}`}
                  className="relative block h-[150px] w-[260px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-orange-400 to-amber-300 shadow-card transition active:scale-[0.98]"
                >
                  {activity.poster ? (
                    <img
                      src={activity.poster}
                      alt={activity.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/10 to-transparent" />
                  <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-medium text-white backdrop-blur">
                    <Megaphone className="h-2.5 w-2.5" />
                    活动
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3.5">
                    <p className="line-clamp-1 text-sm font-semibold text-white">
                      {activity.title}
                    </p>
                    <p className="mt-1 line-clamp-1 text-[10px] text-white/75">
                      {activity.subtitle || "点击查看活动详情"}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">附近门店</h2>
            <p className="mt-0.5 text-[11px] text-ink-400">选择门店开始点餐</p>
          </div>
          <span className="text-[11px] text-ink-400">{shops.length} 家营业中</span>
        </div>

        {loading ? (
          <PageLoading label="正在加载门店" />
        ) : shops.length ? (
          <div className="mt-3 space-y-4">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/m/shop/${shop.id}`}
                className="block overflow-hidden rounded-2xl bg-white shadow-card transition active:scale-[0.99]"
              >
                <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-brand-100 to-ink-100">
                  {shop.cover ? (
                    <img
                      src={shop.cover}
                      alt={shop.name}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-brand-300">
                      <ChefHat className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-900/55 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                    <div>
                      <p className="text-lg font-semibold text-white drop-shadow">
                        {shop.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-white/75">
                        {shop.businessHours} · {shop._count.dishes} 道菜
                      </p>
                    </div>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-brand-600 backdrop-blur">
                      去点餐
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="line-clamp-2 text-xs leading-5 text-ink-500">
                    {shop.description || "欢迎光临，扫码点餐更便捷。"}
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-1 text-[11px] text-ink-400">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{shop.address || "门店地址待完善"}</span>
                    </p>
                    <div className="flex shrink-0 items-center gap-2 text-[10px] text-ink-400">
                      <span className="flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-600">
                        <Sparkles className="h-2.5 w-2.5" />
                        积分抵现
                      </span>
                      <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
                        <Wallet className="h-2.5 w-2.5" />
                        余额支付
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white shadow-card">
            <EmptyState
              title="暂无营业中的门店"
              description="门店上线后会在这里展示"
            />
          </div>
        )}

        <p className="py-6 text-center text-[10px] text-ink-300">
          禾味点餐 · 让每一餐都简单一点
        </p>
      </main>
    </div>
  );
}
