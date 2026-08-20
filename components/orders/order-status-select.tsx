"use client";

import React, { useState } from "react";
import { OrderStatus } from "@/types";

export interface OrderStatusSelectProps {
  orderId: number;
  currentStatus: OrderStatus | string;
  onStatusChange?: (newStatus: OrderStatus) => void;
  disabled?: boolean;
}

const AVAILABLE_STATUSES: Array<{ value: OrderStatus; label: string }> = [
  { value: "pending", label: "Pending Payment" },
  { value: "processing", label: "Processing" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "trash", label: "Trash" },
];

export function OrderStatusSelect({
  orderId,
  currentStatus,
  onStatusChange,
  disabled = false,
}: OrderStatusSelectProps) {
  const [status, setStatus] = useState<string>(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextStatus = e.target.value as OrderStatus;
    if (nextStatus === status) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update order status.");
      }

      setStatus(nextStatus);
      setSuccess(true);
      if (onStatusChange) {
        onStatusChange(nextStatus);
      }

      setTimeout(() => setSuccess(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      <div className="relative inline-flex items-center">
        <select
          value={status}
          onChange={handleChange}
          disabled={disabled || loading}
          className="appearance-none bg-white border border-slate-200 text-slate-900 font-extrabold text-xs rounded-2xl px-4 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
        >
          {AVAILABLE_STATUSES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-3 flex items-center text-slate-500">
          {loading ? (
            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {success && (
        <span className="text-[11px] text-emerald-700 font-bold">
          ✓ Status updated to {status}
        </span>
      )}
      {error && (
        <span className="text-[11px] text-rose-700 font-bold">
          {error}
        </span>
      )}
    </div>
  );
}
