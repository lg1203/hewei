import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
  className
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "brand" | "green" | "blue" | "violet" | "amber";
  className?: string;
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-sky-50 text-sky-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600"
  };
  return (
    <div className={cn("card p-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-500">{label}</p>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
            {value}
          </div>
          {hint ? <div className="mt-1.5 text-xs text-ink-400">{hint}</div> : null}
        </div>
        {icon ? (
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              tones[tone]
            )}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
