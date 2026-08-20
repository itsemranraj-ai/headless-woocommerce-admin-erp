"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { useNotifications } from "@/contexts/notification-context";

const USER_CACHE_KEY = "ff_user_session_v1";

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<{ username?: string; role?: string; name?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const { unreadCount } = useNotifications();

  useEffect(() => {
    try {
      const cached = localStorage.getItem(USER_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setUser(parsed);
        setIsAuthenticated(true);
      }
    } catch {
      // Ignore
    }
  }, []);

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

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      try {
        localStorage.removeItem(USER_CACHE_KEY);
      } catch {
        // Ignore
      }
      await fetch("/api/auth/logout", { method: "POST" });
      setIsAuthenticated(false);
      setUser(null);
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  if (pathname === "/login" || isAuthenticated === false) {
    return null;
  }

  // Prevent flash of admin menu while session loads without cache
  if (!user && isAuthenticated === null) {
    return (
      <aside className="hidden lg:flex w-80 flex-col fixed inset-y-0 left-0 bg-white border-r border-[#eaedf2] z-30 select-none font-sans p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-200 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 bg-slate-200 rounded w-24 animate-pulse" />
            <div className="h-3 bg-slate-100 rounded w-16 animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 pt-6">
          <div className="h-10 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-10 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="h-10 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      </aside>
    );
  }

  const isStaff = user?.role === "staff";

  const sections = isStaff
    ? [
        {
          title: "OPERATIONS",
          items: [
            {
              label: "Dashboard",
              href: "/",
              active: pathname === "/",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ),
            },
            {
              label: "Orders Stream",
              href: "/orders",
              active: pathname.startsWith("/orders") && pathname !== "/orders/new",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              label: "Create Order",
              href: "/orders/new",
              active: pathname === "/orders/new",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              ),
            },
            {
              label: "Product Catalog",
              href: "/products",
              active: pathname === "/products",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              ),
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
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              ),
            },
            {
              label: "Orders Stream",
              href: "/orders",
              active: pathname.startsWith("/orders") && pathname !== "/orders/new",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
            },
            {
              label: "Create Order",
              href: "/orders/new",
              active: pathname === "/orders/new",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              ),
            },
          ],
        },
        {
          title: "STORE CATALOG",
          items: [
            {
              label: "Product Catalog",
              href: "/products",
              active: pathname === "/products" || (pathname.startsWith("/products/") && pathname !== "/products/new" && pathname !== "/products/categories"),
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              ),
            },
            {
              label: "Categories & Tags",
              href: "/products/categories",
              active: pathname === "/products/categories",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              ),
            },
            {
              label: "Add Product",
              href: "/products/new",
              active: pathname === "/products/new",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
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
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ),
            },
            {
              label: "Push Alerts & Webhooks",
              href: "/notifications",
              active: pathname === "/notifications",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              ),
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
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              ),
            },
            {
              label: "WhatsApp Business",
              href: "/whatsapp",
              active: pathname === "/whatsapp",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
            },
            {
              label: "Email Notifications",
              href: "/email-notifications",
              active: pathname === "/email-notifications",
              icon: (
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
            },
          ],
        },
      ];

  return (
    <aside className="hidden lg:flex w-80 flex-col fixed inset-y-0 left-0 bg-white border-r border-[#eaedf2] z-30 select-none font-sans">
      {/* Brand Header */}
      <div className="pt-7 pb-5 px-6">
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-2xl bg-black flex items-center justify-center shadow-md group-hover:scale-105 transition-transform shrink-0 overflow-hidden border border-slate-800 ring-2 ring-violet-500/20">
            <img src="/icons/icon-192.png" alt="FixionFuel" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg tracking-wider uppercase text-slate-950 font-sans leading-tight">
              FIXIONFUEL
            </span>
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">
              Admin Portal
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Menu Sections */}
      <div className="flex-1 px-4 space-y-6 overflow-y-auto pr-2">
        {sections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h4 className="px-3 text-xs font-black uppercase tracking-wider text-slate-400">
              {section.title}
            </h4>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm sm:text-base font-extrabold tracking-tight transition-all duration-150 ${
                    item.active
                      ? "bg-[#18181B] text-white shadow-sm"
                      : "text-slate-700 hover:text-slate-950 hover:bg-slate-50"
                  }`}
                >
                  {item.icon}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-black text-[10px] animate-pulse shadow-xs shrink-0">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modern Premium Footer */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/60 space-y-2.5">
        {/* Live Store Link */}
        <a
          href={siteConfig.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100/90 transition-all border border-slate-200/80 shadow-2xs group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="truncate font-mono text-[13px] font-extrabold text-slate-900">
              fixionfuel.shop
            </span>
          </div>
          <div className="w-5 h-5 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-400 group-hover:text-slate-700 transition-colors shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </div>
        </a>

        {/* User Card & Sign Out Action */}
        <div className="p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#18181B] text-white font-black text-xs flex items-center justify-center uppercase shadow-xs shrink-0">
              {(user?.username || "A").charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 truncate capitalize">
                  {user?.username || "Admin"}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase ${
                    isStaff
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {isStaff ? "Sales Rep" : user?.role || "Admin"}
                </span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 truncate">
                {isStaff ? "Field Sales Mode" : "Active Session"}
              </span>
            </div>
          </div>

          {/* Premium Sign Out Button */}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign Out"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-500 text-rose-700 hover:text-white border border-rose-200/70 hover:border-rose-500 transition-all duration-200 font-extrabold text-xs shadow-2xs hover:shadow-xs active:scale-95 disabled:opacity-50 shrink-0 group"
          >
            {loggingOut ? (
              <div className="w-3.5 h-3.5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
