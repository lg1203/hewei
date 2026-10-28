"use client";

import {
  Crown,
  Gift,
  Pencil,
  Plus,
  Power,
  Sparkles,
  Trash2,
  Users
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { deleteJson, patchJson, postJson } from "@/lib/api";
import { BILLING_CYCLE_LABEL } from "@/lib/constants";
import { formatMoney, parseYuanToCents } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type PlanRow = {
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
  createdAt: string;
  _count: { memberships: number };
};

const emptyForm = {
  name: "",
  description: "",
  billingCycle: "MONTHLY",
  price: "",
  originalPrice: "",
  firstMonthFree: true,
  trialDays: "30",
  discountRate: "90",
  freeDrink: true,
  giftCategoryName: "饮品甜点",
  status: "ACTIVE",
  sort: "0"
};

export default function AdminMembershipsPage() {
  const { data, loading, refresh } = useApi<{
    plans: PlanRow[];
    activeMembers: number;
  }>("/api/admin/memberships");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const plans = data?.plans || [];
  const stats = useMemo(
    () => ({
      total: plans.length,
      active: plans.filter((plan) => plan.status === "ACTIVE").length,
      members: data?.activeMembers || 0
    }),
    [plans, data]
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(plan: PlanRow) {
    setEditing(plan);
    setForm({
      name: plan.name,
      description: plan.description,
      billingCycle: plan.billingCycle,
      price: (plan.price / 100).toString(),
      originalPrice: plan.originalPrice ? (plan.originalPrice / 100).toString() : "",
      firstMonthFree: plan.firstMonthFree,
      trialDays: String(plan.trialDays),
      discountRate: String(plan.discountRate),
      freeDrink: plan.freeDrink,
      giftCategoryName: plan.giftCategoryName,
      status: plan.status,
      sort: String(plan.sort)
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const price = parseYuanToCents(form.price);
    const originalPrice = form.originalPrice
      ? parseYuanToCents(form.originalPrice)
      : 0;
    if (!form.name.trim()) {
      toast.error("请输入方案名称");
      return;
    }
    if (price < 0) {
      toast.error("请输入正确的价格");
      return;
    }
    if (originalPrice && originalPrice < price) {
      toast.error("原价不能低于优惠价");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        billingCycle: form.billingCycle,
        price,
        originalPrice,
        firstMonthFree: form.firstMonthFree,
        trialDays: Number(form.trialDays || 0),
        discountRate: Number(form.discountRate || 100),
        freeDrink: form.freeDrink,
        giftCategoryName: form.giftCategoryName.trim() || "饮品甜点",
        status: form.status,
        sort: Number(form.sort || 0)
      };
      if (editing) {
        await patchJson(`/api/admin/memberships/${editing.id}`, payload);
        toast.success("会员方案已更新");
      } else {
        await postJson("/api/admin/memberships", payload);
        toast.success("会员方案已创建");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(plan: PlanRow) {
    try {
      await patchJson(`/api/admin/memberships/${plan.id}`, {
        status: plan.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
      });
      toast.success(plan.status === "ACTIVE" ? "方案已停用" : "方案已启用");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function remove(plan: PlanRow) {
    if (
      !window.confirm(
        `确定删除会员方案「${plan.name}」吗？已有会员使用的方案不能删除。`
      )
    ) {
      return;
    }
    setDeletingId(plan.id);
    try {
      await deleteJson(`/api/admin/memberships/${plan.id}`);
      toast.success("方案已删除");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId("");
    }
  }

  if (loading) return <PageLoading label="正在加载会员方案" />;

  return (
    <div>
      <PageHeader
        title="会员方案"
        description="配置付费会员的折扣、赠饮、首月体验与续费价格。用户开通后结账自动享受权益。"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建方案
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">方案总数</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {stats.total}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">启用中</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {stats.active}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">生效会员</p>
          <p className="mt-2 flex items-center gap-2 text-2xl font-semibold text-brand-600">
            <Users className="h-5 w-5" />
            {stats.members}
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="px-0 pb-0 pt-0">
          {plans.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "26%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "12%" }} />
                </colgroup>
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">方案</th>
                    <th className="px-3 py-3 font-medium">周期</th>
                    <th className="px-3 py-3 font-medium">价格</th>
                    <th className="px-3 py-3 font-medium">会员权益</th>
                    <th className="px-3 py-3 font-medium">会员数</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                    <th className="px-3 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-ink-50/60">
                      <td className="table-cell px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                            <Crown className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink-900">
                              {plan.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-ink-400">
                              {plan.description || "未填写方案说明"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell px-3">
                        <Badge tone="brand">
                          {BILLING_CYCLE_LABEL[plan.billingCycle] ||
                            plan.billingCycle}
                        </Badge>
                      </td>
                      <td className="table-cell px-3">
                        <p className="text-sm font-semibold text-ink-900">
                          {formatMoney(plan.price)}
                        </p>
                        {plan.originalPrice > plan.price ? (
                          <p className="mt-0.5 text-[11px] text-ink-400 line-through">
                            {formatMoney(plan.originalPrice)}
                          </p>
                        ) : null}
                      </td>
                      <td className="table-cell px-3 text-xs text-ink-500">
                        <p className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-brand-400" />
                          {(plan.discountRate / 10).toFixed(1)} 折
                        </p>
                        <p className="mt-1 flex items-center gap-1">
                          <Gift className="h-3 w-3 text-emerald-400" />
                          {plan.freeDrink
                            ? `赠${plan.giftCategoryName}`
                            : "无赠饮"}
                        </p>
                        <p className="mt-1 text-[10px] text-ink-400">
                          {plan.firstMonthFree
                            ? `首月 0 元 · ${plan.trialDays} 天体验`
                            : "无首月体验"}
                        </p>
                      </td>
                      <td className="table-cell px-3 text-sm text-ink-600">
                        {plan._count.memberships}
                      </td>
                      <td className="table-cell px-3">
                        <Badge
                          tone={plan.status === "ACTIVE" ? "green" : "slate"}
                        >
                          {plan.status === "ACTIVE" ? "启用" : "停用"}
                        </Badge>
                      </td>
                      <td className="table-cell px-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="编辑方案"
                            aria-label="编辑方案"
                            onClick={() => openEdit(plan)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={
                              plan.status === "ACTIVE" ? "停用方案" : "启用方案"
                            }
                            aria-label={
                              plan.status === "ACTIVE" ? "停用方案" : "启用方案"
                            }
                            className={
                              plan.status === "ACTIVE"
                                ? "text-rose-500 hover:bg-rose-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }
                            onClick={() => toggle(plan)}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="删除方案"
                            aria-label="删除方案"
                            className="text-rose-500 hover:bg-rose-50"
                            loading={deletingId === plan.id}
                            onClick={() => remove(plan)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Crown className="h-5 w-5" />}
              title="还没有会员方案"
              description="创建月付/年付方案后，用户可在会员中心开通"
              action={<Button onClick={openCreate}>新建方案</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑会员方案" : "新建会员方案"}
        description="折扣按结账金额计算：90 表示 9 折。首月体验仅限从未体验过的新会员。"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button form="membership-plan-form" type="submit" loading={saving}>
              {editing ? "保存修改" : "创建方案"}
            </Button>
          </>
        }
      >
        <form
          id="membership-plan-form"
          onSubmit={submit}
          className="space-y-4"
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <Field label="方案名称">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：稻香月卡会员"
                maxLength={40}
                required
              />
            </Field>
            <Field label="排序" hint="越小越靠前">
              <Input
                type="number"
                value={form.sort}
                onChange={(e) => setForm({ ...form, sort: e.target.value })}
              />
            </Field>
          </div>

          <Field label="方案说明">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="展示在用户端会员方案卡片上"
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="计费周期">
              <Select
                value={form.billingCycle}
                onChange={(e) =>
                  setForm({ ...form, billingCycle: e.target.value })
                }
              >
                <option value="MONTHLY">月付</option>
                <option value="YEARLY">年付</option>
              </Select>
            </Field>
            <Field label="优惠价（元）">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="如：19.9"
                required
              />
            </Field>
            <Field label="原价（元）" hint="留空或等于优惠价则不显示划线价">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.originalPrice}
                onChange={(e) =>
                  setForm({ ...form, originalPrice: e.target.value })
                }
                placeholder="如：29.9"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="结账折扣" hint="1-100，90 表示 9 折">
              <Input
                type="number"
                min="1"
                max="100"
                value={form.discountRate}
                onChange={(e) =>
                  setForm({ ...form, discountRate: e.target.value })
                }
                required
              />
            </Field>
            <Field label="体验天数" hint="仅首次开通且开启首月 0 元时生效">
              <Input
                type="number"
                min="0"
                max="365"
                value={form.trialDays}
                onChange={(e) =>
                  setForm({ ...form, trialDays: e.target.value })
                }
              />
            </Field>
            <Field label="方案状态">
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="ACTIVE">启用</option>
                <option value="DISABLED">停用</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2.5 rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={form.firstMonthFree}
                onChange={(e) =>
                  setForm({ ...form, firstMonthFree: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500"
              />
              <span>
                <span className="font-medium text-ink-800">首月 0 元体验</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-ink-500">
                  每个用户仅可享受一次，体验期结束后按方案价格自动续费。
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={form.freeDrink}
                onChange={(e) =>
                  setForm({ ...form, freeDrink: e.target.checked })
                }
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-500"
              />
              <span>
                <span className="font-medium text-ink-800">每次就餐赠饮</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-ink-500">
                  结账时自动赠送 1 份指定分类的饮品，0 元计入订单。
                </span>
              </span>
            </label>
          </div>

          {form.freeDrink ? (
            <Field label="赠饮分类名称" hint="需与商户菜单分类名称一致">
              <Input
                value={form.giftCategoryName}
                onChange={(e) =>
                  setForm({ ...form, giftCategoryName: e.target.value })
                }
                placeholder="饮品甜点"
              />
            </Field>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
