import React from "react";
import Image from "next/image";

export const metadata = {
  title: "Under Scheduled Maintenance | Store Admin ERP",
  description: "Headless WooCommerce ERP Portal is currently undergoing scheduled maintenance.",
};

export default function MaintenancePage() {
  return (
    <div className="min-h-screen w-full bg-[#0d0f12] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-lg w-full text-center space-y-8 bg-[#16181d]/90 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border border-slate-800 shadow-2xl">
        {/* Brand DNA Logo */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-black/60 border border-slate-700/60 p-3 shadow-inner flex items-center justify-center relative">
            <Image
              src="/brand-dna.png"
              alt="Store ERP DNA"
              width={64}
              height={64}
              priority
              className="object-contain drop-shadow-md"
            />
            <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-[#16181d]" />
            </span>
          </div>
        </div>

        {/* Title & Badge */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Maintenance Mode Active
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            System Under Scheduled Maintenance
          </h1>

          <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            Store ERP Management & Sales Portal is currently undergoing server infrastructure upgrades. Access is temporarily suspended for all users.
          </p>
        </div>

        {/* Progress Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 text-left space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Status</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              Server Migration in Progress
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-emerald-500 h-1.5 rounded-full w-3/4 animate-pulse" />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Security & Realtime Upgrade</span>
            <span>Coming back online shortly</span>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-[11px] text-slate-500 font-medium border-t border-slate-800/80">
          Store ERP Internal Operations Portal • 2026
        </div>
      </div>
    </div>
  );
}
