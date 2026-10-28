"use client";

import {
  Megaphone,
  Pencil,
  Plus,
  Power,
  Trash2
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
import { formatDateTime } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type ActivityRow = {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  poster: string;
  link: string;
  status: string;
  sort: number;
  startAt: string | null;
  endAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  title: "",
  subtitle: "",
  content: "",
  poster: "",
  link: "",
  status: "ACTIVE",
  sort: "0",
  startAt: "",
  endAt: ""
};

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function activityState(activity: ActivityRow): {
  label: string;
  tone: "green" | "amber" | "slate";
} {
  if (activity.status !== "ACTIVE") return { label: "已停用", tone: "slate" };
  const now = Date.now();
  if (activity.startAt && new Date(activity.startAt).getTime() > now) {
    return { label: "未开始", tone: "amber" };
  }
  if (activity.endAt && new Date(activity.endAt).getTime() < now) {
    return { label: "已结束", tone: "slate" };
  }
  return { label: "展示中", tone: "green" };
}

export default function AdminActivitiesPage() {
  const { data, loading, refresh } = useApi<{ activities: ActivityRow[] }>(
    "/api/admin/activities"
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ActivityRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const activities = data?.activities || [];
  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: activities.length,
      showing: activities.filter((activity) => {
        if (activity.status !== "ACTIVE") return false;
        if (
          activity.startAt &&
          new Date(activity.startAt).getTime() > now
        ) {
          return false;
        }
        if (activity.endAt && new Date(activity.endAt).getTime() < now) {
          return false;
        }
        return true;
      }).length,
      disabled: activities.filter((activity) => activity.status !== "ACTIVE")
        .length
    };
  }, [activities]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(activity: ActivityRow) {
    setEditing(activity);
    setForm({
      title: activity.title,
      subtitle: activity.subtitle,
      content: activity.content,
      poster: activity.poster,
      link: activity.link,
      status: activity.status,
      sort: String(activity.sort),
      startAt: toDateTimeLocal(activity.startAt),
      endAt: toDateTimeLocal(activity.endAt)
    });
    setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.startAt && form.endAt) {
      if (new Date(form.endAt).getTime() <= new Date(form.startAt).getTime()) {
        toast.error("结束时间必须晚于开始时间");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        content: form.content,
        poster: form.poster.trim(),
        link: form.link.trim(),
        status: form.status,
        sort: Number(form.sort || 0),
        startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
        endAt: form.endAt ? new Date(form.endAt).toISOString() : null
      };
      if (editing) {
        await patchJson(`/api/admin/activities/${editing.id}`, payload);
        toast.success("活动已更新");
      } else {
        await postJson("/api/admin/activities", payload);
        toast.success("活动已创建");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(activity: ActivityRow) {
    try {
      await patchJson(`/api/admin/activities/${activity.id}`, {
        status: activity.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
      });
      toast.success(
        activity.status === "ACTIVE" ? "活动已停用" : "活动已启用"
      );
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function remove(activity: ActivityRow) {
    if (
      !window.confirm(
        `确定删除活动「${activity.title}」吗？删除后用户端将不再展示，且无法恢复。`
      )
    ) {
      return;
    }
    setDeletingId(activity.id);
    try {
      await deleteJson(`/api/admin/activities/${activity.id}`);
      toast.success("活动已删除");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId("");
    }
  }

  if (loading) return <PageLoading label="正在加载活动" />;

  return (
    <div>
      <PageHeader
        title="活动管理"
        description="配置用户端首页与活动列表展示的运营活动，支持海报、正文、跳转链接和展示时间。"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新建活动
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">活动总数</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">
            {stats.total}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">用户端展示中</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {stats.showing}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">已停用</p>
          <p className="mt-2 text-2xl font-semibold text-ink-400">
            {stats.disabled}
          </p>
        </Card>
      </div>

      <Card className="mt-5">
        <CardContent className="px-0 pb-0 pt-0">
          {activities.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] table-fixed border-collapse">
                <colgroup>
                  <col style={{ width: "38%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "22%" }} />
                </colgroup>
                <thead>
                  <tr className="table-head">
                    <th className="px-4 py-3 font-medium">活动</th>
                    <th className="px-3 py-3 font-medium">展示时间</th>
                    <th className="px-3 py-3 font-medium">排序</th>
                    <th className="px-3 py-3 font-medium">状态</th>
                    <th className="px-3 py-3 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => {
                    const state = activityState(activity);
                    return (
                      <tr key={activity.id} className="hover:bg-ink-50/60">
                        <td className="table-cell px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                              {activity.poster ? (
                                <img
                                  src={activity.poster}
                                  alt={activity.title}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-ink-400">
                                  <Megaphone className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium text-ink-900">
                                {activity.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-ink-400">
                                {activity.subtitle || "未填写副标题"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell px-3 text-xs text-ink-500">
                          <p className="whitespace-nowrap">
                            {activity.startAt
                              ? formatDateTime(activity.startAt)
                              : "立即展示"}
                          </p>
                          <p className="mt-0.5 whitespace-nowrap text-ink-400">
                            至{" "}
                            {activity.endAt
                              ? formatDateTime(activity.endAt)
                              : "长期有效"}
                          </p>
                        </td>
                        <td className="table-cell px-3 text-sm text-ink-600">
                          {activity.sort}
                        </td>
                        <td className="table-cell px-3">
                          <Badge tone={state.tone}>{state.label}</Badge>
                        </td>
                        <td className="table-cell px-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="编辑活动"
                              aria-label="编辑活动"
                              onClick={() => openEdit(activity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={
                                activity.status === "ACTIVE"
                                  ? "停用活动"
                                  : "启用活动"
                              }
                              aria-label={
                                activity.status === "ACTIVE"
                                  ? "停用活动"
                                  : "启用活动"
                              }
                              className={
                                activity.status === "ACTIVE"
                                  ? "text-rose-500 hover:bg-rose-50"
                                  : "text-emerald-600 hover:bg-emerald-50"
                              }
                              onClick={() => toggle(activity)}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="删除活动"
                              aria-label="删除活动"
                              className="text-rose-500 hover:bg-rose-50"
                              loading={deletingId === activity.id}
                              onClick={() => remove(activity)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Megaphone className="h-5 w-5" />}
              title="还没有活动"
              description="新建活动后，用户端首页与活动列表会自动展示"
              action={<Button onClick={openCreate}>新建活动</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑活动" : "新建活动"}
        description="活动海报建议使用横版图片；开始和结束时间留空表示长期展示。"
        className="max-w-2xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button form="activity-form" type="submit" loading={saving}>
              {editing ? "保存修改" : "创建活动"}
            </Button>
          </>
        }
      >
        <form id="activity-form" onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_130px]">
            <Field label="活动标题">
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="如：新客首单立减"
                maxLength={60}
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

          <Field label="副标题">
            <Input
              value={form.subtitle}
              onChange={(e) =>
                setForm({ ...form, subtitle: e.target.value })
              }
              placeholder="一句话说明活动亮点"
              maxLength={80}
            />
          </Field>

          <Field
            label="活动海报图片 URL"
            hint="支持 http(s) 图片地址或站内路径，留空则显示默认渐变封面"
          >
            <Input
              value={form.poster}
              onChange={(e) => setForm({ ...form, poster: e.target.value })}
              placeholder="https://images.unsplash.com/..."
            />
          </Field>
          {form.poster ? (
            <div className="overflow-hidden rounded-xl border border-ink-100 bg-ink-50">
              <img
                key={form.poster}
                src={form.poster}
                alt="活动海报预览"
                className="h-40 w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="跳转链接" hint="可填 /m/coupons 或完整 https 链接">
              <Input
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                placeholder="/m/coupons"
              />
            </Field>
            <Field label="展示状态">
              <Select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value })
                }
              >
                <option value="ACTIVE">展示</option>
                <option value="DISABLED">停用</option>
              </Select>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="开始时间（留空为立即）">
              <Input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) =>
                  setForm({ ...form, startAt: e.target.value })
                }
              />
            </Field>
            <Field label="结束时间（留空为长期）">
              <Input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </Field>
          </div>

          <Field label="活动正文">
            <Textarea
              rows={5}
              value={form.content}
              onChange={(e) =>
                setForm({ ...form, content: e.target.value })
              }
              placeholder="填写活动规则、参与方式等，支持换行"
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
