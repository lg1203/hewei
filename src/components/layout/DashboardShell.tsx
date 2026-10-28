"use client";

import {
  ChefHat,
  Crown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  QrCode,
  ReceiptText,
  Settings,
  Store,
  TicketPercent,
  Users,
  UtensilsCrossed
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { postJson } from "@/lib/api";

const iconMap = {
  LayoutDashboard,
  Store,
  Users,
  TicketPercent,
  ReceiptText,
  Settings,
  UtensilsCrossed,
  ChefHat,
  QrCode,
  Megaphone,
  Crown
} as const;

export type NavItem = {
  href: string;
  label: string;
  icon: keyof typeof iconMap;
};

export function DashboardShell({
  nav,
  roleLabel,
  name,
  subtitle,
  children,
  variant = "admin"
}: {
  nav: readonly NavItem[];
  roleLabel: string;
  name: string;
  subtitle: string;
  children: React.ReactNode;
  variant?: "admin" | "merchant";
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    try {
      await postJson("/api/auth/logout");
      toast.success("已退出登录");
      router.replace(variant === "admin" ? "/admin/login" : "/merchant/login");
      router.refresh();
    } catch {
      toast.error("退出失败");
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-ink-100 bg-white lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-ink-100 px-5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm",
              variant === "admin" ? "bg-ink-900" : "bg-brand-500"
            )}
          >
            <ChefHat className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-ink-900">禾味点餐</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-ink-400">
              {variant === "admin" ? "Platform" : "Merchant"}
            </p>
          </div>
        </div>

        <div className="px-3 py-4">
          <div className="rounded-xl bg-ink-50 px-3 py-2.5">
            <p className="text-[11px] text-ink-400">{roleLabel}</p>
            <p className="mt-0.5 truncate text-sm font-medium text-ink-800">{name}</p>
            <p className="mt-0.5 truncate text-[11px] text-ink-400">{subtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {nav.map((item) => {
            const Icon = iconMap[item.icon];
            const active =
              item.href === (variant === "admin" ? "/admin" : "/merchant")
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? variant === "admin"
                      ? "bg-ink-900 text-white shadow-sm"
                      : "bg-brand-500 text-white shadow-sm"
                    : "text-ink-500 hover:bg-ink-50 hover:text-ink-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4",
                    active ? "text-white" : "text-ink-400 group-hover:text-ink-700"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-ink-100 p-3">
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ink-500 transition hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur-lg">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-white",
                  variant === "admin" ? "bg-ink-900" : "bg-brand-500"
                )}
              >
                <ChefHat className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">禾味点餐</p>
                <p className="text-[10px] text-ink-400">{roleLabel}</p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm font-medium text-ink-700">{subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-xs font-medium text-ink-700">{name}</p>
                <p className="text-[11px] text-ink-400">{roleLabel}</p>
              </div>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white",
                  variant === "admin" ? "bg-ink-900" : "bg-brand-500"
                )}
              >
                {name.slice(0, 1)}
              </div>
              <button
                onClick={logout}
                className="rounded-lg p-2 text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 lg:hidden"
                aria-label="退出登录"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="no-scrollbar flex gap-1 overflow-x-auto border-t border-ink-100 px-3 py-2 lg:hidden">
            {nav.map((item) => {
              const Icon = iconMap[item.icon];
              const active =
                item.href === (variant === "admin" ? "/admin" : "/merchant")
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                    active
                      ? variant === "admin"
                        ? "bg-ink-900 text-white"
                        : "bg-brand-500 text-white"
                      : "text-ink-500 hover:bg-ink-100"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </header>

        <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
