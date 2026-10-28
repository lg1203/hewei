"use client";

import {
  Download,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  QrCode,
  Table2,
  Trash2,
  UtensilsCrossed
} from "lucide-react";
import Link from "next/link";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageLoading } from "@/components/ui/Spinner";
import { deleteJson, patchJson, postJson } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type TableRow = {
  id: string;
  name: string;
  qrToken: string;
  status: string;
  sessions: {
    id: string;
    orders: { id: string; subtotal: number }[];
  }[];
};

export default function MerchantTablesPage() {
  const { data, loading, refresh } = useApi<{ tables: TableRow[] }>(
    "/api/merchant/tables"
  );
  const [open, setOpen] = useState(false);
  const [qrTable, setQrTable] = useState<TableRow | null>(null);
  const [qrData, setQrData] = useState("");
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const tables = data?.tables || [];

  useEffect(() => {
    if (!qrTable) {
      setQrData("");
      return;
    }
    const url = `${window.location.origin}/m/scan?token=${qrTable.qrToken}`;
    QRCode.toDataURL(url, {
      width: 640,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
      errorCorrectionLevel: "M"
    })
      .then(setQrData)
      .catch(() => toast.error("二维码生成失败"));
  }, [qrTable]);

  function openCreate() {
    setEditing(null);
    setName("");
    setOpen(true);
  }

  function openEdit(table: TableRow) {
    setEditing(table);
    setName(table.name);
    setOpen(true);
  }

  async function saveTable(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await patchJson(`/api/merchant/tables/${editing.id}`, { name });
        toast.success("桌台已更新");
      } else {
        await postJson("/api/merchant/tables", { name });
        toast.success("桌台已添加");
      }
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function removeTable(table: TableRow) {
    if (!window.confirm(`确定删除桌台「${table.name}」吗？`)) return;
    try {
      await deleteJson(`/api/merchant/tables/${table.id}`);
      toast.success("桌台已删除");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  }

  async function clearTable(table: TableRow) {
    if (!window.confirm(`确定将「${table.name}」清台为空闲状态吗？`)) return;
    try {
      await postJson(`/api/merchant/tables/${table.id}/clear`);
      toast.success("桌台已清空");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "清台失败");
    }
  }

  function copyLink(table: TableRow) {
    const url = `${window.location.origin}/m/scan?token=${table.qrToken}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("桌码链接已复制"))
      .catch(() => toast.error("复制失败"));
  }

  if (loading) return <PageLoading label="正在加载桌台" />;

  return (
    <div>
      <PageHeader
        title="桌码管理"
        description="为每张桌台生成专属二维码，用户扫码即可点餐；结账后桌台自动恢复空闲。"
        action={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            新增桌台
          </Button>
        }
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-ink-500">桌台总数</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{tables.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">用餐中</p>
          <p className="mt-2 text-2xl font-semibold text-brand-600">
            {tables.filter((t) => t.status === "OCCUPIED").length}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500">空闲</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-600">
            {tables.filter((t) => t.status === "IDLE").length}
          </p>
        </Card>
      </div>

      {tables.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => {
            const session = table.sessions[0];
            const pending = session?.orders || [];
            const pendingAmount = pending.reduce((sum, o) => sum + o.subtotal, 0);
            const occupied = table.status === "OCCUPIED";
            return (
              <Card key={table.id} className="overflow-hidden">
                <div
                  className={`h-1.5 w-full ${
                    occupied ? "bg-brand-400" : "bg-emerald-400"
                  }`}
                />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                          occupied
                            ? "bg-brand-50 text-brand-600"
                            : "bg-emerald-50 text-emerald-600"
                        }`}
                      >
                        <Table2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold tracking-tight text-ink-900">
                          {table.name}
                        </p>
                        <Badge tone={occupied ? "brand" : "green"} className="mt-1">
                          {occupied ? "用餐中" : "空闲"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(table)}
                        aria-label="编辑桌台"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-ink-400 hover:bg-rose-50 hover:text-rose-500"
                        onClick={() => removeTable(table)}
                        aria-label="删除桌台"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl bg-ink-50 px-3.5 py-3">
                    {occupied ? (
                      <>
                        <div className="flex items-center justify-between text-xs text-ink-500">
                          <span>当前待结账</span>
                          <span className="font-semibold text-ink-900">
                            {formatMoney(pendingAmount)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-500">
                          <span>待结账订单</span>
                          <span className="font-medium text-ink-700">
                            {pending.length} 笔
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-xs text-ink-400">
                        扫码即可开始点餐，结账后自动恢复空闲
                      </p>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQrTable(table)}
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      桌码
                    </Button>
                    {occupied ? (
                      <Link href={`/merchant/offline?table=${table.id}`}>
                        <Button size="sm" className="w-full">
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                          去结账
                        </Button>
                      </Link>
                    ) : (
                      <Link href={`/merchant/offline?table=${table.id}`}>
                        <Button size="sm" className="w-full">
                          <UtensilsCrossed className="h-3.5 w-3.5" />
                          线下点餐
                        </Button>
                      </Link>
                    )}
                  </div>
                  {occupied && pending.length === 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 w-full text-xs text-ink-400"
                      onClick={() => clearTable(table)}
                    >
                      清台
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<Table2 className="h-5 w-5" />}
            title="还没有桌台"
            description="添加桌台并打印二维码，用户即可扫码点餐"
            action={<Button onClick={openCreate}>新增桌台</Button>}
          />
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "编辑桌台" : "新增桌台"}
        description="桌台名称建议使用 A01、B02 这类易识别的编号。"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button form="table-form" type="submit" loading={saving}>
              保存
            </Button>
          </>
        }
      >
        <form id="table-form" onSubmit={saveTable}>
          <Field label="桌台名称">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="如：A01"
              required
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={Boolean(qrTable)}
        onClose={() => setQrTable(null)}
        title={`${qrTable?.name || ""} 桌码`}
        description="用户扫码后进入点餐页；可下载图片打印后贴在桌面。"
        footer={
          <>
            <Button variant="outline" onClick={() => qrTable && copyLink(qrTable)}>
              <Link2 className="h-4 w-4" />
              复制链接
            </Button>
            {qrData ? (
              <a href={qrData} download={`table-${qrTable?.name || "qr"}.png`}>
                <Button>
                  <Download className="h-4 w-4" />
                  下载桌码
                </Button>
              </a>
            ) : null}
          </>
        }
      >
        <div className="flex flex-col items-center">
          {qrData ? (
            <div className="rounded-2xl border border-ink-100 bg-white p-4">
              <img src={qrData} alt="桌码" className="h-56 w-56" />
            </div>
          ) : (
            <div className="flex h-56 w-56 items-center justify-center rounded-2xl bg-ink-50 text-xs text-ink-400">
              正在生成二维码
            </div>
          )}
          <p className="mt-4 text-sm font-medium text-ink-800">
            扫码点餐 · {qrTable?.name}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {typeof window !== "undefined"
              ? `${window.location.origin}/m/scan?token=${qrTable?.qrToken || ""}`
              : ""}
          </p>
          <a
            href={`/m/scan?token=${qrTable?.qrToken || ""}`}
            target="_blank"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            在浏览器中预览
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Modal>
    </div>
  );
}
