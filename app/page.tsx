"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";

const DASHBOARD_CACHE_KEY = "ff_dashboard_cache_v5";

const STATUS_TABS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "All Orders" },
  { key: "processing", label: "Processing" },
  { key: "pending", label: "Pending" },
  { key: "on-hold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "refunded", label: "Refunded" },
  { key: "failed", label: "Failed" },
  { key: "trash", label: "Trash" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalProducts: 0,
    activeSubscribers: 0,
    totalSalesReps: 0,
    loading: true,
  });

  const [currentUser, setCurrentUser] = useState<{ username: string; role: string; name?: string } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ff_user_session_v1");
        if (cached) return JSON.parse(cached);
      } catch {
        // Ignore
      }
    }
    return null;
  });

  const [salesRepsStats, setSalesRepsStats] = useState<
    Array<{
      id: string;
      name: string;
      username: string;
      email: string;
      role: string;
      totalOrders: number;
      completedOrders?: number;
      pendingOrders?: number;
      cancelledOrders?: number;
      totalRevenue: number;
      completedRevenue?: number;
      pendingRevenue?: number;
      lastOrderAt?: string;
    }>
  >([]);
  const [myStats, setMyStats] = useState<{
    id: string;
    name: string;
    username: string;
    totalOrders: number;
    completedOrders?: number;
    pendingOrders?: number;
    cancelledOrders?: number;
    totalRevenue: number;
    completedRevenue?: number;
    pendingRevenue?: number;
    lastOrderAt?: string;
  } | null>(null);

  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<OrderStatus | "all">("all");
  const [successToast, setSuccessToast] = useState<{ id: number; customer: string } | null>(null);

  // Check for order created notification
  useEffect(() => {
    try {
      const savedToast = localStorage.getItem("ff_order_created_toast");
      if (savedToast) {
        localStorage.removeItem("ff_order_created_toast");
        const parsed = JSON.parse(savedToast);
        setSuccessToast(parsed);
        setTimeout(() => setSuccessToast(null), 5000);
      }
    } catch {
      // Ignore
    }
  }, []);

  // 1. Synchronously initialize from user-scoped local cache for 0ms instant render
  useEffect(() => {
    const activeUsername = currentUser?.username || "default";
    const cacheKey = `ff_dashboard_cache_${activeUsername}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.stats) setStats({ ...parsed.stats, loading: false });
        if (Array.isArray(parsed.recentOrders) && parsed.recentOrders.length > 0) {
          setRecentOrders(parsed.recentOrders);
          setOrdersLoading(false);
        }
        if (Array.isArray(parsed.salesRepsStats)) setSalesRepsStats(parsed.salesRepsStats);
        if (parsed.myStats) setMyStats(parsed.myStats);
      }
    } catch {
      // Ignore
    }

    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!json.data?.authenticated) {
          window.location.href = "/login";
        } else {
          setCurrentUser(json.data.user);
          try {
            localStorage.setItem("ff_user_session_v1", JSON.stringify(json.data.user));
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {});

    async function loadDashboardData() {
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const {
              stats: newStats,
              recentOrders: newOrders,
              salesRepsStats: newReps,
              myStats: newMyStats,
              currentUser: user,
            } = json.data;

            setStats({ ...newStats, loading: false });
            setRecentOrders(newOrders || []);
            if (newReps) setSalesRepsStats(newReps);
            if (newMyStats) setMyStats(newMyStats);
            if (user) setCurrentUser(user);

            try {
              const saveKey = `ff_dashboard_cache_${user?.username || activeUsername}`;
              localStorage.setItem(saveKey, JSON.stringify(json.data));
            } catch {
              // Ignore
            }
          }
        }
      } catch {
        // Ignore network errors
      } finally {
        setStats((prev) => ({ ...prev, loading: false }));
        setOrdersLoading(false);
      }
    }

    loadDashboardData();

    // Auto-refresh dashboard data every 5 seconds via AJAX
    const refreshInterval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(refreshInterval);
  }, [currentUser?.username]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {
      all: recentOrders.length,
      processing: 0,
      pending: 0,
      "on-hold": 0,
      completed: 0,
      cancelled: 0,
      refunded: 0,
      failed: 0,
      trash: 0,
    };

    recentOrders.forEach((o) => {
      const st = String(o.status || "").toLowerCase();
      if (typeof map[st] === "number") {
        map[st] += 1;
      } else {
        map[st] = 1;
      }
    });

    return map;
  }, [recentOrders]);

  const filteredOrders = recentOrders.filter((order) => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });

  return (
    <div className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-8 font-sans relative">
      {/* Success Toast Notification */}
      {successToast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 text-white shadow-2xl border border-emerald-500 animate-in slide-in-from-top duration-300">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-base">
            🎉
          </div>
          <div>
            <div className="text-[11px] font-black tracking-wider uppercase text-emerald-100">
              Order Created Successfully
            </div>
            <div className="text-sm font-extrabold">
              Order #{successToast.id} {successToast.customer ? `• ${successToast.customer}` : ""}
            </div>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="ml-3 text-white/80 hover:text-white text-sm font-black p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. SALES REP PERSONAL VIEW (When logged in as Sales Rep) */}
      {/* ========================================================================= */}
      {currentUser?.role === "staff" ? (
        <>
          {/* Welcome Banner */}
          <div className="p-6 sm:p-8 rounded-[32px] bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-extrabold mb-3">
                <span>💼</span> Sales Rep Field Dashboard
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome, {currentUser?.name || currentUser?.username}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl leading-relaxed">
                Here is your live sales activity overview. You can browse the visual catalog with customers or take orders instantly.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap shrink-0">
              <Link
                href="/orders/new"
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <span>🛒 + Take Customer Order</span>
              </Link>
              <Link
                href="/products"
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold transition-all border border-white/20"
              >
                <span>📱 Product Catalog</span>
              </Link>
            </div>
          </div>

          {/* Personal Performance Bento Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* My Orders Taken */}
            <div className="rounded-[28px] bg-[#FCE6D2] p-6 sm:p-7 text-[#18181B] flex flex-col justify-between min-h-[180px] shadow-2xs">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#6B5A4E]">
                MY TOTAL ORDERS TAKEN
              </span>
              <div className="my-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-mono">
                {stats.loading ? "..." : String(myStats?.totalOrders || 0).padStart(2, "0")}
              </div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#6B5A4E]">
                <span>📦</span>
                <span>Orders created by you</span>
              </div>
            </div>

            {/* My Revenue Generated */}
            <div className="rounded-[28px] bg-[#E8E1F5] p-6 sm:p-7 text-[#18181B] flex flex-col justify-between min-h-[180px] shadow-2xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#5D4E75]">
                  MY GENERATED SALES REVENUE
                </span>
                {myStats && (myStats.pendingRevenue || 0) > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-[10px] font-black tracking-wide">
                    ⏳ {formatCurrency(myStats.pendingRevenue || 0)} Pending
                  </span>
                )}
              </div>

              <div className="my-2">
                <div className="text-3xl sm:text-4xl font-black tracking-tight text-[#18181B] font-mono">
                  {stats.loading ? "..." : formatCurrency(myStats?.completedRevenue || 0)}
                </div>
                {(myStats?.completedRevenue || 0) === 0 && (myStats?.pendingRevenue || 0) > 0 ? (
                  <p className="text-[11px] font-bold text-[#5D4E75] mt-1">
                    Revenue completes when orders are marked Completed
                  </p>
                ) : (
                  <p className="text-[11px] font-bold text-[#5D4E75] mt-1">
                    Realized completed sales volume
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-extrabold text-[#5D4E75] pt-2 border-t border-[#5D4E75]/15">
                <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                  <span>✓</span>
                  <span>{myStats?.completedOrders || 0} Completed</span>
                </div>
                {(myStats?.pendingOrders || 0) > 0 && (
                  <div className="flex items-center gap-1.5 text-amber-800 font-black">
                    <span>⏳</span>
                    <span>{myStats?.pendingOrders || 0} Pending</span>
                  </div>
                )}
              </div>
            </div>

            {/* Products Available */}
            <div className="rounded-[28px] bg-[#D9EBDC] p-6 sm:p-7 text-[#18181B] flex flex-col justify-between min-h-[180px] shadow-2xs">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#47664D]">
                AVAILABLE PRODUCTS IN CATALOG
              </span>
              <div className="my-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-mono">
                {stats.loading ? "..." : String(stats.totalProducts).padStart(2, "0")}
              </div>
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#47664D]">
                <span>🛍️</span>
                <span>Live items in store</span>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ========================================================================= */
        /* 2. ADMINISTRATOR DASHBOARD VIEW */
        /* ========================================================================= */
        <>
          {/* 4 Bento Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Card 1: TOTAL ORDERS (Peach / Sand Pastel) */}
            <Link href="/orders" className="group">
              <div className="relative overflow-hidden rounded-[28px] bg-[#FCE6D2] p-6 sm:p-7 text-[#18181B] transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[190px]">
                <div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#6B5A4E]">
                    TOTAL ORDERS
                  </span>
                  <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-sans">
                    {stats.loading ? "..." : String(stats.totalOrders).padStart(2, "0")}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#EA8A52]/20 flex items-center justify-center text-xs">
                      📦
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#18181B] uppercase tracking-wider">
                      ALL STORE ORDERS
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#EA8A52] text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 2: TOTAL PRODUCTS (Soft Platinum / Ivory) */}
            <Link href="/products" className="group">
              <div className="relative overflow-hidden rounded-[28px] bg-[#EFEFE8] p-6 sm:p-7 text-[#18181B] transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[190px]">
                <div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#66645E]">
                    TOTAL PRODUCTS
                  </span>
                  <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-sans">
                    {stats.loading ? "..." : String(stats.totalProducts).padStart(2, "0")}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-slate-300/60 flex items-center justify-center text-xs">
                      🛍️
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#18181B] uppercase tracking-wider">
                      ACTIVE INVENTORY
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#18181B] text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 3: PROCESSING ORDERS (Soft Lavender / Lilac) */}
            <Link href="/orders?status=processing" className="group">
              <div className="relative overflow-hidden rounded-[28px] bg-[#E8E1F5] p-6 sm:p-7 text-[#18181B] transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[190px]">
                <div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#5D4E75]">
                    PROCESSING ORDERS
                  </span>
                  <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-sans">
                    {stats.loading ? "..." : String(stats.processingOrders).padStart(2, "0")}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#9C7CDD]/20 flex items-center justify-center text-xs">
                      ⏳
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#18181B] uppercase tracking-wider">
                      PENDING DISPATCH
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#9C7CDD] text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>

            {/* Card 4: TOTAL SALES REPS (Soft Mint / Sage Green) */}
            <Link href="/team?role=staff" className="group">
              <div className="relative overflow-hidden rounded-[28px] bg-[#D9EBDC] p-6 sm:p-7 text-[#18181B] transition-all duration-200 hover:-translate-y-1 hover:shadow-md flex flex-col justify-between min-h-[190px]">
                <div>
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#47664D]">
                    TOTAL SALES REPS
                  </span>
                  <div className="mt-2 text-5xl sm:text-6xl font-black tracking-tight text-[#18181B] font-sans">
                    {stats.loading ? "..." : String(stats.totalSalesReps || salesRepsStats.filter((s) => s.role === "staff").length).padStart(2, "0")}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-[#ACD1B1] flex items-center justify-center text-xs">
                      💼
                    </div>
                    <span className="text-xs sm:text-sm font-black text-[#18181B] uppercase tracking-wider">
                      FIELD AGENTS
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#47664D] text-white flex items-center justify-center text-sm font-bold shadow-sm group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Sales Reps Performance Leaderboard & Stats */}
          <div className="rounded-[32px] border border-slate-200/80 bg-white p-6 sm:p-8 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">💼</span>
                  <h2 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                    Sales Reps & Field Agent Performance
                  </h2>
                  <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black whitespace-nowrap">
                    {salesRepsStats.filter((s) => s.role === "staff").length} Active Reps
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Real-time order count and sales volume breakdown per sales representative.
                </p>
              </div>

              <Link
                href="/team?role=staff"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shrink-0 w-full sm:w-auto text-center"
              >
                <span>Manage Sales Reps</span>
                <span>→</span>
              </Link>
            </div>

            {/* Leaderboard Grid: Filter to ONLY Sales Reps (role === 'staff') */}
            {(() => {
              const onlyReps = salesRepsStats.filter((s) => s.role === "staff");
              if (onlyReps.length === 0) {
                return (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No sales reps registered yet. Create sales reps in{" "}
                    <Link href="/team?role=staff" className="underline font-bold text-slate-700">
                      Team & Sales Reps
                    </Link>.
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {onlyReps.map((rep) => {
                    return (
                      <div
                        key={rep.id}
                        className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between gap-4 group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm text-white shrink-0 shadow-xs bg-amber-600">
                              {rep.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                                {rep.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 font-mono truncate">@{rep.username}</p>
                            </div>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap bg-amber-100 text-amber-900 border border-amber-300">
                            💼 Sales Rep
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/80 text-center">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 flex flex-col justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Orders Taken
                            </div>
                            <div className="text-lg font-black text-slate-950 font-mono mt-0.5">
                              {rep.totalOrders}
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 mt-0.5">
                              {rep.completedOrders || 0} completed
                            </div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200/60 flex flex-col justify-between">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Completed Revenue
                            </div>
                            <div className="text-sm sm:text-base font-black text-slate-950 font-mono mt-0.5 truncate">
                              {formatCurrency(rep.completedRevenue || 0)}
                            </div>
                            {(rep.pendingRevenue || 0) > 0 ? (
                              <div className="text-[10px] font-bold text-amber-700 mt-0.5 truncate">
                                ⏳ {formatCurrency(rep.pendingRevenue || 0)} pending
                              </div>
                            ) : (
                              <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                ✓ Realized
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                          <span className="text-slate-400 font-medium truncate">
                            {rep.lastOrderAt ? `Last order: ${formatDate(rep.lastOrderAt)}` : "No orders yet"}
                          </span>
                          <Link
                            href={`/orders?search=${encodeURIComponent(rep.username)}`}
                            className="text-amber-800 hover:text-amber-950 font-extrabold shrink-0 hover:underline inline-flex items-center gap-1"
                          >
                            <span>View Orders</span>
                            <span>→</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </>
      )}

      {/* Lower Section: Full Width Card with Prominent Big Tabs with Dynamic Number Counters */}
      <div className="w-full rounded-[28px] border border-[#eaedf2] bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Horizontal Extra Large Bold Navigation Tabs with Counters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3 sm:gap-6 flex-wrap">
            {STATUS_TABS.map((tab) => {
              const count = counts[tab.key] || 0;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`pb-4 -mb-4 text-sm sm:text-base lg:text-lg font-black tracking-tight transition-all relative flex items-center gap-2 shrink-0 ${
                    isActive
                      ? "text-[#18181B] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#18181B]"
                      : "text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black transition-all ${
                      isActive
                        ? "bg-[#18181B] text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {ordersLoading ? "..." : count}
                  </span>
                </button>
              );
            })}
          </div>

          <Link
            href="/orders/new"
            className="self-start lg:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#18181B] hover:bg-black text-white text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
            </svg>
            <span>+ New Order</span>
          </Link>
        </div>

        {/* Orders Table */}
        <div className="w-full overflow-x-auto">
          {ordersLoading ? (
            <div className="py-16 text-center text-sm font-bold text-slate-400">
              <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
              Loading synchronized WooCommerce orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-base font-extrabold text-slate-700">
                {currentUser?.role === "staff"
                  ? "No orders created yet"
                  : `No ${activeTab !== "all" ? activeTab : ""} orders found`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {currentUser?.role === "staff"
                  ? "Orders you take for customers will appear here in your personal sales history."
                  : "New store purchases will automatically stream here in real time."}
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">CUSTOMER / CONTACT</th>
                  <th className="pb-3 px-4">ORDERED PRODUCTS</th>
                  <th className="pb-3 px-4">ORDER DATE</th>
                  <th className="pb-3 px-4 text-right">ORDER TOTAL</th>
                  <th className="pb-3 pl-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs sm:text-sm">
                {filteredOrders.map((order) => {
                  const customerName =
                    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
                    "Guest Customer";
                  const initial = customerName.charAt(0).toUpperCase() || "C";
                  const itemCount = order.line_items?.length || 0;
                  const firstItem = order.line_items?.[0];

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition-colors group">
                      {/* Customer */}
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-extrabold text-xs text-slate-700">
                            {initial}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 line-clamp-1">
                              {customerName}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 font-mono">
                              {order.billing?.phone || order.billing?.email || `#${order.id}`}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Items */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 line-clamp-1">
                          {firstItem?.name || "Order Item"}
                          {itemCount > 1 && (
                            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-[10px] font-bold text-slate-600">
                              +{itemCount - 1} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4 text-xs font-semibold text-slate-600 whitespace-nowrap">
                        {formatDate(order.date_created || new Date().toISOString())}
                      </td>

                      {/* Total & Status */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="font-black text-slate-950 font-mono text-sm sm:text-base">
                          {formatCurrency(order.total, order.currency)}
                        </div>
                        <div className="mt-1 flex justify-end">
                          <StatusBadge status={order.status} />
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-4 pl-4 text-right whitespace-nowrap">
                        <Link
                          href={`/orders/${order.id}`}
                          className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-[#18181B] text-slate-800 hover:text-white font-bold text-xs transition-all shadow-2xs group-hover:scale-102"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
