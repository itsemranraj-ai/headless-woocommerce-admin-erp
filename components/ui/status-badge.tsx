import React from "react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  status: string;
  variant?: "emerald" | "blue" | "amber" | "slate" | "rose" | "indigo";
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, { bg: string; text: string; dot: string }> = {
  emerald: {
    bg: "bg-emerald-50 border-emerald-200/80",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  blue: {
    bg: "bg-sky-50 border-sky-200/80",
    text: "text-sky-700",
    dot: "bg-sky-500",
  },
  amber: {
    bg: "bg-amber-50 border-amber-200/80",
    text: "text-amber-800",
    dot: "bg-amber-500",
  },
  slate: {
    bg: "bg-slate-100 border-slate-200/80",
    text: "text-slate-700",
    dot: "bg-slate-500",
  },
  rose: {
    bg: "bg-rose-50 border-rose-200/80",
    text: "text-rose-700",
    dot: "bg-rose-500",
  },
  indigo: {
    bg: "bg-indigo-50 border-indigo-200/80",
    text: "text-indigo-700",
    dot: "bg-indigo-500",
  },
};

export function StatusBadge({
  status,
  variant = "blue",
  className,
  dot = true,
}: StatusBadgeProps) {
  const styles = variantStyles[variant] || variantStyles.blue;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border tracking-wide",
        styles.bg,
        styles.text,
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full", styles.dot)} />}
      {status}
    </span>
  );
}
