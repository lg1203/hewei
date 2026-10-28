"use client";

import {
  Coins,
  Pencil,
  Plus,
  Power,
  Search,
  Sparkles,
  UserRound,
  Wallet
} from "lucide-react";
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
import { StatCard } from "@/components/ui/StatCard";
import { patchJson, postJson } from "@/lib/api";
import { formatDateTime, formatMoney, maskPhone } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type UserRow = {
  id: string;
  name: string;
  phone: string;
  balance: number;
  points: number;
  status: string;
  createdAt: string;
  spent: number;
  paidOrders: number;
  _count: { orders: number; coupons: number };
};

export default function AdminUsersPage() {
  const { data, loading, refresh } = useApi<{ users: UserRow[] }>(
    "/api/admin/users"
  );
  const [q, setQ] = useState("");
  const [rechargeTarget, setRechargeTarget] = useState<UserRow | null>(null);
  const [pointsTarget, setPointsTarget] = useState<UserRow | null>(null);
  const [editTarget, setEditTarget] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    status: "ACTIVE",
    password: ""
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [amount, setAmount] = useState("100");
  const [points, setPoints] = useState("100");
  const [note, setNote] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    password: "123456",
    balance: "",
    points: ""
  });
  const [saving, setSaving] = useState(false);

  const users = useMemo(() => {
    const list = data?.users || [];
    if (!q.trim()) return list;
    const keyword = q.trim().toLowerCase();
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(keyword) || u.phone.includes(keyword)
    );
  }, [data, q]);

  const totals = useMemo(() => {
    const list = data?.users || [];
    return {
      balance: list.reduce((sum, u) => sum + u.balance, 0),
      points: list.reduce((sum, u) => sum + u.points, 0),
      spent: list.reduce((sum, u) => sum + u.spent, 0)
    };
  }, [data]);

  async function recharge() {
    if (!rechargeTarget) return;
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      toast.error("请输入正确的充值金额");
      return;
    }
    setSaving(true);
    try {
      await postJson(`/api/admin/users/${rechargeTarget.id}/recharge`, {
        amount: cents,
        note: note || "平台充值"
      });
      toast.success(`已为 ${rechargeTarget.name} 充值 ${formatMoney(cents)}`);
      setRechargeTarget(null);
      setNote("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "充值失败");
    } finally {
      setSaving(false);
    }
  }

  async function adjustPoints() {
    if (!pointsTarget) return;
    const value = Math.floor(Number(points));
    if (!Number.isFinite(value) || value === 0) {
      toast.error("请输入要调整的积分数");
      return;
    }
    setSaving(true);
    try {
      await postJson(`/api/admin/users/${pointsTarget.id}/points`, {
        amount: value,
        note: note || "平台积分调整"
      });
      toast.success("积分已调整");
      setPointsTarget(null);
      setNote("");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "调整失败");
    } finally {
      setSaving(false);
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await postJson("/api/admin/users", {
        ...newUser,
        balance: newUser.balance ? Math.round(Number(newUser.balance) * 100) : 0,
        points: newUser.points ? Math.floor(Number(newUser.points)) : 0
      });
      toast.success("用户创建成功");
      setCreateOpen(false);
      setNewUser({ name: "", phone: "", password: "123456", balance: "", points: "" });
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(user: UserRow) {
    setEditTarget(user);
    setEditForm({
      name: user.name,
      phone: user.phone,
      status: user.status,
      password: ""
    });
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const name = editForm.name.trim();
    const phone = editForm.phone.trim();
    if (!name) {
      toast.error("请输入用户昵称");
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      toast.error("请输入正确的手机号");
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error("密码至少 6 位");
      return;
    }
    setSaving(true);
    try {
      await patchJson(`/api/admin/users/${editTarget.id}`, {
        name,
        phone,
        status: editForm.status,
        ...(editForm.password ? { password: editForm.password } : {})
      });
      toast.success("用户资料已更新");
      setEditTarget(null);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user: UserRow) {
    try {
      await patchJson(`/api/admin/users/${user.id}`, {
        status: user.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
      });
      toast.success("状态已更新");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  if (loading) return <PageLoading label="正在加载会员列表" />;

  return (
    <div>
      <PageHeader
        title="用户管理"
        description="查看会员消费、余额与积分，支持平台充值和积分调整。"
        action={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            新增用户
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="会员余额总额"
          value={formatMoney(totals.balance)}
          hint="可用于到店消费抵扣"
          icon={<Wallet className="h-5 w-5" />}
          tone="brand"
        />
        <StatCard
          label="会员积分总量"
          value={totals.points.toLocaleString()}
          hint="100 积分抵 1 元（默认）"
          icon={<Sparkles className="h-5 w-5" />}
          tone="violet"
        />
        <StatCard
          label="会员累计消费"
          value={formatMoney(totals.spent)}
          hint={`${users.length} 位注册会员`}
          icon={<Coins className="h-5 w-5" />}
          tone="green"
        />
      </div>

      <Card className="mt-5">
        <CardContent className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索昵称或手机号"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-ink-400">共 {users.length} 位会员</p>
          </div>
        </CardContent>

        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] table-fixed border-collapse">
              <colgroup>
                <col style={{ width: "23%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "18%" }} />
              </colgroup>
              <thead>
                <tr className="table-head">
                  <th className="px-5 py-3 font-medium">会员</th>
                  <th className="px-4 py-3 font-medium">余额</th>
                  <th className="px-4 py-3 font-medium">积分</th>
                  <th className="px-4 py-3 font-medium">消费</th>
                  <th className="px-4 py-3 font-medium">订单 / 券</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">注册时间</th>
                  <th className="px-4 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-ink-50/60">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500">
                          <UserRound className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink-900">{user.name}</p>
                          <p className="mt-0.5 text-xs text-ink-400">
                            {maskPhone(user.phone)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-semibold text-ink-900">
                      {formatMoney(user.balance)}
                    </td>
                    <td className="table-cell">
                      <span className="font-medium text-violet-600">
                        {user.points.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <p className="font-medium text-ink-800">
                        {formatMoney(user.spent)}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-400">
                        {user.paidOrders} 笔已结账
                      </p>
                    </td>
                    <td className="table-cell text-xs text-ink-500">
                      {user._count.orders} / {user._count.coupons}
                    </td>
                    <td className="table-cell">
                      <Badge tone={user.status === "ACTIVE" ? "green" : "slate"}>
                        {user.status === "ACTIVE" ? "正常" : "停用"}
                      </Badge>
                    </td>
                    <td className="table-cell whitespace-nowrap text-xs text-ink-400">
                      {formatDateTime(user.createdAt)}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="编辑资料 / 重置密码"
                          aria-label="编辑资料 / 重置密码"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="余额充值"
                          aria-label="余额充值"
                          onClick={() => {
                            setRechargeTarget(user);
                            setAmount("100");
                            setNote("");
                          }}
                        >
                          <Wallet className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="调整积分"
                          aria-label="调整积分"
                          onClick={() => {
                            setPointsTarget(user);
                            setPoints("100");
                            setNote("");
                          }}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={user.status === "ACTIVE" ? "停用账号" : "启用账号"}
                          aria-label={user.status === "ACTIVE" ? "停用账号" : "启用账号"}
                          className={
                            user.status === "ACTIVE"
                              ? "text-rose-500 hover:bg-rose-50"
                              : "text-emerald-600 hover:bg-emerald-50"
                          }
                          onClick={() => toggleStatus(user)}
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="没有找到会员" description="换个关键词试试" />
        )}
      </Card>

      <Modal
        open={Boolean(rechargeTarget)}
        onClose={() => setRechargeTarget(null)}
        title="会员充值"
        description={
          rechargeTarget
            ? `为 ${rechargeTarget.name}（${maskPhone(rechargeTarget.phone)}）充值`
            : ""
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setRechargeTarget(null)}>
              取消
            </Button>
            <Button onClick={recharge} loading={saving}>
              确认充值
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="充值金额（元）">
            <Input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {["50", "100", "200", "500"].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAmount(v)}
              >
                ¥{v}
              </Button>
            ))}
          </div>
          <Field label="备注">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="选填，如：活动充值"
            />
          </Field>
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">
            当前余额：{rechargeTarget ? formatMoney(rechargeTarget.balance) : "-"}
            ，充值后：
            {rechargeTarget
              ? formatMoney(
                  rechargeTarget.balance + Math.round(Number(amount || 0) * 100)
                )
              : "-"}
          </p>
        </div>
      </Modal>

      <Modal
        open={Boolean(pointsTarget)}
        onClose={() => setPointsTarget(null)}
        title="调整会员积分"
        description={
          pointsTarget
            ? `${pointsTarget.name} 当前积分 ${pointsTarget.points.toLocaleString()}`
            : ""
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setPointsTarget(null)}>
              取消
            </Button>
            <Button onClick={adjustPoints} loading={saving}>
              确认调整
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="调整积分（正数增加，负数扣减）">
            <Input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-4 gap-2">
            {["100", "500", "1000", "-100"].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPoints(v)}
              >
                {v}
              </Button>
            ))}
          </div>
          <Field label="备注">
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="选填，如：活动赠送"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="编辑用户资料"
        description={
          editTarget
            ? `协助 ${editTarget.name} 修改昵称、手机号、账号状态或登录密码。`
            : ""
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              取消
            </Button>
            <Button form="edit-user-form" type="submit" loading={saving}>
              保存修改
            </Button>
          </>
        }
      >
        <form id="edit-user-form" onSubmit={saveUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="昵称">
              <Input
                value={editForm.name}
                onChange={(e) =>
                  setEditForm({ ...editForm, name: e.target.value })
                }
                maxLength={30}
                required
              />
            </Field>
            <Field label="手机号">
              <Input
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                inputMode="numeric"
                maxLength={11}
                required
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="账号状态">
              <Select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm({ ...editForm, status: e.target.value })
                }
              >
                <option value="ACTIVE">正常</option>
                <option value="DISABLED">停用</option>
              </Select>
            </Field>
            <Field label="新密码（选填）" hint="留空则不修改，至少 6 位">
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm({ ...editForm, password: e.target.value })
                }
                autoComplete="new-password"
                placeholder="留空不修改"
              />
            </Field>
          </div>
          <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">
            当前余额：
            {editTarget ? formatMoney(editTarget.balance) : "-"}，当前积分：
            {editTarget ? editTarget.points.toLocaleString() : "-"}
          </p>
        </form>
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增会员"
        description="创建后会员可使用手机号和密码登录小程序。"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              取消
            </Button>
            <Button form="create-user-form" type="submit" loading={saving}>
              创建
            </Button>
          </>
        }
      >
        <form id="create-user-form" onSubmit={createUser} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="昵称">
              <Input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                required
              />
            </Field>
            <Field label="手机号">
              <Input
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                required
              />
            </Field>
          </div>
          <Field label="初始密码">
            <Input
              value={newUser.password}
              onChange={(e) =>
                setNewUser({ ...newUser, password: e.target.value })
              }
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="初始余额（元）">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newUser.balance}
                onChange={(e) =>
                  setNewUser({ ...newUser, balance: e.target.value })
                }
                placeholder="0"
              />
            </Field>
            <Field label="初始积分">
              <Input
                type="number"
                min="0"
                value={newUser.points}
                onChange={(e) =>
                  setNewUser({ ...newUser, points: e.target.value })
                }
                placeholder="0"
              />
            </Field>
          </div>
        </form>
      </Modal>
    </div>
  );
}
