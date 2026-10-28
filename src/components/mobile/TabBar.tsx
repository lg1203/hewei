"use client";

import { Home, ReceiptText, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/m", label: "点餐", icon: Home },
  { href: "/m/orders", label: "订单", icon: ReceiptText },
  { href: "/m/me", label: "我的", icon: UserRound }
];

export function MobileTabBar() {
  const pathname = usePathname();
  const visible =
    pathname === "/m" ||
    pathname.startsWith("/m/orders") ||
    pathname.startsWith("/m/me") ||
    pathname.startsWith("/m/coupons");

  if (!visible) return null;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[480px] border-t border-ink-100 bg-white/95 backdrop-blur">
      <div className="grid grid-cols-3">
        {items.map((item) => {
          const active =
            item.href === "/m" ? pathname === "/m" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition",
                active ? "text-brand-600" : "text-ink-400 hover:text-ink-600"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", active ? "text-brand-500" : "text-ink-400")}
              />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
