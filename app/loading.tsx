import React from "react";

export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-slate-700 border-t-sky-400 animate-spin" />
        <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">
          Loading Store ERP System...
        </p>
      </div>
    </div>
  );
}
