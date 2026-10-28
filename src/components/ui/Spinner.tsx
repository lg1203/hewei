import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-r-brand-500",
        className
      )}
    />
  );
}

export function PageLoading({ label = "加载中" }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-sm text-ink-400">
      <Spinner />
      {label}
    </div>
  );
}
