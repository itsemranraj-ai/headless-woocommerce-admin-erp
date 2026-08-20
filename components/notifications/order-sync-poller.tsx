"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Order } from "@/types";
import { formatCurrency } from "@/lib/utils";

const POLL_INTERVAL_MS = 2500; // 2.5 seconds real-time check

export function OrderSyncPoller() {
  const router = useRouter();
  const latestOrderIdRef = useRef<number | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    const checkLatestOrders = async () => {
      try {
        const res = await fetch("/api/orders?per_page=1");
        if (!res.ok) return;

        const json = await res.json();
        if (!json.success || !json.data) return;

        const orders: Order[] = json.data.items || json.data.orders || [];
        if (orders.length === 0) return;

        const latest = orders[0];
        const currentId = Number(latest.id);

        if (isFirstRun.current) {
          latestOrderIdRef.current = currentId;
          isFirstRun.current = false;
          return;
        }

        // If a new order is detected from WooCommerce
        if (latestOrderIdRef.current && currentId > latestOrderIdRef.current) {
          latestOrderIdRef.current = currentId;

          const customerName =
            `${latest.billing?.first_name || ""} ${latest.billing?.last_name || ""}`.trim() ||
            "Website Customer";
          const orderTotal = formatCurrency(latest.total, latest.currency);
          const title = `🔔 New Order #${latest.number || latest.id}`;
          const body = `${customerName} placed an order for ${orderTotal}.`;

          // 1. Try Service Worker Notification
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((registration) => {
              registration.showNotification(title, {
                body,
                icon: "/icons/icon-192.svg",
                badge: "/icons/icon-192.svg",
                tag: `order-${currentId}`,
                data: { url: `/orders/${currentId}` },
              });
            });
          } else if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            // 2. Fallback to Browser Notification API
            const notif = new Notification(title, {
              body,
              icon: "/icons/icon-192.svg",
            });
            notif.onclick = () => {
              window.focus();
              router.push(`/orders/${currentId}`);
            };
          }
        }
      } catch {
        // Silently ignore network poll failures
      }
    };

    // Run initial check
    checkLatestOrders();

    // Schedule background interval
    const timer = setInterval(checkLatestOrders, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
    };
  }, [router]);

  return null;
}
