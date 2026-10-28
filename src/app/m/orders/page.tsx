"use client";

import {
  ChevronRight,
  ClipboardList,
  ReceiptText,
  Store,
  UtensilsCrossed
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoading } from "@/components/ui/Spinner";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_LABEL
} from "@/lib/constants";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Order = {
  id: string;
  orderNo: string;
  status: string;
  type: string;
  subtotal: number;
  couponDiscount: number;
  memberDiscount: number;
  pointsDiscount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  paidAt: string | null;
  shop: { id: string; name: string; address: string };
  table: { id: string; name: string } | null;
  session: { id: string; status: string } | null;
  items: {
    id: string;
    dishName: string;
    price: number;
    quantity: number;
    amount: number;
    isGift: boolean;
  }[];
};

const filters = [
  { key: "ALL", label: "全部" },
  { key: "PENDING", label: "待结账" },
  { key: "PAID", label: "已结账" },
  { key: "CANCELLED", label: "已取消" }
];

export default function MobileOrdersPage() {
  const { data, loading, error } = useApi<{ orders: Order[] }>("/api/user/orders");
  const [status, setStatus] = useState("ALL");

  const orders = useMemo(() => {
    const list = data?.orders || [];
    if (status === "ALL") return list;
    return list.filter((o) => o.status === status);
  }, [data, status]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink-900">
              我的订单
            </h1>
            <p className="mt-0.5 text-[11px] text-ink-400">查看点餐记录与待结账账单</p>
          </div>
          <Link
            href="/m"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink-50 text-ink-500"
            aria-label="去点餐"
          >
            <UtensilsCrossed className="h-4 w-4" />
          </Link>
        </div>

        <div className="no-scrollbar mt-4 flex gap-1 overflow-x-auto rounded-xl bg-ink-50 p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "flex-1 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition",
                status === f.key
                  ? "bg-white text-ink-900 shadow-sm"
                  : "text-ink-500"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <PageLoading label="正在加载订单" />
        ) : error ? (
          <div className="rounded-2xl bg-white py-14 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <ReceiptText className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-900">登录后查看订单</p>
            <p className="mt-1 text-xs text-ink-400">{error}</p>
            <div className="mt-5 flex justify-center gap-2">
              <Link href="/m">
                <Button variant="outline">返回首页</Button>
              </Link>
              <Link href={`/m/login?redirect=${encodeURIComponent("/m/orders")}`}>
                <Button>去登录</Button>
              </Link>
            </div>
          </div>
        ) : orders.length ? (
          <div className="space-y-3">
            {orders.map((order) => {
              const canCheckout =
                order.status === "PENDING" &&
                order.session &&
                order.session.status === "OPEN";
              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-card"
                >
                  <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
                    <Link
                      href={`/m/shop/${order.shop.id}`}
                      className="flex min-w-0 items-center gap-2"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                        <Store className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {order.shop.name}
                        </p>
                        <p className="mt-0.5 text-[10px] text-ink-400">
                          {order.table ? `桌台 ${order.table.name} · ` : ""}
                          {order.type === "OFFLINE" ? "线下点餐" : "扫码点餐"}
                        </p>
                      </div>
                    </Link>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset",
                        ORDER_STATUS_STYLE[order.status] || ""
                      )}
                    >
                      {ORDER_STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="px-4 py-3">
                    <div className="space-y-1.5">
                      {order.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="min-w-0 flex-1 truncate text-ink-600">
                            {item.dishName} × {item.quantity}
                            {item.isGift ? (
                              <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                                赠饮
                              </span>
                            ) : null}
                          </span>
                          <span className="ml-3 shrink-0 text-ink-500">
                            {formatMoney(item.amount)}
                          </span>
                        </div>
                      ))}
                      {order.items.length > 3 ? (
                        <p className="text-[10px] text-ink-400">
                          还有 {order.items.length - 3} 道菜…
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-3 flex items-end justify-between border-t border-dashed border-ink-100 pt-3">
                      <div>
                        <p className="text-[10px] text-ink-400">
                          {formatDateTime(order.createdAt)}
                          {order.status === "PAID" && order.paymentMethod
                            ? ` · ${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod}`
                            : ""}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-400">
                          {order.couponDiscount +
                            order.memberDiscount +
                            order.pointsDiscount >
                          0
                            ? `已优惠 ${formatMoney(
                                order.couponDiscount +
                                  order.memberDiscount +
                                  order.pointsDiscount
                              )}`
                            : `共 ${order.items.reduce(
                                (sum, i) => sum + i.quantity,
                                0
                              )} 份`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-ink-400">
                          {order.status === "PAID" ? "实付" : "待付"}
                        </p>
                        <p className="text-lg font-semibold text-ink-900">
                          {formatMoney(order.total)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      {canCheckout ? (
                        <Link href={`/m/bill/${order.session!.id}`}>
                          <Button size="sm">
                            <ClipboardList className="h-3.5 w-3.5" />
                            去结账
                          </Button>
                        </Link>
                      ) : (
                        <Link href={`/m/shop/${order.shop.id}`}>
                          <Button variant="outline" size="sm">
                            再来一单
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-card">
            <EmptyState
              icon={<ReceiptText className="h-5 w-5" />}
              title="还没有订单"
              description="扫描桌码点餐后，订单会出现在这里"
              action={
                <Link href="/m">
                  <Button>去点餐</Button>
                </Link>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
