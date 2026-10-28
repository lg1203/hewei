import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "brand" | "green" | "amber" | "slate" | "red" | "blue";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200"
};

export function Badge({
  tone = "slate",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
