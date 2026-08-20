"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/ui/header";
import { Sidebar } from "@/components/ui/sidebar";
import { BottomNav } from "@/components/ui/bottom-nav";
import { OrderSyncPoller } from "@/components/notifications/order-sync-poller";

import { NotificationProvider } from "@/contexts/notification-context";
import { NotificationCenterModal } from "@/components/notifications/notification-center";
import { PushAutoSubscriber } from "@/components/notifications/push-auto-subscriber";

const AUTH_STATE_KEY = "ff_auth_cached_v1";

export function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(AUTH_STATE_KEY);
      if (cached === "true") return true;
      if (cached === "false") return false;
    }
    return true; // Default to rendering admin layout optimistically to prevent 3s delay
  });

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch("/api/auth/session", { cache: "no-store" });
        const json = await res.json();
        const isAuth = Boolean(json.data?.authenticated);
        setIsAuthenticated(isAuth);
        try {
          localStorage.setItem(AUTH_STATE_KEY, isAuth ? "true" : "false");
        } catch {
          // Ignore
        }

        if (!isAuth && json.data?.error === "account_deleted" && pathname !== "/login") {
          window.location.href = "/login?error=account_deleted";
        }
      } catch {
        // Keep current state on transient errors
      }
    };

    checkSession();
    // Real-time session heartbeat every 3.5s to instantly log out deleted accounts
    const interval = setInterval(checkSession, 3500);
    return () => clearInterval(interval);
  }, [pathname]);

  const isLoginPage = pathname === "/login";
  const isMaintenancePage = pathname === "/maintenance";

  if (isMaintenancePage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  // For unauthenticated users (or explicit /login page):
  // Render ONLY the clean, centered card without header, sidebar, or bottom nav.
  if (isLoginPage || isAuthenticated === false) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8F9FA] p-4 sm:p-6">
        <main className="w-full max-w-lg flex items-center justify-center">
          {children}
        </main>
      </div>
    );
  }

  // For authenticated portal sessions: Full Admin Layout with Sidebar, Header & Stream Sync
  return (
    <NotificationProvider>
      <PushAutoSubscriber />
      <NotificationCenterModal />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 lg:pl-80">
        <Header />
        <main className="flex-1 flex flex-col pb-24 lg:pb-0">{children}</main>
      </div>
      <BottomNav />
    </NotificationProvider>
  );
}
