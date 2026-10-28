"use client";

import {
  ArrowRight,
  ChefHat,
  ChevronLeft,
  Clock,
  Loader2,
  MapPin,
  QrCode,
  ScanLine,
  Table2,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ApiError, postJson } from "@/lib/api";
import { useApi } from "@/lib/useApi";

type TableInfo = {
  table: {
    id: string;
    name: string;
    status: string;
    qrToken: string;
    shop: {
      id: string;
      name: string;
      status: string;
      address: string;
      businessHours: string;
    };
    sessionId: string | null;
  };
};

type SessionResponse = {
  session: { id: string; tableId: string; shopId: string };
  shop: { id: string; name: string; address: string; businessHours: string };
  table: { id: string; name: string };
};

const DEMO_TOKENS = ["demo-a01", "demo-a02", "demo-a03", "demo-b01", "demo-b02"];

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [input, setInput] = useState(token);
  const [starting, setStarting] = useState(false);

  const { data, loading, error } = useApi<TableInfo>(
    token ? `/api/public/tables/${encodeURIComponent(token)}` : null
  );

  async function startOrder() {
    if (!data) return;
    setStarting(true);
    try {
      const res = await postJson<SessionResponse>("/api/user/sessions", {
        tableToken: token
      });
      toast.success(`已开桌：${res.table.name}`);
      router.push(
        `/m/shop/${res.shop.id}?session=${res.session.id}&table=${encodeURIComponent(
          token
        )}`
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const redirect = `/m/scan?token=${encodeURIComponent(token)}`;
        router.push(`/m/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }
      toast.error(err instanceof Error ? err.message : "开桌失败");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="bg-gradient-to-br from-brand-500 to-orange-400 px-4 pb-14 pt-4 text-white">
        <div className="flex h-10 items-center">
          <Link
            href="/m"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <p className="ml-3 text-sm font-medium">扫码点餐</p>
        </div>
        <div className="mt-7 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
            <ScanLine className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">扫描桌码开始点餐</h1>
            <p className="mt-1 text-xs text-white/70">已为您准备好菜单与优惠</p>
          </div>
        </div>
      </div>

      <div className="-mt-8 px-4">
        {!token ? (
          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
                <QrCode className="h-8 w-8" />
              </div>
              <p className="mt-4 text-sm font-semibold text-ink-900">输入桌码编号</p>
              <p className="mt-1 text-xs leading-5 text-ink-400">
                扫描桌角二维码会自动识别；也可以手动输入桌码进入点餐。
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!input.trim()) {
                  toast.error("请输入桌码");
                  return;
                }
                router.push(`/m/scan?token=${encodeURIComponent(input.trim())}`);
              }}
              className="mt-2 space-y-3"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="请输入桌码，如 demo-a01"
                className="h-12 text-center"
              />
              <Button type="submit" size="lg" className="w-full">
                进入点餐
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-5 rounded-xl bg-ink-50 p-3">
              <p className="text-[11px] font-medium text-ink-500">演示桌码</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_TOKENS.map((item) => (
                  <button
                    key={item}
                    onClick={() =>
                      router.push(`/m/scan?token=${encodeURIComponent(item)}`)
                    }
                    className="rounded-lg border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ink-600 transition hover:border-brand-300 hover:text-brand-600"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center rounded-2xl bg-white py-16 shadow-card">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="mt-3 text-xs text-ink-400">正在识别桌码</p>
          </div>
        ) : error || !data ? (
          <div className="rounded-2xl bg-white p-6 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <QrCode className="h-7 w-7" />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-900">桌码无法识别</p>
            <p className="mt-1 text-xs leading-5 text-ink-400">
              {error || "桌码无效或门店已停业，请重新扫描桌角二维码。"}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => router.push("/m/scan")}>
                重新输入
              </Button>
              <Button onClick={() => router.push("/m")}>返回首页</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                    <Table2 className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold tracking-tight text-ink-900">
                      {data.table.shop.name}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      桌台 {data.table.name}
                    </p>
                  </div>
                </div>
                <Badge tone={data.table.status === "OCCUPIED" ? "brand" : "green"}>
                  {data.table.status === "OCCUPIED" ? "用餐中" : "空闲"}
                </Badge>
              </div>

              <div className="mt-4 space-y-2.5 rounded-xl bg-ink-50 p-3.5 text-xs text-ink-500">
                <p className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-ink-400" />
                  {data.table.shop.address || "门店地址待完善"}
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-ink-400" />
                  营业时间 {data.table.shop.businessHours}
                </p>
                {data.table.sessionId ? (
                  <p className="flex items-center gap-2 text-brand-600">
                    <Users className="h-3.5 w-3.5" />
                    该桌台正在用餐，加入后可一起点餐与结账
                  </p>
                ) : (
                  <p className="flex items-center gap-2">
                    <ChefHat className="h-3.5 w-3.5 text-ink-400" />
                    开桌后即可点餐，结账后桌台自动恢复空闲
                  </p>
                )}
              </div>

              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={startOrder}
                loading={starting}
              >
                {data.table.sessionId ? "加入桌台并点餐" : "开始点餐"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="mt-2 text-center text-[10px] text-ink-400">
                未登录时会先跳转登录，登录后自动继续
              </p>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-[11px] font-medium text-ink-500">当前桌码</p>
              <p className="mt-1 font-mono text-xs text-ink-700">{token}</p>
              <button
                onClick={() => router.push("/m/scan")}
                className="mt-2 text-[11px] font-medium text-brand-600"
              >
                切换其他桌码
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MobileScanPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <ScanContent />
    </Suspense>
  );
}
