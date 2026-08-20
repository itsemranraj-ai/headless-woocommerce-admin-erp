import React from "react";
import { OrderStatus } from "@/types";
import { ORDER_STATUS_CONFIG } from "@/config/constants";
import { cn } from "@/lib/utils";

export interface OrderStatusBadgeProps {
  status: OrderStatus | string;
  className?: string;
  size?: "sm" | "md";
}

const statusVariants: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  pending: {
    bg: "bg-amber-50 border-amber-200/80",
    text: "text-amber-800",
    dot: "bg-amber-500",
    label: "Pending",
  },
  processing: {
    bg: "bg-blue-50 border-blue-200/80",
    text: "text-blue-700",
    dot: "bg-blue-500",
    label: "Processing",
  },
  "on-hold": {
    bg: "bg-orange-50 border-orange-200/80",
    text: "text-orange-800",
    dot: "bg-orange-500",
    label: "On Hold",
  },
  completed: {
    bg: "bg-emerald-50 border-emerald-200/80",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-rose-50 border-rose-200/80",
    text: "text-rose-700",
    dot: "bg-rose-500",
    label: "Cancelled",
  },
  refunded: {
    bg: "bg-purple-50 border-purple-200/80",
    text: "text-purple-700",
    dot: "bg-purple-500",
    label: "Refunded",
  },
  failed: {
    bg: "bg-rose-50 border-rose-200/80",
    text: "text-rose-700",
    dot: "bg-rose-500",
    label: "Failed",
  },
  trash: {
    bg: "bg-slate-100 border-slate-200/80",
    text: "text-slate-700",
    dot: "bg-slate-500",
    label: "Trash",
  },
};

export function OrderStatusBadge({
  status,
  className,
  size = "sm",
}: OrderStatusBadgeProps) {
  const normStatus = status?.toLowerCase() || "pending";
  const variant = statusVariants[normStatus] || {
    bg: "bg-slate-100 border-slate-200/80",
    text: "text-slate-700",
    dot: "bg-slate-500",
    label: ORDER_STATUS_CONFIG[normStatus as OrderStatus]?.label || status,
  };

  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold border tracking-wide whitespace-nowrap",
        isSmall ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        variant.bg,
        variant.text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", variant.dot)} />
      {variant.label}
    </span>
  );
}
