"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Order, OrderNote, Address, OrderStatus } from "@/types";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { OrderAddressModal } from "@/components/orders/order-address-modal";
import { OrderNoteSection } from "@/components/orders/order-note-section";
import { OrderConfirmModal } from "@/components/orders/order-confirm-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [invoiceFeedback, setInvoiceFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Address edit modal state
  const [addressModalType, setAddressModalType] = useState<"billing" | "shipping" | null>(null);

  // Confirm modal state (cancel / trash)
  const [confirmAction, setConfirmAction] = useState<"cancel" | "trash" | null>(null);

  useEffect(() => {
    let ignore = false;

    const loadOrder = async () => {
      try {
        const [orderRes, notesRes] = await Promise.all([
          fetch(`/api/orders/${orderId}`),
          fetch(`/api/orders/${orderId}/notes`),
        ]);

        if (!ignore) {
          if (orderRes.status === 401 || notesRes.status === 401) {
            router.push(`/login?from=/orders/${orderId}`);
            return;
          }

          const orderJson = await orderRes.json();
          if (!orderRes.ok || !orderJson.success) {
            setError({
              code: orderJson.error?.code || "order_fetch_error",
              message: orderJson.error?.message || "Failed to load order details.",
            });
          } else {
            setOrder(orderJson.data);
            setError(null);
          }

          const notesJson = await notesRes.json();
          if (notesJson.success && Array.isArray(notesJson.data)) {
            setNotes(notesJson.data);
          }

          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError({
            code: "unknown_error",
            message: err instanceof Error ? err.message : "Failed to load order.",
          });
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      ignore = true;
    };
  }, [orderId, router, refreshTrigger]);

  const handleRetry = () => {
    setLoading(true);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (order) {
      setOrder({ ...order, status: newStatus });
      if (newStatus === "completed") {
        setInvoiceFeedback({
          type: "success",
          message: `Order completed! Invoice PDF sent to customer Email & WhatsApp.`,
        });
        setTimeout(() => setInvoiceFeedback(null), 7000);
      }
    }
  };

  const handleSendInvoiceEmail = async () => {
    setSendingInvoice(true);
    setInvoiceFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`, { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setInvoiceFeedback({
          type: "success",
          message: `Invoice PDF sent to ${order?.billing?.email || "customer"}!`,
        });
        setTimeout(() => setInvoiceFeedback(null), 6000);
      } else {
        setInvoiceFeedback({
          type: "error",
          message: json.error?.message || "Failed to send invoice email.",
        });
      }
    } catch {
      setInvoiceFeedback({
        type: "error",
        message: "Network error sending invoice.",
      });
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleAddressUpdated = (updatedAddress: Address) => {
    if (!order) return;
    if (addressModalType === "billing") {
      setOrder({ ...order, billing: updatedAddress });
    } else if (addressModalType === "shipping") {
      setOrder({ ...order, shipping: updatedAddress });
    }
  };

  const handleCancelOrder = async () => {
    const res = await fetch(`/api/orders/${orderId}?action=cancel`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to cancel order.");
    }
    if (order) {
      setOrder({ ...order, status: "cancelled" });
    }
  };

  const handleTrashOrder = async () => {
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error?.message || "Failed to delete order.");
    }
    router.push("/orders");
  };

  if (loading) {
    return (
      <div className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-5 w-28 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-white rounded-3xl border border-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-56 bg-white rounded-3xl border border-slate-200 animate-pulse" />
              <div className="h-56 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-48 bg-white rounded-3xl border border-slate-200 animate-pulse" />
              <div className="h-64 bg-white rounded-3xl border border-slate-200 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-12">
        <Card className="border-rose-200 bg-rose-50 text-center p-8">
          <CardHeader className="items-center">
            <StatusBadge status="Error" variant="rose" />
            <CardTitle className="mt-3 text-xl text-rose-900 font-extrabold">
              Unable to Retrieve Order #{orderId}
            </CardTitle>
            <p className="text-sm text-rose-800 mt-2 max-w-md mx-auto font-medium">
              {error?.message || "The requested order could not be located."}
            </p>
          </CardHeader>
          <CardContent className="flex justify-center gap-3 pt-2">
            <button
              onClick={handleRetry}
              className="px-5 py-2.5 text-xs sm:text-sm font-extrabold rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-colors shadow-sm"
            >
              Retry
            </button>
            <Link
              href="/orders"
              className="px-5 py-2.5 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors"
            >
              Back to Orders
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
    "Guest Customer";

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-5 sm:py-8 flex flex-col gap-6 sm:gap-7 font-sans pb-28 lg:pb-8">
      {/* Navigation & Header */}
      <div className="flex flex-col gap-3 pb-5 border-b border-[#eaedf2]">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Orders
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
          <div>
            <div className="flex items-center gap-2.5 sm:gap-3.5 flex-wrap">
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-[#18181b] font-mono">
                Order #{order.number || order.id}
              </h1>
              <span className="text-[11px] sm:text-sm text-slate-700 font-extrabold bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                Placed on {formatDate(order.date_created)}
              </span>
            </div>
            <p className="text-xs sm:text-base text-slate-600 mt-2 font-medium">
              Customer: <strong className="text-slate-950 font-black">{customerName}</strong> • Paid via{" "}
              <span className="text-slate-950 font-extrabold">{order.payment_method_title || order.payment_method || "N/A"}</span>
            </p>
          </div>

          {/* Status Updater */}
          <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-2xl border border-slate-200/80 sm:border-0">
            <span className="text-xs sm:text-sm font-black text-slate-700">Order Status:</span>
            <OrderStatusSelect
              orderId={order.id}
              currentStatus={order.status}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left 2 Cols (Items, Addresses) & Right 1 Col (Totals, Notes, Actions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-7">
          {/* Order Items Table Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
              <CardTitle className="text-lg sm:text-xl font-black text-[#18181b]">
                Ordered Items ({order.line_items?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100">
                {order.line_items?.map((item) => (
                  <div key={item.id} className="py-5 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base sm:text-lg font-black text-slate-950 leading-snug">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1.5 text-xs sm:text-sm text-slate-600 font-semibold">
                        {item.sku && <span className="font-mono font-bold text-slate-800">SKU: {item.sku}</span>}
                        <span className="font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          Qty: {item.quantity}
                        </span>
                        <span>Price: {formatCurrency(item.price, order.currency)}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono text-base sm:text-xl font-black text-slate-950">
                      {formatCurrency(item.total, order.currency)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Addresses (Billing & Shipping) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Billing Address */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-slate-100">
                <CardTitle className="text-xs sm:text-sm font-black uppercase text-slate-700 tracking-wider">
                  Billing Address
                </CardTitle>
                <button
                  onClick={() => setAddressModalType("billing")}
                  className="text-xs sm:text-sm font-black text-indigo-600 hover:text-indigo-800"
                >
                  Edit Address
                </button>
              </CardHeader>
              <CardContent className="text-sm sm:text-base text-slate-800 space-y-2 pt-4 font-medium">
                <p className="font-black text-slate-950 text-base sm:text-lg">
                  {order.billing?.first_name} {order.billing?.last_name}
                </p>
                {order.billing?.company && <p className="text-slate-600 font-semibold">{order.billing.company}</p>}
                <p className="text-slate-800">{order.billing?.address_1}</p>
                {order.billing?.address_2 && <p className="text-slate-800">{order.billing.address_2}</p>}
                <p className="text-slate-800 font-semibold">
                  {order.billing?.city}, {order.billing?.state} {order.billing?.postcode}
                </p>
                <p className="text-slate-800">{order.billing?.country}</p>
                {order.billing?.phone && (
                  <p className="pt-2 text-slate-700">
                    Phone:{" "}
                    <a href={`tel:${order.billing.phone}`} className="text-indigo-600 font-mono font-black hover:underline">
                      {order.billing.phone}
                    </a>
                  </p>
                )}
                {order.billing?.email && (
                  <p className="text-slate-700">
                    Email:{" "}
                    <a href={`mailto:${order.billing.email}`} className="text-indigo-600 font-bold hover:underline">
                      {order.billing.email}
                    </a>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Shipping Address */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-slate-100">
                <CardTitle className="text-xs sm:text-sm font-black uppercase text-slate-700 tracking-wider">
                  Shipping Address
                </CardTitle>
                <button
                  onClick={() => setAddressModalType("shipping")}
                  className="text-xs sm:text-sm font-black text-indigo-600 hover:text-indigo-800"
                >
                  Edit Address
                </button>
              </CardHeader>
              <CardContent className="text-sm sm:text-base text-slate-800 space-y-2 pt-4 font-medium">
                <p className="font-black text-slate-950 text-base sm:text-lg">
                  {order.shipping?.first_name || order.billing?.first_name}{" "}
                  {order.shipping?.last_name || order.billing?.last_name}
                </p>
                {order.shipping?.company && <p className="text-slate-600 font-semibold">{order.shipping.company}</p>}
                <p className="text-slate-800">{order.shipping?.address_1 || order.billing?.address_1 || "No shipping address provided"}</p>
                {order.shipping?.address_2 && <p className="text-slate-800">{order.shipping.address_2}</p>}
                <p className="text-slate-800 font-semibold">
                  {order.shipping?.city || order.billing?.city},{" "}
                  {order.shipping?.state || order.billing?.state}{" "}
                  {order.shipping?.postcode || order.billing?.postcode}
                </p>
                <p className="text-slate-800">{order.shipping?.country || order.billing?.country}</p>
              </CardContent>
            </Card>
          </div>

          {/* Customer Order Note */}
          {order.customer_note && (
            <div className="rounded-[28px] border border-amber-200 bg-[#FCE6D2]/60 p-6 shadow-sm">
              <h4 className="text-xs sm:text-sm font-black uppercase text-[#6B5A4E] tracking-wider mb-2.5">
                Customer Note / Special Instructions
              </h4>
              <p className="text-sm sm:text-base text-slate-950 font-semibold italic leading-relaxed">
                &quot;{order.customer_note}&quot;
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Totals Summary & Order Notes & Danger Zone */}
        <div className="space-y-7">
          {/* Totals Summary */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-lg sm:text-xl font-black text-[#18181b]">
                Order Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm sm:text-base pt-4 font-semibold">
              <div className="flex justify-between text-slate-700">
                <span>Items Subtotal</span>
                <span className="font-mono font-black text-slate-950">
                  {formatCurrency(
                    order.line_items?.reduce((sum, item) => sum + parseFloat(item.total || "0"), 0) || 0,
                    order.currency
                  )}
                </span>
              </div>

              {parseFloat(order.shipping_total || "0") > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Shipping</span>
                  <span className="font-mono font-black text-slate-950">
                    {formatCurrency(order.shipping_total, order.currency)}
                  </span>
                </div>
              )}

              {parseFloat(order.discount_total || "0") > 0 && (
                <div className="flex justify-between text-emerald-700 font-black">
                  <span>Discounts</span>
                  <span className="font-mono font-black text-emerald-700">
                    -{formatCurrency(order.discount_total, order.currency)}
                  </span>
                </div>
              )}

              {parseFloat(order.total_tax || "0") > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>Tax</span>
                  <span className="font-mono font-black text-slate-950">
                    {formatCurrency(order.total_tax, order.currency)}
                  </span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 flex justify-between items-baseline">
                <span className="text-base sm:text-lg font-black text-slate-950">Grand Total</span>
                <span className="font-mono text-2xl sm:text-3xl font-black text-[#18181b]">
                  {formatCurrency(order.total, order.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity / Notes Feed */}
          <Card>
            <CardContent className="pt-6">
              <OrderNoteSection orderId={order.id} initialNotes={notes} />
            </CardContent>
          </Card>

          {/* Order Actions / Danger Zone */}
          <Card className="border-slate-200/80 bg-white shadow-2xs">
            <CardHeader className="border-b border-slate-100 pb-3.5">
              <CardTitle className="text-xs sm:text-sm font-black uppercase text-slate-700 tracking-wider">
                Order Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-4">
              {/* Invoice PDF Actions */}
              <div className="flex flex-col gap-2.5 pb-3 border-b border-slate-100">
                <a
                  href={`/api/orders/${order.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full px-4 py-2.5 text-xs sm:text-sm font-black rounded-2xl bg-[#18181b] hover:bg-black text-white transition-all text-center shadow-xs flex items-center justify-center gap-2 active:scale-98"
                >
                  <span>📄</span>
                  <span>View / Download Invoice PDF</span>
                </a>

                <button
                  type="button"
                  onClick={handleSendInvoiceEmail}
                  disabled={sendingInvoice}
                  className="w-full px-4 py-2.5 text-xs sm:text-sm font-black rounded-2xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 transition-colors text-center flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
                >
                  <span>📧</span>
                  <span>{sendingInvoice ? "Sending Invoice PDF..." : "Email Invoice PDF to Customer"}</span>
                </button>

                {order.billing?.phone && (
                  <a
                    href={`https://wa.me/${String(order.billing.phone).replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hi ${customerName}! ✨\n\nYour order #${order.id} at FixionFuel has been completed.\n\n📄 Invoice No: INV-${order.id}\n💵 Total: $${order.total} USD\n\nDownload your PDF invoice:\nhttps://admin.fixionfuel.shop/api/orders/${order.id}/invoice\n\nThank you for shopping with FixionFuel!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 text-xs sm:text-sm font-black rounded-2xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 transition-colors text-center flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>💬</span>
                    <span>Send Invoice via WhatsApp</span>
                  </a>
                )}

                {invoiceFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-extrabold flex items-center gap-2 ${
                      invoiceFeedback.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    <span>{invoiceFeedback.type === "success" ? "✓" : "⚠️"}</span>
                    <span>{invoiceFeedback.message}</span>
                  </div>
                )}
              </div>

              {order.status !== "cancelled" && (
                <button
                  onClick={() => setConfirmAction("cancel")}
                  className="w-full px-5 py-3 text-xs sm:text-sm font-black rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors text-center shadow-xs"
                >
                  Cancel Order
                </button>
              )}

              <button
                onClick={() => setConfirmAction("trash")}
                className="w-full px-5 py-3 text-xs sm:text-sm font-black rounded-2xl border border-slate-200 hover:border-rose-300 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors text-center"
              >
                Move Order to Trash
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Address Edit Modal */}
      {addressModalType && (
        <OrderAddressModal
          orderId={order.id}
          type={addressModalType}
          initialAddress={addressModalType === "billing" ? order.billing : order.shipping}
          isOpen={Boolean(addressModalType)}
          onClose={() => setAddressModalType(null)}
          onSuccess={handleAddressUpdated}
        />
      )}

      {/* Confirmation Modals */}
      {confirmAction === "cancel" && (
        <OrderConfirmModal
          isOpen={true}
          title="Cancel this order?"
          description="This will set the order status to Cancelled in WooCommerce and restore reserved inventory if configured."
          confirmLabel="Yes, Cancel Order"
          variant="rose"
          onClose={() => setConfirmAction(null)}
          onConfirm={handleCancelOrder}
        />
      )}

      {confirmAction === "trash" && (
        <OrderConfirmModal
          isOpen={true}
          title="Move order to Trash?"
          description="The order will be moved to the WooCommerce trash bin. It can be restored later or permanently deleted."
          confirmLabel="Move to Trash"
          variant="rose"
          onClose={() => setConfirmAction(null)}
          onConfirm={handleTrashOrder}
        />
      )}
    </div>
  );
}
