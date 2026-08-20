"use client";

import React, { useState } from "react";
import { OrderNote } from "@/types";
import { formatDate } from "@/lib/utils";

export interface OrderNoteSectionProps {
  orderId: number;
  initialNotes?: OrderNote[];
}

export function OrderNoteSection({ orderId, initialNotes = [] }: OrderNoteSectionProps) {
  const [notes, setNotes] = useState<OrderNote[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [isCustomerNote, setIsCustomerNote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: newNote.trim(),
          customer_note: isCustomerNote,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to add note.");
      }

      setNotes((prev) => [json.data, ...prev]);
      setNewNote("");
      setIsCustomerNote(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Note Creation Form */}
      <form onSubmit={handleAddNote} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3.5 shadow-2xs">
        <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
          Add Order Note
        </h4>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-xs font-bold text-rose-800">
            {error}
          </div>
        )}

        <textarea
          rows={3}
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an internal comment or customer note..."
          disabled={loading}
          className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none font-medium"
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCustomerNote}
              onChange={(e) => setIsCustomerNote(e.target.checked)}
              disabled={loading}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
            />
            <span className="text-xs font-bold text-slate-700">
              Note to customer (email notification)
            </span>
          </label>

          <button
            type="submit"
            disabled={loading || !newNote.trim()}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-40 shadow-sm active:scale-95"
          >
            {loading && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            <span>Add Note</span>
          </button>
        </div>
      </form>

      {/* Notes Feed */}
      <div className="space-y-3">
        <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider">
          Order Activity ({notes.length})
        </h4>

        {notes.length === 0 ? (
          <p className="text-xs text-slate-500 font-medium italic py-2">
            No notes logged for this order yet.
          </p>
        ) : (
          notes.map((item) => (
            <div
              key={item.id}
              className={`rounded-2xl border p-4 text-xs space-y-2 ${
                item.customer_note
                  ? "border-sky-200 bg-sky-50/70 text-slate-900"
                  : "border-slate-200 bg-white text-slate-900 shadow-2xs"
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-slate-900">
                    {item.author || "System / Admin"}
                  </span>
                  {item.customer_note ? (
                    <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                      Customer Note
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                      Internal Note
                    </span>
                  )}
                </div>
                <span className="text-slate-500 font-mono text-[10px] font-medium">
                  {formatDate(item.date_created)}
                </span>
              </div>
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed font-medium">
                {item.note}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
