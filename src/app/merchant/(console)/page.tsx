"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  ChefHat,
  ReceiptText,
  Table2,
  TrendingUp,
  UtensilsCrossed,
  Wallet
} from "lucide-react";
import Link from "next/link";
import {
  Bar,
  BarChart,
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
import { PageLoading } from "@/components/ui/Spinner";
import { StatCard } from "@/components/ui/StatCard";
import { ORDER_STATUS_LABEL, ORDER_STATUS_STYLE } from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type DashboardResponse = {
  shop: { id: string; name: string; announcement: string; businessHours: string };
  stats: {
    revenue: number;
    orderCount: number;
    paidCount: number;
    avgOrder: number;
    occupiedTables: number;
    totalTables: number;
    pendingSessions: number;
    lowStockCount: number;
  };
  tables: {
    id: string;
    name: string;
    status: string;
    sessions: { id: string; orders: { id: string; subtotal: number }[] }[];
  }[];
  topDishes: { name: string; quantity: number; amount: number }[];
  hourly: { hour: string; revenue: number; orders: number }[];
  lowStock: {
    id: string;
    name: string;
    total: number;
    sold: number;
    remaining: number;
    soldOut: boolean;
  }[];
  recentOrders: {
    id: string;
    orderNo: string;
    status: string;
    total: number;
    createdAt: string;
    table: { name: string } | null;
    user: { name: string } | null;
    items: { quantity: number }[];
  }[];
};

export default function MerchantDashboardPage() {
  const { data, loading, error } = useApi<DashboardResponse>(
    "/api/merchant/dashboard"
  );

  if (loading) return <PageLoading label="正在加载今日经营数据" />;
  if (error || !data) {
    return (
      <EmptyState
        title="经营数据加载失败"
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
        title="今日经营"
        description={`${data.shop.name} · 营业时间 ${data.shop.businessHours}`}
        action={
          <>
            <Link href="/merchant/offline">
              <Button variant="outline">
                <UtensilsCrossed className="h-4 w-4" />
                线下点餐
              </Button>
            </Link>
            <Link href="/merchant/orders">
              <Button>
                <ReceiptText className="h-4 w-4" />
                处理订单
              </Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="今日营业额"
          value={formatMoney(stats.revenue)}
          hint={`${stats.paidCount} 笔已结账`}
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="今日订单"
          value={stats.orderCount}
          hint={`${stats.pendingSessions} 桌待结账`}
          icon={<ReceiptText className="h-5 w-5" />}
          tone="blue"
        />
        <StatCard
          label="桌台使用"
          value={`${stats.occupiedTables} / ${stats.totalTables}`}
          hint={`空闲 ${stats.totalTables - stats.occupiedTables} 桌`}
          icon={<Table2 className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="客单价"
          value={formatMoney(stats.avgOrder)}
          hint={`库存预警 ${stats.lowStockCount} 道菜`}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="amber"
        />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>分时营业额</CardTitle>
              <p className="mt-1 text-xs text-ink-400">按结账时间统计</p>
            </div>
            <Badge tone="brand">今日</Badge>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hourly} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    interval={2}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    tickFormatter={(v) => `¥${v / 100}`}
                    domain={[
                      0,
                      (dataMax: number) =>
                        dataMax <= 0 ? 1000 : Math.ceil(dataMax / 1000) * 1000
                    ]}
                    allowDecimals={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fff7ed" }}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12
                    }}
                    formatter={(value: number) => [formatMoney(value), "营业额"]}
                  />
                  <Bar dataKey="revenue" fill="#fb923c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>桌台状态</CardTitle>
              <p className="mt-1 text-xs text-ink-400">实时同步</p>
            </div>
            <Link
              href="/merchant/tables"
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              管理桌码
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-3 gap-2">
              {data.tables.map((table) => {
                const occupied = table.status === "OCCUPIED";
                return (
                  <Link
                    key={table.id}
                    href={`/merchant/offline?table=${table.id}`}
                    className={`rounded-xl border px-2 py-3 text-center transition hover:-translate-y-0.5 ${
                      occupied
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-ink-100 bg-white text-ink-500 hover:border-ink-200"
                    }`}
                  >
                    <p className="text-sm font-semibold">{table.name}</p>
                    <p className="mt-1 text-[10px]">
                      {occupied ? "用餐中" : "空闲"}
                    </p>
                  </Link>
                );
              })}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-50 px-3 py-2.5 text-xs">
              <span className="text-ink-500">待结账桌台</span>
              <span className="font-semibold text-ink-900">
                {stats.pendingSessions} 桌
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>最近订单</CardTitle>
              <p className="mt-1 text-xs text-ink-400">今日最新 8 笔</p>
            </div>
            <Link href="/merchant/orders">
              <Button variant="ghost" size="sm">
                全部订单
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-0 pb-0 pt-2">
            {data.recentOrders.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr className="table-head">
                      <th className="px-5 py-3 font-medium">桌台 / 会员</th>
                      <th className="px-4 py-3 font-medium">菜品</th>
                      <th className="px-4 py-3 font-medium">金额</th>
                      <th className="px-4 py-3 font-medium">状态</th>
                      <th className="px-4 py-3 font-medium">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-ink-50/60">
                        <td className="table-cell">
                          <p className="font-medium text-ink-800">
                            {order.table?.name || "无桌台"}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-400">
                            {order.user?.name || "散客"}
                          </p>
                        </td>
                        <td className="table-cell text-sm text-ink-600">
                          {order.items.reduce((sum, i) => sum + i.quantity, 0)} 份
                        </td>
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
                title="今天还没有订单"
                description="用户扫码下单或线下点餐后，会在这里显示"
                action={
                  <Link href="/merchant/offline">
                    <Button size="sm">去线下点餐</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>热销菜品</CardTitle>
              <ChefHat className="h-4 w-4 text-ink-300" />
            </CardHeader>
            <CardContent className="pt-4">
              {data.topDishes.length ? (
                <div className="space-y-3.5">
                  {data.topDishes.map((dish, index) => (
                    <div key={dish.name} className="flex items-center gap-3">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold ${
                          index === 0
                            ? "bg-brand-500 text-white"
                            : "bg-ink-50 text-ink-500"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {dish.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          售出 {dish.quantity} 份
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-ink-800">
                        {formatMoney(dish.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-ink-400">
                  暂无销售数据
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>库存预警</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent className="pt-4">
              {data.lowStock.length ? (
                <div className="space-y-3">
                  {data.lowStock.map((dish) => (
                    <div key={dish.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-800">
                          {dish.name}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          已售 {dish.sold} / {dish.total}
                        </p>
                      </div>
                      <Badge tone={dish.soldOut ? "red" : "amber"}>
                        {dish.soldOut ? "售罄" : `剩 ${dish.remaining}`}
                      </Badge>
                    </div>
                  ))}
                  <Link href="/merchant/dishes" className="block pt-1">
                    <Button variant="outline" size="sm" className="w-full">
                      调整今日库存
                    </Button>
                  </Link>
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-ink-400">
                  库存充足，暂无预警
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50/70 p-4 text-sm text-brand-800">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-brand-600">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium">今日公告</p>
            <p className="mt-1 text-xs leading-6 text-brand-700/80">
              {data.shop.announcement || "暂无公告，可在店铺设置中编辑。"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
