"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useNotifications } from "@/contexts/notification-context";

const USER_CACHE_KEY = "ff_user_session_v1";

export function Header() {
  const isOnline = useOnlineStatus();
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (cached) return true;
      } catch {
        // Ignore
      }
    }
    return null;
  });
  const [user, setUser] = useState<{ username?: string; role?: string } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(USER_CACHE_KEY);
        if (cached) return JSON.parse(cached);
      } catch {
        // Ignore
      }
    }
    return null;
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { notifications, unreadCount, markAsRead, markAllAsRead, toggleNotifications } = useNotifications();

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        const isAuth = Boolean(json.data?.authenticated);
        setIsAuthenticated(isAuth);
        if (json.data?.user) {
          setUser(json.data.user);
          try {
            localStorage.setItem(USER_CACHE_KEY, JSON.stringify(json.data.user));
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });
  }, [pathname]);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      try {
        localStorage.removeItem(USER_CACHE_KEY);
      } catch {
        // Ignore
      }
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setUser(null);
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      // Ignore
    }
  };

  const isLoginPage = pathname === "/login";
  const isStaff = user?.role === "staff";

  const navSections = isStaff
    ? [
        {
          title: "OPERATIONS",
          items: [
            {
              label: "Orders Stream",
              href: "/orders",
              active: pathname.startsWith("/orders") && pathname !== "/orders/new",
              icon: "📦",
            },
            {
              label: "Create Order",
              href: "/orders/new",
              active: pathname === "/orders/new",
              icon: "📝",
            },
            {
              label: "Product Catalog",
              href: "/products",
              active: pathname === "/products",
              icon: "🏷️",
            },
          ],
        },
      ]
    : [
        {
          title: "OPERATIONS",
          items: [
            {
              label: "Dashboard",
              href: "/",
              active: pathname === "/",
              icon: "📊",
            },
            {
              label: "Orders Stream",
              href: "/orders",
              active: pathname.startsWith("/orders") && pathname !== "/orders/new",
              icon: "📦",
            },
            {
              label: "Create Order",
              href: "/orders/new",
              active: pathname === "/orders/new",
              icon: "📝",
            },
          ],
        },
        {
          title: "STORE CATALOG",
          items: [
            {
              label: "Product Catalog",
              href: "/products",
              active: pathname === "/products",
              icon: "🏷️",
            },
            {
              label: "Categories & Tags",
              href: "/products/categories",
              active: pathname === "/products/categories",
              icon: "📂",
            },
            {
              label: "Add Product",
              href: "/products/new",
              active: pathname === "/products/new",
              icon: "➕",
            },
          ],
        },
        {
          title: "MANAGEMENT & ALERTS",
          items: [
            {
              label: "Team & Sales Reps",
              href: "/team",
              active: pathname === "/team",
              icon: "👥",
            },
            {
              label: "Push Alerts & Webhooks",
              href: "/notifications",
              active: pathname === "/notifications",
              icon: "🔔",
              badge: unreadCount > 0 ? unreadCount : undefined,
            },
          ],
        },
        {
          title: "AUTOMATIONS & MESSAGING",
          items: [
            {
              label: "Automation Engine",
              href: "/automations",
              active: pathname === "/automations",
              icon: "⚡",
            },
            {
              label: "WhatsApp Business",
              href: "/whatsapp",
              active: pathname === "/whatsapp",
              icon: "💬",
            },
            {
              label: "Email Notifications",
              href: "/email-notifications",
              active: pathname === "/email-notifications",
              icon: "✉️",
            },
          ],
        },
      ];

  return (
    <>
      <header className="sticky top-0 z-20 w-full border-b border-[#eaedf2] bg-white/95 backdrop-blur-md">
        <div className="w-full flex h-16 items-center justify-between px-4 sm:px-8 lg:px-10">
          {/* Left Side: Hamburger (Mobile) & Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            {/* Mobile Hamburger Button (Always active on portal layout) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all active:scale-95 shrink-0 relative"
              aria-label="Open Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-600 rounded-full ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 sm:gap-3 group lg:hidden"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black shadow-xs group-hover:scale-105 transition-transform overflow-hidden border border-slate-800 ring-1 ring-violet-500/30">
                <img src="/icons/icon-192.png" alt="Store ERP" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-sm sm:text-base tracking-wider uppercase text-slate-950 leading-tight">
                  STORE ERP
                </span>
                <span className="text-[9px] sm:text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                  Admin Portal
                </span>
              </div>
            </Link>

            {/* Desktop Search Capsule */}
            <div className="hidden lg:flex items-center gap-2 max-w-md w-full">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search orders, products, customers..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) router.push(`/orders?search=${encodeURIComponent(val)}`);
                    }
                  }}
                  className="w-full bg-slate-100/90 border border-slate-200/80 rounded-2xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all"
                />
                <div className="pointer-events-none absolute left-3.5 top-2.5 text-slate-400">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Sync Badge */}
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/80">
              <span
                className={`h-2 w-2 rounded-full ${
                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="hidden sm:inline text-[11px] font-semibold text-slate-700">
                {isOnline ? "Store Live" : "Offline"}
              </span>
            </div>

            {/* Notification Bell Button with Counter Badge */}
            <div className="relative">
              <button
                type="button"
                onClick={toggleNotifications}
                className={`relative p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 flex items-center justify-center cursor-pointer ${
                  unreadCount > 0
                    ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 shadow-2xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
                aria-label="Notifications"
                title="Notifications"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white font-black text-[9px] rounded-full flex items-center justify-center shadow-xs border-2 border-white animate-pulse">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
            </div>

            <a
              href={siteConfig.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50"
            >
              <span className="hidden xs:inline">{siteConfig.storeDomain}</span>
              <span className="xs:hidden">Store</span>
              <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer (Slide-out) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
          />

          {/* Drawer Sidebar */}
          <div className="relative w-[88%] sm:w-80 max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-black flex items-center justify-center shadow-xs overflow-hidden border border-slate-800 ring-1 ring-violet-500/30">
                  <img src="/icons/icon-192.png" alt="Store ERP" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="font-black text-base uppercase text-slate-950 block leading-tight">
                    STORE ERP
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                    Admin Portal
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Menu List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {navSections.map((sec) => (
                <div key={sec.title} className="space-y-2">
                  <h4 className="px-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    {sec.title}
                  </h4>
                  <div className="space-y-1">
                    {sec.items.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                          item.active
                            ? "bg-[#18181B] text-white shadow-xs"
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="text-base">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
              <a
                href={siteConfig.storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/90 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-mono text-xs font-extrabold text-slate-900">itsemranraj.com/sss</span>
                </div>
                <span className="text-slate-400 text-xs">↗</span>
              </a>

              <div className="p-2.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-black text-xs flex items-center justify-center uppercase shrink-0">
                    {(user?.username || "A").charAt(0)}
                  </div>
                  <div className="min-w-0 flex flex-col">
                    <span className="truncate text-xs font-extrabold text-slate-900">
                      {user?.username || "Admin"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Active Session</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white border border-rose-200 hover:border-rose-500 text-xs font-extrabold rounded-xl transition-all duration-150 active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-2xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

