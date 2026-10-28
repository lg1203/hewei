"use client";

import { ReceiptText, Search, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { postJson } from "@/lib/api";
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_STYLE,
  PAYMENT_LABEL
} from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type OrderRow = {
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
  table: { id: string; name: string } | null;
  user: { id: string; name: string; phone: string } | null;
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

export default function MerchantOrdersPage() {
  const { data, loading, refresh } = useApi<{ orders: OrderRow[] }>(
    "/api/merchant/orders?date=today"
  );
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<OrderRow | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const orders = useMemo(() => {
    let list = data?.orders || [];
    if (status !== "ALL") list = list.filter((o) => o.status === status);
    if (q.trim()) {
      const keyword = q.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.orderNo.toLowerCase().includes(keyword) ||
          o.table?.name.toLowerCase().includes(keyword) ||
          o.user?.name.toLowerCase().includes(keyword) ||
          o.user?.phone.includes(keyword)
      );
    }
    return list;
  }, [data, status, q]);

  const stats = useMemo(() => {
    const list = data?.orders || [];
    return {
      revenue: list
        .filter((o) => o.status === "PAID")
        .reduce((sum, o) => sum + o.total, 0),
      pending: list.filter((o) => o.status === "PENDING").length,
      paid: list.filter((o) => o.status === "PAID").length
    };
  }, [data]);

  async function cancelOrder(order: OrderRow) {
    if (!window.confirm(`确定取消订单 ${order.orderNo} 吗？库存将自动恢复。`)) {
      return;
    }
    setCancelling(true);
    try {
      await postJson(`/api/merchant/orders/${order.id}/cancel`);
      toast.success("订单已取消，库存已恢复");
      setDetail(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "取消失败");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) return <PageLoading label="正在加载今日订单" />;

  return (
    <div>
      <PageHeader
        title="订单管理"
        description="查看今日订单、处理待结账桌台，取消未结账订单会自动恢复库存。"
        action={
          <Link href="/merchant/offline">
            <Button>
              <UtensilsCrossed className="h-4 w-4" />
              线下点餐
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">今日已结账</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {formatMoney(stats.revenue)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">待结账订单</p>
          <p className="mt-2 text-2xl font-semibold text-amber-500">
            {stats.pending}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">已结账笔数</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {stats.paid}
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 rounded-xl bg-ink-50 p-1">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatus(f.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    status === f.key
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="relative w-full lg:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索订单号、桌台、会员"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>

        {orders.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-3 font-medium">订单号</th>
                  <th className="px-4 py-3 font-medium">桌台 / 会员</th>
                  <th className="px-4 py-3 font-medium">菜品</th>
                  <th className="px-4 py-3 font-medium">金额</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-ink-50/60">
                    <td className="table-cell">
                      <p className="font-mono text-xs text-ink-500">
                        {order.orderNo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-ink-400">
                        {order.type === "OFFLINE" ? "线下点餐" : "扫码点餐"}
                      </p>
                    </td>
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
                    <td className="table-cell">
                      <p className="font-semibold text-ink-900">
                        {formatMoney(order.total)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        优惠{" "}
                        {formatMoney(
                          order.couponDiscount +
                            order.memberDiscount +
                            order.pointsDiscount
                        )}
                      </p>
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
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(order)}
                        >
                          详情
                        </Button>
                        {order.status === "PENDING" && order.table ? (
                          <Link href={`/merchant/offline?table=${order.table.id}`}>
                            <Button size="sm">去结账</Button>
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={<ReceiptText className="h-5 w-5" />}
            title="没有符合条件的订单"
            description="用户扫码下单或线下点餐后，订单会出现在这里"
          />
        )}
      </Card>

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title="订单详情"
        description={detail?.orderNo}
        className="max-w-xl"
        footer={
          detail?.status === "PENDING" ? (
            <>
              <Button
                variant="outline"
                className="text-rose-500"
                onClick={() => detail && cancelOrder(detail)}
                loading={cancelling}
              >
                取消订单
              </Button>
              {detail.table ? (
                <Link href={`/merchant/offline?table=${detail.table.id}`}>
                  <Button>去结账</Button>
                </Link>
              ) : null}
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {detail.table?.name || "无桌台"} ·{" "}
                  {detail.user?.name || "散客"}
                </p>
                <p className="mt-0.5 text-xs text-ink-400">
                  {formatDateTime(detail.createdAt)} ·{" "}
                  {detail.type === "OFFLINE" ? "线下点餐" : "扫码点餐"}
                </p>
              </div>
              <Badge
                tone={
                  detail.status === "PAID"
                    ? "green"
                    : detail.status === "PENDING"
                      ? "amber"
                      : "slate"
                }
              >
                {ORDER_STATUS_LABEL[detail.status]}
              </Badge>
            </div>
            <div className="divide-y divide-ink-100 rounded-xl border border-ink-100">
              {detail.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink-800">
                      {item.dishName}
                      {item.isGift ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700">
                          赠饮
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      {formatMoney(item.price)} × {item.quantity}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-ink-900">
                    {formatMoney(item.amount)}
                  </p>
                </div>
              ))}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>小计</span>
                <span>{formatMoney(detail.subtotal)}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>优惠券</span>
                <span>-{formatMoney(detail.couponDiscount)}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>会员折扣</span>
                <span>-{formatMoney(detail.memberDiscount)}</span>
              </div>
              <div className="flex justify-between text-ink-500">
                <span>积分抵扣</span>
                <span>-{formatMoney(detail.pointsDiscount)}</span>
              </div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-semibold text-ink-900">
                <span>实付</span>
                <span>{formatMoney(detail.total)}</span>
              </div>
            </div>
            {detail.status === "PAID" ? (
              <p className="text-xs text-ink-400">
                支付方式：{PAYMENT_LABEL[detail.paymentMethod] || detail.paymentMethod}
                ，结账时间：{formatDateTime(detail.paidAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
