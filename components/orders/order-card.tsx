import React from "react";
import Link from "next/link";
import { Order } from "@/types";
import { OrderStatusBadge } from "./order-status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface OrderCardProps {
  order: Order;
}

export function OrderCard({ order }: OrderCardProps) {
  const customerFirstName = order.billing?.first_name || "";
  const customerLastName = order.billing?.last_name || "";
  const customerName =
    `${customerFirstName} ${customerLastName}`.trim() ||
    "Guest Customer";

  // Initials for avatar
  const initials = `${customerFirstName.charAt(0)}${customerLastName.charAt(0)}`.toUpperCase() || "C";

  const itemCount = order.line_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0;
  const paymentMethod = order.payment_method_title || order.payment_method || "Cash on Delivery";

  // Formatted price
  const formattedTotal = formatCurrency(order.total, order.currency);

  return (
    <Link
      href={`/orders/${order.id}`}
      className="group relative block rounded-3xl border border-slate-200/80 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-sm hover:-translate-y-0.5"
    >
      <div className="flex flex-col gap-3.5">
        {/* Top Header: Order Number + Date + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 text-xs font-bold font-mono border border-slate-200">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-slate-900 group-hover:text-black transition-colors">
                  #{order.number || order.id}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {formatDate(order.date_created, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>

          <OrderStatusBadge status={order.status} size="sm" />
        </div>

        {/* Middle: Customer Name & Contact */}
        <div className="flex items-start justify-between gap-3 pt-0.5">
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {customerName}
            </h4>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-500">
              {order.billing?.phone ? (
                <span className="truncate flex items-center gap-1 text-slate-600 font-mono text-[11px]">
                  <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {order.billing.phone}
                </span>
              ) : (
                <span className="truncate text-slate-400 text-[11px]">{order.billing?.email || "No phone"}</span>
              )}
            </div>
          </div>

          {/* Amount & Items Count */}
          <div className="text-right shrink-0">
            <p className="font-mono text-base font-extrabold text-slate-900 tracking-tight">
              {formattedTotal}
            </p>
            <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Bottom meta: Payment method & Action */}
        <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 truncate max-w-[200px]">
            <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-[11px] text-slate-500 truncate">{paymentMethod}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-900 text-xs font-bold group-hover:translate-x-0.5 transition-transform">
            <span>Manage</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
