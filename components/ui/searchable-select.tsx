"use client";

import React, { useState, useRef, useEffect } from "react";

interface SearchableSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type...",
  className = "",
  name,
  required = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync internal query when value prop changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = query
    ? options.filter((opt) => opt.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          name={name}
          value={query}
          required={required}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            onChange(next);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full bg-slate-50 border border-slate-200 rounded-2xl pl-4 pr-9 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Floating Scrollable Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {filtered.length > 0 ? (
            filtered.map((opt) => (
              <button
                key={opt}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setQuery(opt);
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-between ${
                  (value || "").toLowerCase() === opt.toLowerCase()
                    ? "bg-[#18181B] text-white font-bold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{opt}</span>
                {(value || "").toLowerCase() === opt.toLowerCase() && <span className="text-xs">✓</span>}
              </button>
            ))
          ) : (
            <div className="px-3.5 py-2.5 text-xs text-slate-500 font-medium italic flex items-center justify-between">
              <span>Use &quot;{query}&quot;</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">Custom</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
