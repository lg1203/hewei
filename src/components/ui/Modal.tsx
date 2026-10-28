"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-float",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-ink-100 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold text-ink-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-xs leading-5 text-ink-500">{description}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
