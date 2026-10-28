"use client";

import { KeyRound, Pencil, Plus, Search, Store, Power } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { patchJson, postJson } from "@/lib/api";
import { MERCHANT_STATUS_LABEL } from "@/lib/constants";
import { formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type MerchantRow = {
  id: string;
  name: string;
  phone: string;
  status: string;
  createdAt: string;
  todayRevenue: number;
  todayOrders: number;
  shop: {
    id: string;
    name: string;
    address: string;
    phone: string;
    status: string;
    _count: { dishes: number; tables: number; coupons: number };
  } | null;
};

type FormState = {
  name: string;
  phone: string;
  password: string;
  shopName: string;
  address: string;
  shopPhone: string;
};

const emptyForm: FormState = {
  name: "",
  phone: "",
  password: "123456",
  shopName: "",
  address: "",
  shopPhone: ""
};

export default function AdminMerchantsPage() {
  const { data, loading, refresh } = useApi<{ merchants: MerchantRow[] }>(
    "/api/admin/merchants"
  );
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MerchantRow | null>(null);
  const [resetTarget, setResetTarget] = useState<MerchantRow | null>(null);
  const [newPassword, setNewPassword] = useState("123456");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const merchants = useMemo(() => {
    const list = data?.merchants || [];
    if (!q.trim()) return list;
    const keyword = q.trim().toLowerCase();
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(keyword) ||
        m.phone.includes(keyword) ||
        m.shop?.name.toLowerCase().includes(keyword)
    );
  }, [data, q]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(merchant: MerchantRow) {
    setEditing(merchant);
    setForm({
      name: merchant.name,
      phone: merchant.phone,
      password: "",
      shopName: merchant.shop?.name || "",
      address: merchant.shop?.address || "",
      shopPhone: merchant.shop?.phone || ""
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await patchJson(`/api/admin/merchants/${editing.id}`, {
          name: form.name,
          status: editing.status,
          shopName: form.shopName,
          address: form.address,
          shopPhone: form.shopPhone,
          ...(form.password ? { password: form.password } : {})
        });
        toast.success("商户信息已更新");
      } else {
        await postJson("/api/admin/merchants", form);
        toast.success("商户创建成功");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(merchant: MerchantRow) {
    const next = merchant.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    if (
      next === "DISABLED" &&
      !window.confirm(`确定停用「${merchant.shop?.name || merchant.name}」吗？停用后商户无法登录。`)
    ) {
      return;
    }
    try {
      await patchJson(`/api/admin/merchants/${merchant.id}`, { status: next });
      toast.success(next === "ACTIVE" ? "商户已启用" : "商户已停用");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function resetPassword() {
    if (!resetTarget) return;
    if (newPassword.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    try {
      await patchJson(`/api/admin/merchants/${resetTarget.id}`, {
        password: newPassword
      });
      toast.success("密码已重置");
      setResetTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "重置失败");
    }
  }

  if (loading) return <PageLoading label="正在加载商户列表" />;

  return (
    <div>
      <PageHeader
        title="商户管理"
        description="管理入驻商户、门店信息与账号状态。"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增商户
          </Button>
        }
      />

      <Card>
        <CardContent className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索商户、门店或手机号"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-ink-400">
              共 {merchants.length} 家商户
            </p>
          </div>
        </CardContent>

        {merchants.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse">
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-3 font-medium">商户 / 门店</th>
                  <th className="px-4 py-3 font-medium">联系方式</th>
                  <th className="px-4 py-3 font-medium">今日经营</th>
                  <th className="px-4 py-3 font-medium">规模</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">入驻时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {merchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-ink-50/60">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-ink-900">
                            {merchant.shop?.name || "未创建门店"}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-400">
                            {merchant.name} · {merchant.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <p className="text-sm text-ink-700">{merchant.phone}</p>
                      <p className="mt-0.5 max-w-[220px] truncate text-xs text-ink-400">
                        {merchant.shop?.address || "未填写地址"}
                      </p>
                    </td>
                    <td className="table-cell">
                      <p className="font-semibold text-ink-900">
                        {formatMoney(merchant.todayRevenue)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {merchant.todayOrders} 笔订单
                      </p>
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1.5 text-[11px] text-ink-500">
                        <span className="rounded-md bg-ink-50 px-1.5 py-0.5">
                          {merchant.shop?._count.dishes || 0} 菜品
                        </span>
                        <span className="rounded-md bg-ink-50 px-1.5 py-0.5">
                          {merchant.shop?._count.tables || 0} 桌台
                        </span>
                        <span className="rounded-md bg-ink-50 px-1.5 py-0.5">
                          {merchant.shop?._count.coupons || 0} 券
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge tone={merchant.status === "ACTIVE" ? "green" : "slate"}>
                        {MERCHANT_STATUS_LABEL[merchant.status] || merchant.status}
                      </Badge>
                    </td>
                    <td className="table-cell text-xs text-ink-400">
                      {formatDateTime(merchant.createdAt)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(merchant)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setResetTarget(merchant);
                            setNewPassword("123456");
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={
                            merchant.status === "ACTIVE"
                              ? "text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }
                          onClick={() => toggleStatus(merchant)}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {merchant.status === "ACTIVE" ? "停用" : "启用"}
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
            title="没有找到商户"
            description="换个关键词试试，或新增一家商户"
            action={
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" />
                新增商户
              </Button>
            }
          />
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑商户" : "新增商户"}
        description={
          editing
            ? "修改商户账号或门店基础信息。"
            : "创建商户账号时会同步创建门店与默认菜品分类。"
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button form="merchant-form" type="submit" loading={saving}>
              保存
            </Button>
          </>
        }
      >
        <form id="merchant-form" onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="商户姓名">
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="如：陈老板"
                required
              />
            </Field>
            <Field label="手机号">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="11 位手机号"
                disabled={Boolean(editing)}
                required
              />
            </Field>
          </div>
          <Field label={editing ? "重置密码（留空则不修改）" : "初始密码"}>
            <Input
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="至少 6 位"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="门店名称">
              <Input
                value={form.shopName}
                onChange={(e) => setForm({ ...form, shopName: e.target.value })}
                placeholder="如：稻香小馆"
                required
              />
            </Field>
            <Field label="门店电话">
              <Input
                value={form.shopPhone}
                onChange={(e) => setForm({ ...form, shopPhone: e.target.value })}
                placeholder="选填"
              />
            </Field>
          </div>
          <Field label="门店地址">
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="选填"
            />
          </Field>
          {editing ? (
            <Field label="账号状态">
              <Select
                value={editing.status}
                onChange={(e) => {
                  setEditing({ ...editing, status: e.target.value });
                }}
              >
                <option value="ACTIVE">正常</option>
                <option value="DISABLED">停用</option>
              </Select>
            </Field>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(resetTarget)}
        onClose={() => setResetTarget(null)}
        title="重置商户密码"
        description={`将为「${resetTarget?.shop?.name || resetTarget?.name || ""}」设置新密码。`}
        footer={
          <>
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              取消
            </Button>
            <Button onClick={resetPassword}>确认重置</Button>
          </>
        }
      >
        <Field label="新密码">
          <Input
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="至少 6 位"
          />
        </Field>
      </Modal>
    </div>
  );
}
