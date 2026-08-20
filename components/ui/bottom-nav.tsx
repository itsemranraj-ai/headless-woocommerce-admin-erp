"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/contexts/notification-context";

export function BottomNav() {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const { unreadCount, toggleNotifications } = useNotifications();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        setIsAuthenticated(Boolean(json.data?.authenticated));
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [pathname]);

  // Close action sheet on route changes
  useEffect(() => {
    setActionSheetOpen(false);
  }, [pathname]);

  if (pathname === "/login" || !isAuthenticated) {
    return null;
  }

  const navItems = [
    {
      label: "Home",
      href: "/",
      active: pathname === "/",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "Orders",
      href: "/orders",
      active: pathname.startsWith("/orders") && pathname !== "/orders/new",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
    },
    {
      label: "Create",
      isAction: true,
      icon: (
        <svg
          className={`w-5 h-5 transition-transform duration-200 ${actionSheetOpen ? "rotate-45" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: "Products",
      href: "/products",
      active: pathname.startsWith("/products"),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      label: "Alerts",
      href: "/notifications",
      active: pathname === "/notifications",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Quick Action Bottom Sheet Modal */}
      {actionSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div
            onClick={() => setActionSheetOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
          />
          <div className="relative bg-white rounded-t-3xl p-5 pb-8 shadow-2xl border-t border-slate-200 z-10 space-y-4 animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2" />

            <div className="text-center pb-2">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Quick Actions
              </h3>
              <p className="text-[11px] text-slate-500">Choose what you want to create</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Add New Product */}
              <Link
                href="/products/new"
                onClick={() => setActionSheetOpen(false)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-98 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-[#18181B] text-white flex items-center justify-center text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  🏷️
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Add New Product</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold uppercase">
                      WooCommerce
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Create simple or variable product with variations & photos
                  </p>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </Link>

              {/* Create New Order */}
              <Link
                href="/orders/new"
                onClick={() => setActionSheetOpen(false)}
                className="flex items-center gap-4 p-4 rounded-2xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 active:scale-98 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-md shrink-0 group-hover:scale-105 transition-transform">
                  📝
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">Create New Order</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase">
                      Manual Order
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Manual customer order with live WooCommerce sync
                  </p>
                </div>
                <span className="text-slate-400 font-bold">→</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setActionSheetOpen(false)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-extrabold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bottom Nav Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200/80 px-3 py-1.5 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {navItems.map((item) => {
            if (item.isAction) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setActionSheetOpen((prev) => !prev)}
                  className="flex flex-col items-center justify-center -mt-5 group cursor-pointer focus:outline-none relative px-2"
                >
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-all duration-200 active:scale-95 border-2 border-white ring-1 ring-slate-900/10 ${
                      actionSheetOpen
                        ? "bg-rose-600 text-white ring-4 ring-rose-600/30 rotate-45"
                        : "bg-[#18181B] hover:bg-black text-white shadow-slate-900/30"
                    }`}
                  >
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-800 mt-1">
                    {item.label}
                  </span>
                </button>
              );
            }

            if (item.label === "Alerts") {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={toggleNotifications}
                  className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 active:scale-90 cursor-pointer ${
                    pathname === "/notifications"
                      ? "text-slate-950 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <div className="relative">
                    {item.icon}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center border border-white animate-pulse">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                    {pathname === "/notifications" && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-950" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 font-bold">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.label}
                href={item.href!}
                className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 active:scale-90 ${
                  item.active
                    ? "text-slate-950 font-bold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="relative">
                  {item.icon}
                  {item.active && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-slate-950" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    item.active ? "text-slate-950 font-bold" : "text-slate-500"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

