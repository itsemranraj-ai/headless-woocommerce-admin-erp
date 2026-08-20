import React from "react";
import { StockStatus } from "@/types";
import { cn } from "@/lib/utils";

export interface ProductStockBadgeProps {
  stockStatus: StockStatus | string;
  stockQuantity?: number | null;
  className?: string;
  size?: "sm" | "md";
}

export function ProductStockBadge({
  stockStatus,
  stockQuantity,
  className,
  size = "sm",
}: ProductStockBadgeProps) {
  const normStatus = stockStatus?.toLowerCase() || "instock";

  let label = "In Stock";
  let bg = "bg-emerald-500/10 border-emerald-500/30";
  let text = "text-emerald-400";
  let dot = "bg-emerald-400";

  if (normStatus === "outofstock" || (stockQuantity !== null && stockQuantity !== undefined && stockQuantity <= 0)) {
    label = "Out of Stock";
    bg = "bg-rose-500/10 border-rose-500/30";
    text = "text-rose-400";
    dot = "bg-rose-400";
  } else if (normStatus === "onbackorder") {
    label = "On Backorder";
    bg = "bg-amber-500/10 border-amber-500/30";
    text = "text-amber-400";
    dot = "bg-amber-400";
  }

  const isSmall = size === "sm";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium border tracking-wide whitespace-nowrap",
        isSmall ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs",
        bg,
        text,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
      {stockQuantity !== null && stockQuantity !== undefined && (
        <span className="opacity-75">({stockQuantity})</span>
      )}
    </span>
  );
}
