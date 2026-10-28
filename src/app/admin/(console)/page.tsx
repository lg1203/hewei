"use client";

import {
  ArrowUpRight,
  ReceiptText,
  Store,
  Users,
  Wallet,
  TrendingUp,
  TicketPercent
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { PageLoading } from "@/components/ui/Spinner";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type StatsResponse = {
  stats: {
    merchantCount: number;
    activeMerchantCount: number;
    userCount: number;
    shopCount: number;
    activeCouponCount: number;
    todayOrderCount: number;
    todayPaidCount: number;
    todayRevenue: number;
    totalBalance: number;
    totalPoints: number;
  };
  days: { date: string; revenue: number; orders: number }[];
  topShops: { name: string; revenue: number }[];
  recentOrders: {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    createdAt: string;
    shop: { name: string };
    table: { name: string } | null;
    user: { name: string } | null;
  }[];
};

export default function AdminDashboardPage() {
  const { data, loading, error } = useApi<StatsResponse>("/api/admin/stats");

  if (loading) return <PageLoading label="正在加载平台数据" />;
  if (error || !data) {
    return (
      <EmptyState
        title="数据加载失败"
        description={error || "请刷新页面重试"}
        action={
          <Button variant="outline" onClick={() => window.location.reload()}>
            重新加载
          </Button>
        }
      />
    );
  }

  const { stats } = data;

  return (
    <div>
      <PageHeader
        title="经营概览"
        description="全平台商户、会员与交易数据一览。"
        action={
          <Link href="/admin/merchants">
            <Button variant="outline">
              <Store className="h-4 w-4" />
              管理商户
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今日营业额"
          value={formatMoney(stats.todayRevenue)}
          hint={`${stats.todayPaidCount} 笔已结账订单`}
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="入驻商户"
          value={stats.merchantCount}
          hint={`${stats.activeMerchantCount} 家正常营业`}
          icon={<Store className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="注册会员"
          value={stats.userCount}
          hint={`会员余额 ${formatMoney(stats.totalBalance)}`}
          icon={<Users className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="今日订单"
          value={stats.todayOrderCount}
          hint={`${stats.activeCouponCount} 张优惠券进行中`}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>近 7 日交易趋势</CardTitle>
              <p className="mt-1 text-xs text-ink-400">按已结账订单统计</p>
            </div>
            <Badge tone="green">
              <TrendingUp className="mr-1 h-3 w-3" />
              实时
            </Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    tickFormatter={(v) => `¥${v / 100}`}
                  />
                  <Tooltip
                    cursor={{ stroke: "#fdba74", strokeDasharray: "4 4" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12
                    }}
                    formatter={(value: number) => [formatMoney(value), "营业额"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#revenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>今日门店排行</CardTitle>
            <Link
              href="/admin/merchants"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              查看全部
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {data.topShops.length ? (
              <div className="space-y-4">
                {data.topShops.map((shop, index) => (
                  <div key={shop.name} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ink-50 text-xs font-semibold text-ink-500">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-800">
                        {shop.name}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full rounded-full bg-brand-400"
                          style={{
                            width: `${Math.max(
                              6,
                              (shop.revenue / data.topShops[0].revenue) * 100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-ink-800">
                      {formatMoney(shop.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="今日暂无交易"
                description="门店产生已结账订单后会在这里显示排行"
                className="py-10"
              />
            )}

            <div className="mt-6 rounded-xl bg-ink-50 p-4">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>会员积分总量</span>
                <span className="font-semibold text-ink-800">
                  {stats.totalPoints.toLocaleString()}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-500">
                <span>进行中优惠券</span>
                <span className="font-semibold text-ink-800">
                  {stats.activeCouponCount} 张
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>最新订单</CardTitle>
            <p className="mt-1 text-xs text-ink-400">全平台最近 8 笔订单</p>
          </div>
          <Link href="/admin/orders">
            <Button variant="ghost" size="sm">
              全部订单
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="px-0 pb-0 pt-2">
          {data.recentOrders.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr className="table-head">
                    <th className="px-5 py-3 font-medium">订单号</th>
                    <th className="px-4 py-3 font-medium">门店</th>
                    <th className="px-4 py-3 font-medium">桌台</th>
                    <th className="px-4 py-3 font-medium">会员</th>
                    <th className="px-4 py-3 font-medium">金额</th>
                    <th className="px-4 py-3 font-medium">状态</th>
                    <th className="px-4 py-3 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-ink-50/60">
                      <td className="table-cell font-mono text-xs text-ink-500">
                        {order.orderNo}
                      </td>
                      <td className="table-cell font-medium text-ink-800">
                        {order.shop.name}
                      </td>
                      <td className="table-cell">{order.table?.name || "-"}</td>
                      <td className="table-cell">{order.user?.name || "散客"}</td>
                      <td className="table-cell font-semibold text-ink-900">
                        {formatMoney(order.total)}
                      </td>
                      <td className="table-cell">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${
                            ORDER_STATUS_STYLE[order.status] || ""
                          }`}
                        >
                          {ORDER_STATUS_LABEL[order.status] || order.status}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-ink-400">
                        {formatDateTime(order.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="还没有订单"
              description="用户扫码下单后，订单会实时出现在这里"
            />
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          {
            href: "/admin/merchants",
            icon: Store,
            title: "商户管理",
            desc: "新增商户、启用停用、重置密码"
          },
          {
            href: "/admin/users",
            icon: Wallet,
            title: "会员资金",
            desc: "充值余额、调整积分、查看消费"
          },
          {
            href: "/admin/coupons",
            icon: TicketPercent,
            title: "平台优惠券",
            desc: "创建全平台券或指定门店券"
          }
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="group p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-float">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-ink-400">{item.desc}</p>
                </div>
                <ArrowUpRight className="ml-auto h-4 w-4 text-ink-300 transition group-hover:text-brand-500" />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
