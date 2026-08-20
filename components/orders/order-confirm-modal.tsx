"use client";

import React, { useState } from "react";

export interface OrderConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "rose" | "amber";
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function OrderConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel,
  variant = "rose",
  onClose,
  onConfirm,
}: OrderConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const isRose = variant === "rose";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 shadow-2xl p-6">
        <div className="flex items-start gap-3.5">
          <div
            className={`p-2 rounded-full shrink-0 ${
              isRose ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white">{title}</h3>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white transition-colors disabled:opacity-50 ${
              isRose
                ? "bg-rose-600 hover:bg-rose-500"
                : "bg-amber-600 hover:bg-amber-500"
            }`}
          >
            {loading && (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
