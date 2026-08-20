"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { Order } from "@/types";
import { formatCurrency } from "@/lib/utils";

export interface AppNotification {
  id: string;
  orderId?: number;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  link?: string;
  type?: "order_created" | "order_status" | "chat" | "system";
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleNotifications: () => void;
  latestToast: AppNotification | null;
  dismissToast: () => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "ff_admin_notifications_v1";
const READ_IDS_KEY = "ff_admin_read_notification_ids_v1";
const POLL_INTERVAL_MS = 12000; // 12 seconds gentle polling to prevent WooCommerce/Vercel load

function playChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.5);
  } catch {
    // Ignore audio policy errors
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [latestToast, setLatestToast] = useState<AppNotification | null>(null);

  const initialLoadDone = useRef(false);
  const latestSeenOrderId = useRef<number | null>(null);
  const lastSeenUnreadChatCount = useRef<number | null>(null);

  // Poll unread chat messages for sound & alert notifications
  const pollChatMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json.count === "number") {
        const count = json.count;

        // If new unread message arrived while on any page
        if (lastSeenUnreadChatCount.current !== null && count > lastSeenUnreadChatCount.current) {
          playChime();
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([100, 50, 100]);
          }

          const isAlreadyOnMessages = typeof window !== "undefined" && window.location.pathname.startsWith("/messages");

          // Only create in-app floating Toast if user is NOT currently looking at the messages page
          if (!isAlreadyOnMessages) {
            const chatToast: AppNotification = {
              id: `chat_notif_${Date.now()}`,
              title: "💬 New Team Message",
              body: `You received a new message in Live Messenger.`,
              timestamp: Date.now(),
              read: false,
              link: "/messages",
              type: "chat",
            };
            setLatestToast(chatToast);
          }

          // Trigger native desktop notification if supported
          if (
            typeof window !== "undefined" &&
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            new Notification("💬 FixionFuel Live Chat", {
              body: "New message received from team.",
              icon: "/icons/icon-192.png",
            });
          }
        }

        lastSeenUnreadChatCount.current = count;
      }
    } catch {
      // Ignore
    }
  }, []);

  // 1. Initialize from localStorage
  useEffect(() => {
    try {
      const storedRead = localStorage.getItem(READ_IDS_KEY);
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
      const storedNotifs = localStorage.getItem(STORAGE_KEY);
      if (storedNotifs) {
        setNotifications(JSON.parse(storedNotifs));
      }
    } catch (e) {
      console.error("Failed to load notifications from storage", e);
    }
  }, []);

  // 2. Persist to localStorage when notifications or read state changes
  const persistState = useCallback((notifs: AppNotification[], reads: Set<string>) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifs.slice(0, 50)));
      localStorage.setItem(READ_IDS_KEY, JSON.stringify(Array.from(reads)));
    } catch (e) {
      console.error("Failed to persist notifications to storage", e);
    }
  }, []);

  // 3. Mark single notification as read -> Decrements unread count by 1!
  const markAsRead = useCallback((id: string) => {
    setReadIds((prevReads) => {
      const nextReads = new Set(prevReads);
      nextReads.add(id);

      setNotifications((prevNotifs) => {
        const nextNotifs = prevNotifs.map((n) => (n.id === id ? { ...n, read: true } : n));
        persistState(nextNotifs, nextReads);
        return nextNotifs;
      });

      return nextReads;
    });
  }, [persistState]);

  // 4. Mark all as read -> Unread count becomes 0!
  const markAllAsRead = useCallback(() => {
    setNotifications((prevNotifs) => {
      const allIds = new Set(prevNotifs.map((n) => n.id));
      const nextNotifs = prevNotifs.map((n) => ({ ...n, read: true }));
      setReadIds(allIds);
      persistState(nextNotifs, allIds);
      return nextNotifs;
    });
  }, [persistState]);

  // 5. Remove a notification
  const removeNotification = useCallback((id: string) => {
    setNotifications((prevNotifs) => {
      const nextNotifs = prevNotifs.filter((n) => n.id !== id);
      setReadIds((prevReads) => {
        const nextReads = new Set(prevReads);
        nextReads.delete(id);
        persistState(nextNotifs, nextReads);
        return nextReads;
      });
      return nextNotifs;
    });
  }, [persistState]);

  const toggleNotifications = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const dismissToast = useCallback(() => {
    setLatestToast(null);
  }, []);

  // 6. Add custom notification
  const addNotification = useCallback((notif: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newNotif: AppNotification = {
      ...notif,
      id,
      timestamp: Date.now(),
      read: false,
    };

    setNotifications((prev) => {
      const next = [newNotif, ...prev.filter((n) => n.id !== id)].slice(0, 50);
      setReadIds((reads) => {
        persistState(next, reads);
        return reads;
      });
      return next;
    });

    // In-app alert when app is open
    setLatestToast(newNotif);
    playChime();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [persistState]);

  // 7. Poll WooCommerce for recent orders to populate notifications
  const pollOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders?per_page=3");
      if (!res.ok) return;

      const json = await res.json();
      if (!json.success || !json.data) return;

      const orders: Order[] = json.data.items || json.data.orders || [];
      if (orders.length === 0) return;

      const latestOrderNum = Number(orders[0].id);

      // Load stored reads
      let currentReads = new Set<string>();
      try {
        const storedRead = localStorage.getItem(READ_IDS_KEY);
        if (storedRead) currentReads = new Set(JSON.parse(storedRead));
      } catch {
        // Ignore
      }

      setNotifications((prevNotifs) => {
        const existingIds = new Set(prevNotifs.map((n) => n.id));
        const newGenerated: AppNotification[] = [];

        for (const o of orders) {
          const notifId = `order_${o.id}`;
          if (!existingIds.has(notifId)) {
            const customer =
              `${o.billing?.first_name || ""} ${o.billing?.last_name || ""}`.trim() ||
              "Website Customer";
            const total = formatCurrency(o.total, o.currency);
            const isRead = currentReads.has(notifId);

            newGenerated.push({
              id: notifId,
              orderId: Number(o.id),
              title: `New Order #${o.number || o.id}`,
              body: `${customer} placed an order for ${total} (${o.status}).`,
              timestamp: o.date_created ? new Date(o.date_created).getTime() : Date.now(),
              read: isRead,
              link: `/orders/${o.id}`,
              type: "order_created",
            });
          }
        }

        if (newGenerated.length > 0) {
          // Trigger Foreground In-App Alert (Sound + Banner + Vibrate) when new order arrives while app is open
          if (
            initialLoadDone.current &&
            latestSeenOrderId.current &&
            latestOrderNum > latestSeenOrderId.current
          ) {
            const top = newGenerated[0];
            setLatestToast(top);
            playChime();
            if (typeof navigator !== "undefined" && "vibrate" in navigator) {
              navigator.vibrate([100, 50, 100]);
            }

            // Also trigger Browser notification if permitted
            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              new Notification(top.title, { body: top.body, icon: "/icons/icon-192.svg" });
            }
          }

          const combined = [...newGenerated, ...prevNotifs]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 50);

          persistState(combined, currentReads);
          return combined;
        }

        return prevNotifs;
      });

      latestSeenOrderId.current = latestOrderNum;
      initialLoadDone.current = true;
    } catch (err) {
      console.debug("Notification order poll error:", err);
    }
  }, [persistState]);

  useEffect(() => {
    pollOrders();
    pollChatMessages();
    const interval = setInterval(() => {
      pollOrders();
      pollChatMessages();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [pollOrders, pollChatMessages]);

  const unreadCount = notifications.filter((n) => !n.read && !readIds.has(n.id)).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        toggleNotifications,
        latestToast,
        dismissToast,
        markAsRead,
        markAllAsRead,
        removeNotification,
        addNotification,
        refreshNotifications: pollOrders,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
