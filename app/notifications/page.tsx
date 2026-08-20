"use client";

import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { useNotifications } from "@/contexts/notification-context";

const FALLBACK_VAPID_PUBLIC_KEY = "BH-90OzQAof2VRvv4oTMGK1LHapE2XJjABQkTBLjoILYwWtw-wAMcJNg5NuNr1vvYlTgBCjOhaQ06sFB0AsCEmo";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(FALLBACK_VAPID_PUBLIC_KEY);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check browser capabilities and current subscription
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user?.role === "staff") {
          window.location.href = "/orders";
        }
      })
      .catch(() => {});

    const checkStatus = async () => {
      const supported =
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;

      setIsSupported(supported);

      if (supported) {
        setPermission(Notification.permission);

        try {
          // Check backend config
          const configRes = await fetch("/api/notifications/subscribe");
          const configJson = await configRes.json();

          if (configJson.success) {
            setVapidPublicKey(configJson.data.vapidPublicKey || FALLBACK_VAPID_PUBLIC_KEY);
            setActiveCount(configJson.data.activeSubscriptionsCount || 0);
          }

          // Check if active service worker has existing subscription
          const registration = await navigator.serviceWorker.ready;
          const existingSub = await registration.pushManager.getSubscription();
          setIsSubscribed(Boolean(existingSub));
        } catch (err) {
          console.debug("Subscription check error:", err);
        }
      }

      setLoading(false);
    };

    checkStatus();
  }, []);

  const handleSubscribe = async () => {
    if (!isSupported) {
      setMessage({ type: "error", text: "Push notifications are not supported by this browser." });
      return;
    }

    const keyToUse = vapidPublicKey || FALLBACK_VAPID_PUBLIC_KEY;
    if (!keyToUse) {
      setMessage({
        type: "error",
        text: "VAPID Public Key is not available.",
      });
      return;
    }

    setActionLoading(true);
    setMessage(null);

    try {
      // 1. Request browser notification permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== "granted") {
        throw new Error("Notification permission was denied in your browser settings.");
      }

      // 2. Register service worker push subscription
      const registration = await navigator.serviceWorker.ready;
      const convertedKey = urlBase64ToUint8Array(keyToUse);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      // 3. Send subscription to Store ERP backend
      const rawSub = subscription.toJSON();
      const res = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: rawSub.endpoint,
          keys: {
            p256dh: rawSub.keys?.p256dh,
            auth: rawSub.keys?.auth,
          },
          expirationTime: rawSub.expirationTime || null,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to register subscription with server.");
      }

      setIsSubscribed(true);
      setActiveCount((prev) => prev + 1);
      setMessage({ type: "success", text: "This device is now subscribed to instant new-order push alerts!" });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to enable notifications." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();

        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      setActiveCount((prev) => Math.max(0, prev - 1));
      setMessage({ type: "success", text: "Device unsubscribed from order notifications." });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Unsubscribe failed." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setActionLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Test push failed.");
      }

      setMessage({
        type: "success",
        text: `Test push sent! Delivered to ${json.data.delivered} active subscriber(s). Check your device notifications!`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Test push failed." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden px-4 sm:px-8 lg:px-10 py-5 sm:py-8 flex flex-col gap-6 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-2 pb-4 border-b border-[#eaedf2]">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#18181b]">
            Order Push Notifications
          </h1>
          <StatusBadge
            status={isSubscribed ? "Push Active" : "Push Inactive"}
            variant={isSubscribed ? "emerald" : "slate"}
          />
        </div>
        <p className="text-xs text-slate-500">
          Receive real-time sound and banner alerts on your device whenever a customer places an order on{" "}
          <span className="text-slate-800 font-semibold">itsemranraj.com/sss</span>.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-2xl border p-4 text-xs font-semibold ${
            message.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Status Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Browser Support */}
        <div className="rounded-[24px] border border-[#eaedf2] bg-white p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Browser Support
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSupported ? "bg-emerald-500" : "bg-rose-500"
              }`}
            />
            <span className="text-sm font-extrabold text-[#18181b]">
              {isSupported ? "Push API Supported" : "Not Supported"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Service Worker & Web Push
          </p>
        </div>

        {/* Card 2: Permission State */}
        <div className="rounded-[24px] border border-[#eaedf2] bg-white p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Permission State
          </span>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                permission === "granted"
                  ? "bg-emerald-500"
                  : permission === "denied"
                  ? "bg-rose-500"
                  : "bg-amber-500"
              }`}
            />
            <span className="text-sm font-extrabold text-[#18181b] capitalize">
              {permission}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            OS / Browser Permission
          </p>
        </div>

        {/* Card 3: Active Subscriptions */}
        <div className="rounded-[24px] border border-[#eaedf2] bg-white p-4 sm:p-5 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Admin Devices
          </span>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-[#18181b]">
              {activeCount}
            </span>
            <span className="text-xs text-slate-500 font-semibold">subscribed</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Devices receiving instant order webhooks
          </p>
        </div>
      </div>

      {/* Subscription Action Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-extrabold text-[#18181b]">
            Device Push Subscription
          </CardTitle>
          <CardDescription className="text-xs">
            Subscribe this specific phone, tablet, or browser to receive instant alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {!isSubscribed ? (
              <button
                onClick={handleSubscribe}
                disabled={loading || actionLoading || !isSupported}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-40 shadow-sm active:scale-95 cursor-pointer"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Enable Push Notifications on this Device</span>
              </button>
            ) : (
              <button
                onClick={handleUnsubscribe}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-5 py-3 text-xs sm:text-sm font-semibold rounded-2xl border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-rose-600 transition-colors cursor-pointer"
              >
                {actionLoading && <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
                <span>Disable Notifications on this Device</span>
              </button>
            )}

            {isSubscribed && (
              <button
                onClick={handleSendTestPush}
                disabled={actionLoading}
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold rounded-2xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                <span>Send Test Notification</span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Platform & iOS Guidance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* iOS Notice */}
        <div className="rounded-[24px] border border-[#eaedf2] bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#18181b] mb-2">
            <svg className="w-4 h-4 text-indigo-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Apple iOS / iPhone Requirements</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Under Apple&apos;s Web Push rules (iOS 16.4+), push alerts require the PWA to be added to your Home Screen.
            <br />
            1. Tap <strong>Share</strong> in Safari.
            <br />
            2. Tap <strong>&quot;Add to Home Screen&quot;</strong>.
            <br />
            3. Open Store ERP from your home screen and enable notifications here.
          </p>
        </div>

        {/* Android & Desktop Notice */}
        <div className="rounded-[24px] border border-[#eaedf2] bg-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-[#18181b] mb-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>Android & Desktop Chrome / Edge</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Directly supported in Chrome, Edge, and Samsung Internet.
            <br />
            Notifications are delivered instantly even when the app tab is closed.
          </p>
        </div>
      </div>

      {/* Notification Activity Feed & Unread Center */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-extrabold text-[#18181b] flex items-center gap-2">
              <span>🔔 Notification Activity Feed</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-extrabold">
                  {unreadCount} unread
                </span>
              )}
            </CardTitle>
            <CardDescription className="text-xs">
              Live alert history with per-item read tracking
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl active:scale-95 transition-all"
              >
                ✓ Mark all as read
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <span className="text-3xl block">📭</span>
              <p className="text-xs font-bold text-slate-700">No Notifications Received</p>
              <p className="text-[11px] text-slate-400">Order alerts will appear here when customers purchase items.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 sm:p-4 rounded-2xl transition-all flex items-start justify-between gap-3 ${
                    !n.read ? "bg-rose-50/40 border border-rose-100/80 mb-2" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5 ${
                      !n.read ? "bg-[#18181B] text-white shadow-xs" : "bg-slate-100 text-slate-600"
                    }`}>
                      📦
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs sm:text-sm truncate ${!n.read ? "font-black text-slate-900" : "font-semibold text-slate-700"}`}>
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[9px] uppercase">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {n.body}
                      </p>
                      <span className="text-[11px] text-slate-400 mt-1 block font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {n.link && (
                      <button
                        type="button"
                        onClick={() => {
                          markAsRead(n.id);
                          window.location.href = n.link!;
                        }}
                        className="px-3 py-1.5 bg-[#18181B] hover:bg-black text-white text-xs font-bold rounded-xl shadow-2xs active:scale-95 transition-all"
                      >
                        View Order
                      </button>
                    )}

                    {!n.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(n.id)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors"
                        title="Mark as read"
                      >
                        ✓
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeNotification(n.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      title="Delete notification"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Configuration Guide for Store Admin */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-extrabold text-[#18181b]">
            WooCommerce Order Created Webhook Setup
          </CardTitle>
          <CardDescription className="text-xs">
            Configure WooCommerce on itsemranraj.com/sss to send real-time order events to this admin PWA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-700">
          <p className="text-slate-600 font-medium">
            In your WordPress admin dashboard (<code>itsemranraj.com/sss/wp-admin</code>):
          </p>
          <ol className="list-decimal list-inside space-y-2 text-slate-700 pl-1">
            <li>Go to <strong>WooCommerce → Settings → Advanced → Webhooks</strong>.</li>
            <li>Click <strong>&quot;Add webhook&quot;</strong>.</li>
            <li>Set <strong>Name</strong>: <code>Store Admin ERP Order Created</code></li>
            <li>Set <strong>Status</strong>: <code>Active</code></li>
            <li>Set <strong>Topic</strong>: <code>Order created</code></li>
            <li>
              Set <strong>Delivery URL</strong>:
              <div className="mt-1">
                <code className="block break-all bg-slate-100 p-2 rounded-xl border border-slate-200 text-slate-900 font-mono font-bold select-all text-[11px]">
                  https://demo-erp.itsemranraj.com/api/webhooks/woocommerce/order-created
                </code>
              </div>
            </li>
            <li>
              Set <strong>Secret</strong>: Enter the exact value of your <code>WOOCOMMERCE_WEBHOOK_SECRET</code>.
            </li>
            <li>Set <strong>API Version</strong>: <code>WP REST API Integration v3</code></li>
            <li>Click <strong>&quot;Save Webhook&quot;</strong>.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
