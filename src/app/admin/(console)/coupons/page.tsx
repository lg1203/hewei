"use client";

import { Plus, TicketPercent, Power } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { patchJson, postJson } from "@/lib/api";
import { COUPON_TYPE_LABEL } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type CouponRow = {
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
  _count: { userCoupons: number };
};

type MerchantOption = {
  id: string;
  name: string;
  shop: { id: string; name: string } | null;
};

export default function AdminCouponsPage() {
  const { data, loading, refresh } = useApi<{ coupons: CouponRow[] }>(
    "/api/admin/coupons"
  );
  const { data: merchantData } = useApi<{ merchants: MerchantOption[] }>(
    "/api/admin/merchants"
  );
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "FULL_REDUCTION",
    threshold: "50",
    value: "10",
    discountRate: "90",
    totalQty: "100",
    perUserLimit: "1",
    startAt: "",
    endAt: "",
    shopId: ""
  });

  const coupons = data?.coupons || [];
  const shops = (merchantData?.merchants || []).filter((m) => m.shop);
  const money = (cents: number) =>
    formatMoney(cents, false).replace(/\.00$/, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/admin/coupons", {
        title: form.title,
        description: form.description,
        type: form.type,
        threshold: Math.round(Number(form.threshold || 0) * 100),
        value: Math.round(Number(form.value || 0) * 100),
        discountRate: Number(form.discountRate || 90),
        totalQty: Number(form.totalQty || 100),
        perUserLimit: Number(form.perUserLimit || 1),
        startAt: form.startAt ? new Date(form.startAt).toISOString() : undefined,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : undefined,
        shopId: form.shopId || null
      });
      toast.success("优惠券创建成功");
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(coupon: CouponRow) {
    try {
      await patchJson(`/api/admin/coupons/${coupon.id}`, {
        status: coupon.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
      });
      toast.success("优惠券状态已更新");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  if (loading) return <PageLoading label="正在加载优惠券" />;

  return (
    <div>
      <PageHeader
        title="平台优惠券"
        description="创建全平台通用券或指定门店券，商户也可自行创建店铺券。"
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            创建优惠券
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">优惠券总数</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{coupons.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">进行中</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {coupons.filter((c) => c.status === "ACTIVE").length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">累计领取</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {coupons.reduce((sum, c) => sum + c.claimedQty, 0)}
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="px-0 pb-0 pt-0">
          {coupons.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "25%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">优惠券</th>
                    <th className="px-3 py-3 font-medium">适用门店</th>
                    <th className="px-3 py-3 font-medium">优惠内容</th>
                    <th className="px-3 py-3 font-medium">领取进度</th>
                    <th className="px-3 py-3 font-medium">有效期</th>
                    <th className="px-3 py-3 font-medium">来源</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                    <th className="px-3 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className="hover:bg-ink-50/60">
                      <td className="table-cell px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                            <TicketPercent className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">{coupon.title}</p>
                            <p className="mt-0.5 max-w-full truncate text-xs text-ink-400">
                              {coupon.description || "无门槛说明"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell whitespace-nowrap px-3 text-sm text-ink-600">
                        {coupon.shop?.name || "全平台通用"}
                      </td>
                      <td className="table-cell px-3">
                        <p className="font-semibold text-brand-600">
                          {coupon.type === "FULL_REDUCTION"
                            ? `满 ${money(coupon.threshold)} 减 ${money(coupon.value)}`
                            : `${(coupon.discountRate || 90) / 10} 折`}
                        </p>
                        <p className="mt-0.5 text-xs text-ink-400">
                          {COUPON_TYPE_LABEL[coupon.type]} · 限 {coupon.perUserLimit} 张
                        </p>
                      </td>
                      <td className="table-cell px-3">
                        <p className="text-sm text-ink-700">
                          {coupon.claimedQty} / {coupon.totalQty}
                        </p>
                        <div className="mt-1.5 h-1.5 w-20 overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-brand-400"
                            style={{
                              width: `${Math.min(
                                100,
                                (coupon.claimedQty / Math.max(coupon.totalQty, 1)) * 100
                              )}%`
                            }}
                          />
                        </div>
                      </td>
                      <td className="table-cell px-3 text-xs text-ink-500">
                        <p className="whitespace-nowrap">{formatDate(coupon.startAt)}</p>
                        <p className="mt-0.5 whitespace-nowrap text-ink-400">
                          至 {formatDate(coupon.endAt)}
                        </p>
                      </td>
                      <td className="table-cell px-3">
                        <Badge tone={coupon.source === "ADMIN" ? "blue" : "slate"}>
                          {coupon.source === "ADMIN" ? "平台" : "商户"}
                        </Badge>
                      </td>
                      <td className="table-cell px-3">
                        <Badge tone={coupon.status === "ACTIVE" ? "green" : "slate"}>
                          {coupon.status === "ACTIVE" ? "进行中" : "已停用"}
                        </Badge>
                      </td>
                      <td className="table-cell whitespace-nowrap px-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggle(coupon)}
                          className={
                            coupon.status === "ACTIVE"
                              ? "text-rose-500 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }
                        >
                          <Power className="h-3.5 w-3.5" />
                          {coupon.status === "ACTIVE" ? "停用" : "启用"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="还没有优惠券"
              description="创建平台券或让商户创建店铺券"
              action={<Button onClick={() => setOpen(true)}>创建优惠券</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="创建平台优惠券"
        description="平台券可选择全平台通用，或限定某一家门店使用。"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button form="coupon-form" type="submit" loading={saving}>
              创建
            </Button>
          </>
        }
      >
        <form id="coupon-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="优惠券名称">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="如：平台新人券"
                required
              />
            </Field>
            <Field label="适用门店">
              <Select
                value={form.shopId}
                onChange={(e) => setForm({ ...form, shopId: e.target.value })}
              >
                <option value="">全平台通用</option>
                {shops.map((m) => (
                  <option key={m.shop!.id} value={m.shop!.id}>
                    {m.shop!.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="使用说明">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="如：单笔订单满 30 元可用，不与其他优惠叠加"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="优惠类型">
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="FULL_REDUCTION">满减券</option>
                <option value="DISCOUNT">折扣券</option>
              </Select>
            </Field>
            <Field label="使用门槛（元）">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.threshold}
                onChange={(e) => setForm({ ...form, threshold: e.target.value })}
              />
            </Field>
          </div>
          {form.type === "FULL_REDUCTION" ? (
            <Field label="减免金额（元）">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </Field>
          ) : (
            <Field label="折扣（如 90 表示 9 折）">
              <Input
                type="number"
                min="1"
                max="99"
                value={form.discountRate}
                onChange={(e) => setForm({ ...form, discountRate: e.target.value })}
              />
            </Field>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="发放总量">
              <Input
                type="number"
                min="1"
                value={form.totalQty}
                onChange={(e) => setForm({ ...form, totalQty: e.target.value })}
              />
            </Field>
            <Field label="每人限领">
              <Input
                type="number"
                min="1"
                value={form.perUserLimit}
                onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="开始时间（留空为立即）">
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
            </Field>
            <Field label="结束时间（留空为 30 天）">
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
