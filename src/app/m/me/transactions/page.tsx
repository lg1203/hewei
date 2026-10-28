"use client";

import { ChevronLeft, Coins, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageLoading } from "@/components/ui/Spinner";
import { BALANCE_TYPE_LABEL, POINT_TYPE_LABEL } from "@/lib/constants";
import { cn, formatDateTime, formatMoney } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

type Tx = {
  id: string;
  amount: number;
  type: string;
  note: string;
  createdAt: string;
};

type TxResponse = { points: Tx[]; balance: Tx[] };

function TransactionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "balance" ? "balance" : "points";
  const [tab, setTab] = useState<"points" | "balance">(initialTab);

  const { data, loading, error } = useApi<TxResponse>("/api/user/transactions");

  const list = tab === "points" ? data?.points || [] : data?.balance || [];

  function switchTab(next: "points" | "balance") {
    setTab(next);
    router.replace(`/m/me/transactions?tab=${next}`);
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-ink-100 bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center px-3">
          <button
            onClick={() => router.push("/m/me")}
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500"
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <p className="ml-1 text-sm font-semibold text-ink-900">资金明细</p>
        </div>
        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-xl bg-ink-50 p-1">
            {[
              { key: "points", label: "积分明细", icon: Coins },
              { key: "balance", label: "余额明细", icon: Wallet }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => switchTab(item.key as "points" | "balance")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
                  tab === item.key
                    ? "bg-white text-ink-900 shadow-sm"
                    : "text-ink-500"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-4">
        {loading ? (
          <PageLoading label="正在加载明细" />
        ) : error ? (
          <div className="rounded-2xl bg-white py-14 text-center shadow-card">
            <p className="text-sm font-semibold text-ink-900">请先登录</p>
            <p className="mt-1 text-xs text-ink-400">{error}</p>
            <Link
              href={`/m/login?redirect=${encodeURIComponent(
                `/m/me/transactions?tab=${tab}`
              )}`}
              className="mt-4 inline-block rounded-xl bg-brand-500 px-4 py-2 text-xs font-medium text-white"
            >
              去登录
            </Link>
          </div>
        ) : list.length ? (
          <div className="overflow-hidden rounded-2xl bg-white shadow-card">
            {list.map((tx) => {
              const positive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 border-b border-ink-100 px-4 py-3.5 last:border-b-0"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      tab === "points"
                        ? "bg-violet-50 text-violet-500"
                        : positive
                          ? "bg-emerald-50 text-emerald-500"
                          : "bg-rose-50 text-rose-500"
                    )}
                  >
                    {tab === "points" ? (
                      <Coins className="h-4 w-4" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-ink-800">
                      {tx.note ||
                        (tab === "points"
                          ? POINT_TYPE_LABEL[tx.type]
                          : BALANCE_TYPE_LABEL[tx.type]) ||
                        "资金变动"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-ink-400">
                      {formatDateTime(tx.createdAt)} ·{" "}
                      {tab === "points"
                        ? POINT_TYPE_LABEL[tx.type] || tx.type
                        : BALANCE_TYPE_LABEL[tx.type] || tx.type}
                    </p>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      positive ? "text-emerald-600" : "text-rose-500"
                    )}
                  >
                    {positive ? "+" : ""}
                    {tab === "points" ? tx.amount : formatMoney(tx.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white py-16 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-50 text-ink-300">
              {tab === "points" ? (
                <Coins className="h-7 w-7" />
              ) : (
                <Wallet className="h-7 w-7" />
              )}
            </div>
            <p className="mt-4 text-xs text-ink-400">
              暂无{tab === "points" ? "积分" : "余额"}变动记录
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-sm text-ink-400">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          加载中
        </div>
      }
    >
      <TransactionsContent />
    </Suspense>
  );
}
