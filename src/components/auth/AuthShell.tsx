import { ChefHat, ShieldCheck, Sparkles, Store } from "lucide-react";

export function AuthShell({
  children,
  eyebrow,
  title,
  description
}: {
  children: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden w-[46%] overflow-hidden bg-ink-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(249,115,22,.28),transparent_35%),radial-gradient(circle_at_80%_80%,rgba(251,146,60,.18),transparent_35%)]" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 shadow-lg shadow-brand-500/20">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight">禾味点餐</p>
              <p className="text-xs text-white/50">HEWEI DINING OS</p>
            </div>
          </div>

          <div className="mt-20 max-w-md">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-300">
              {eyebrow}
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              {title}
            </h1>
            <p className="mt-4 text-sm leading-7 text-white/60">{description}</p>
          </div>

          <div className="mt-14 space-y-4">
            {[
              { icon: Store, text: "商户独立管理菜品、桌码与优惠券" },
              { icon: Sparkles, text: "扫码点餐、积分抵扣、桌台状态实时同步" },
              { icon: ShieldCheck, text: "平台统一管理商户、用户与资金流水" }
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 text-sm text-white/70">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                  <item.icon className="h-4 w-4 text-brand-300" />
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/35">
          <span>© 2026 禾味点餐</span>
          <span>Admin / Merchant Console</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">{children}</div>
      </div>
    </div>
  );
}
