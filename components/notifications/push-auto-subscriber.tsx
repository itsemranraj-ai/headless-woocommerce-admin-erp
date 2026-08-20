"use client";

import React, { useEffect, useState, useCallback } from "react";

const VAPID_PUBLIC_KEY = "BH-90OzQAof2VRvv4oTMGK1LHapE2XJjABQkTBLjoILYwWtw-wAMcJNg5NuNr1vvYlTgBCjOhaQ06sFB0AsCEmo";

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

export function PushAutoSubscriber() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const subscribeDevice = useCallback(async () => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }

    try {
      setIsSubscribing(true);
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setShowPrompt(false);
        return;
      }

      // Register SW
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey,
        });
      }

      const rawSub = subscription.toJSON();
      if (rawSub.endpoint && rawSub.keys?.p256dh && rawSub.keys?.auth) {
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: rawSub.endpoint,
            keys: {
              p256dh: rawSub.keys.p256dh,
              auth: rawSub.keys.auth,
            },
            expirationTime: rawSub.expirationTime || null,
          }),
        });
      }

      setShowPrompt(false);
    } catch (e) {
      console.debug("Auto push subscription error:", e);
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("Notification" in window)) {
      return;
    }

    // If permission is already granted, ensure push subscription is registered with server in background
    if (Notification.permission === "granted") {
      subscribeDevice();
    } else if (Notification.permission === "default") {
      // If permission has not been asked yet, show prompt
      const dismissed = sessionStorage.getItem("ff_push_prompt_dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    }
  }, [subscribeDevice]);

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-6 inset-x-3 sm:inset-x-auto sm:right-6 z-50 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
      <div className="bg-[#18181B] text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-lg shrink-0 shadow-sm animate-pulse">
          🔔
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-extrabold text-sm text-white block">
            Enable Instant Order Alerts?
          </span>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Get instant sound and banner alerts on your phone whenever a customer places an order, even when the app is closed.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={subscribeDevice}
              disabled={isSubscribing}
              className="px-4 py-1.5 bg-white text-slate-900 text-xs font-black rounded-xl hover:bg-slate-100 active:scale-95 transition-all shadow-xs disabled:opacity-50"
            >
              {isSubscribing ? "Enabling..." : "Enable Alerts (1-Tap)"}
            </button>
            <button
              type="button"
              onClick={() => {
                sessionStorage.setItem("ff_push_prompt_dismissed", "true");
                setShowPrompt(false);
              }}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-bold"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem("ff_push_prompt_dismissed", "true");
            setShowPrompt(false);
          }}
          className="text-slate-400 hover:text-white text-sm p-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
