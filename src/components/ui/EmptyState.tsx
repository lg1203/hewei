import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title = "暂无数据",
  description,
  action,
  className,
  icon
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center px-6 py-14 text-center",
        className
      )}
    >
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        {icon || <Inbox className="h-5 w-5" />}
      </div>
      <p className="text-sm font-medium text-ink-700">{title}</p>
      {description ? (
        <p className="mt-1 max-w-xs text-xs leading-5 text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
