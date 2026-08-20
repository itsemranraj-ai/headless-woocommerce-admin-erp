"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Order, OrderStatus } from "@/types";
import { OrderCard } from "@/components/orders/order-card";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

const STATUS_FILTERS: Array<{ value: OrderStatus | "all"; label: string }> = [
  { value: "all", label: "All Orders" },
  { value: "processing", label: "Processing" },
  { value: "pending", label: "Pending" },
  { value: "on-hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
  { value: "trash", label: "Trash" },
];

function OrdersListContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get("status") || "all";
  const currentSearch = searchParams.get("search") || "";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(currentSearch);
  const [isSearching, setIsSearching] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // 2. Debounce keystrokes for instant AJAX live search (250ms)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setIsSearching(false);
    }, 280);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fast Status counts from cached dashboard API
  useEffect(() => {
    async function loadCounts() {
      try {
        const res = await fetch("/api/dashboard");
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && json.data?.statusCounts) {
          setStatusCounts(json.data.statusCounts);
        }
      } catch {
        // Ignore
      }
    }
    loadCounts();
  }, [refreshIndex]);

  useEffect(() => {
    let ignore = false;

    const loadOrders = async () => {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", String(currentPage));
      params.set("per_page", "15");

      if (currentStatus && currentStatus !== "all") {
        params.set("status", currentStatus);
      }
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      // Silently update browser URL without full page reload
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        if (debouncedSearch) {
          urlParams.set("search", debouncedSearch);
        } else {
          urlParams.delete("search");
        }
        const newUrl = urlParams.toString() ? `/orders?${urlParams.toString()}` : "/orders";
        window.history.replaceState(null, "", newUrl);
      }

      try {
        const res = await fetch(`/api/orders?${params.toString()}`);
        const json = await res.json();

        if (!ignore) {
          if (res.status === 401) {
            router.push("/login?from=/orders");
            return;
          }

          if (!res.ok || !json.success) {
            setError({
              code: json.error?.code || "api_error",
              message: json.error?.message || "Failed to load orders from WooCommerce.",
            });
          } else {
            setOrders(json.data.items || []);
            setTotalOrders(json.data.total || 0);
            setTotalPages(json.data.totalPages || 1);
            setError(null);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError({
            code: "network_error",
            message: err instanceof Error ? err.message : "An unexpected network error occurred.",
          });
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [currentStatus, debouncedSearch, currentPage, router, refreshIndex]);

  const handleRefresh = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  const updateFilters = (newParams: { status?: string; search?: string; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newParams.status !== undefined) {
      if (newParams.status === "all") {
        params.delete("status");
      } else {
        params.set("status", newParams.status);
      }
      params.set("page", "1");
    }

    if (newParams.search !== undefined) {
      setSearchInput(newParams.search);
      setDebouncedSearch(newParams.search.trim());
      if (!newParams.search.trim()) {
        params.delete("search");
      } else {
        params.set("search", newParams.search.trim());
      }
      params.set("page", "1");
    }

    if (newParams.page !== undefined) {
      params.set("page", String(newParams.page));
    }

    router.push(`/orders?${params.toString()}`);
  };

  const handleImmediateSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDebouncedSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setDebouncedSearch("");
  };

  return (
    <div className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 font-sans">
      {/* Header & New Order Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Orders Stream
            </h1>
            <StatusBadge status="Live WooCommerce" variant="emerald" />
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time orders synchronized with <span className="text-slate-800 font-semibold">fixionfuel.shop</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            title="Refresh Orders"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-slate-900" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          <Link
            href="/orders/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Order</span>
          </Link>
        </div>
      </div>

      {/* Filter Controls: Search & Tabs */}
      <div className="flex flex-col gap-4">
        {/* Search Bar - Instant Debounced AJAX Live Search */}
        <form onSubmit={handleImmediateSearch} className="relative w-full">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") handleClearSearch();
            }}
            placeholder="Search orders by ID, customer name, email, or phone in real-time..."
            className="w-full bg-white border border-slate-200/80 rounded-2xl pl-11 pr-24 py-3 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all shadow-sm"
          />
          <div className="pointer-events-none absolute left-4 top-3.5 text-slate-400">
            {isSearching || loading ? (
              <svg className="w-4 h-4 animate-spin text-slate-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
            {searchInput && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                title="Clear Search (Esc)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Status Tabs Pills with Dynamic Number Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {STATUS_FILTERS.map((tab) => {
            const isActive = currentStatus === tab.value;
            const count = statusCounts[tab.value];
            return (
              <button
                key={tab.value}
                onClick={() => updateFilters({ status: tab.value })}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all border shadow-2xs ${
                  isActive
                    ? "bg-[#18181B] text-white border-[#18181B] shadow-sm scale-102"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <span>{tab.label}</span>
                {count !== undefined && (
                  <span
                    className={`px-2 py-0.2 rounded-full text-[11px] font-black ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Stream / States */}
      <div className="flex flex-col gap-4">
        {/* Error State: Configuration */}
        {error && error.code === "woocommerce_not_configured" && (
          <Card className="border-amber-200 bg-amber-50 p-6 text-center">
            <CardHeader className="items-center">
              <StatusBadge status="Configuration Required" variant="amber" />
              <CardTitle className="mt-3 text-base text-amber-900 font-bold">
                WooCommerce REST API Credentials Required
              </CardTitle>
              <CardDescription className="max-w-md mx-auto text-xs text-amber-800">
                {error.message}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Error State: General */}
        {error && error.code !== "woocommerce_not_configured" && (
          <Card className="border-rose-200 bg-rose-50 p-6 text-center">
            <CardHeader className="items-center">
              <StatusBadge status="Error" variant="rose" />
              <CardTitle className="mt-3 text-base text-rose-900 font-bold">
                Failed to Retrieve Orders
              </CardTitle>
              <CardDescription className="text-xs text-rose-800 max-w-md mx-auto mt-1">
                {error.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center gap-3 pt-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-xs font-bold rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeletons */}
        {loading && !error && (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-3xl border border-slate-200 bg-white p-4 animate-pulse"
              >
                <div className="flex justify-between items-center mb-3">
                  <div className="h-4 w-32 bg-slate-100 rounded" />
                  <div className="h-5 w-20 bg-slate-100 rounded-full" />
                </div>
                <div className="h-3 w-48 bg-slate-100 rounded mb-2" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && orders.length === 0 && (
          <Card className="border-slate-200 bg-white text-center py-14 rounded-3xl shadow-sm">
            <div className="flex justify-center mb-3">
              <div className="p-3 rounded-full bg-slate-100 text-slate-500">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <CardTitle className="text-base font-extrabold text-slate-900">
              No orders found
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {currentSearch
                ? `No orders matching "${currentSearch}".`
                : "No orders found matching the selected status filter."}
            </CardDescription>
            {currentSearch && (
              <button
                onClick={handleClearSearch}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
              >
                Clear Search Filter
              </button>
            )}
          </Card>
        )}

        {/* Orders List */}
        {!loading && !error && orders.length > 0 && (
          <>
            <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 font-semibold px-1">
              <span>
                Showing <strong className="text-slate-950 font-black">{orders.length}</strong> of{" "}
                <strong className="text-slate-950 font-black">{totalOrders}</strong> orders
              </span>
              <span>
                Page <strong className="text-slate-950 font-black">{currentPage}</strong> of{" "}
                <strong className="text-slate-950 font-black">{totalPages}</strong>
              </span>
            </div>

            <div className="flex flex-col gap-3.5">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200/80 pt-5 mt-2">
                <button
                  onClick={() => updateFilters({ page: Math.max(1, currentPage - 1) })}
                  disabled={currentPage <= 1 || loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                <span className="text-xs sm:text-sm font-bold text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => updateFilters({ page: Math.min(totalPages, currentPage + 1) })}
                  disabled={currentPage >= totalPages || loading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-2xs"
                >
                  Next
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
          <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
        </div>
      }
    >
      <OrdersListContent />
    </Suspense>
  );
}
