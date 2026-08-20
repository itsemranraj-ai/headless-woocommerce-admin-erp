"use client";

import { useEffect } from "react";

/**
 * Automatically registers the Store ERP PWA service worker in supported browsers.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.location.protocol.startsWith("http")
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          // Check for service worker updates
          registration.update();
        })
        .catch((err) => {
          console.debug("Service Worker registration skipped:", err);
        });
    }
  }, []);

  return null;
}
