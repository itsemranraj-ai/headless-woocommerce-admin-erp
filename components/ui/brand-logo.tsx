import React from "react";

export function BrandLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 border border-indigo-500/30 shadow-md overflow-hidden shrink-0 ${className}`}
    >
      <div className="absolute inset-0 bg-indigo-500/10 pointer-events-none" />
      <svg
        className="w-3/4 h-3/4 relative z-10 drop-shadow-sm"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="logoHandleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
          <linearGradient id="logoBagGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
        </defs>

        {/* Store / Bag Arc Handle */}
        <path
          d="M34 32 C34 20 42 14 50 14 C58 14 66 20 66 32"
          stroke="url(#logoHandleGrad)"
          strokeWidth="6.5"
          strokeLinecap="round"
        />

        {/* Modern Angular Commerce Body */}
        <path
          d="M20 34 L80 34 C83.5 34 86 37 85 41 L77 81 C76 84.5 73 87 69 87 L31 87 C27 87 24 84.5 23 81 L15 41 C14 37 16.5 34 20 34 Z"
          fill="url(#logoBagGrad)"
        />

        {/* High-Speed Sync Lightning Bolt */}
        <path
          d="M54 40 L38 58 L48 58 L44 76 L62 54 L52 54 Z"
          fill="#ffffff"
        />
      </svg>
    </div>
  );
}
