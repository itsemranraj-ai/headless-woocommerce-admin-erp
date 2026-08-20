"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/contexts/notification-context";

export function NotificationCenterModal() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    latestToast,
    dismissToast,
    markAsRead,
    markAllAsRead,
    removeNotification,
  } = useNotifications();

  return (
    <>
      {/* 1. Real-time In-App Floating Toast Banner (When app is OPEN) */}
      {latestToast && (
        <div className="fixed top-4 inset-x-3 sm:inset-x-auto sm:right-6 z-60 max-w-md mx-auto animate-in slide-in-from-top duration-300 pointer-events-auto">
          <div className="bg-[#18181B] text-white p-4 rounded-3xl shadow-2xl border border-slate-700/80 flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-2xl text-white flex items-center justify-center text-lg shrink-0 shadow-sm animate-bounce ${
                latestToast.type === "chat" || latestToast.link?.startsWith("/messages")
                  ? "bg-[#00a884]"
                  : "bg-rose-600"
              }`}
            >
              {latestToast.type === "chat" || latestToast.link?.startsWith("/messages") ? "💬" : "🔔"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="font-extrabold text-sm text-white truncate">
                  {latestToast.title}
                </span>
                <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">
                  Just Now
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                {latestToast.body}
              </p>
              <div className="flex items-center gap-2 mt-2.5">
                {latestToast.link && (
                  <button
                    type="button"
                    onClick={() => {
                      markAsRead(latestToast.id);
                      dismissToast();
                      router.push(latestToast.link!);
                    }}
                    className={`px-3.5 py-1.5 text-xs font-black rounded-xl active:scale-95 transition-all shadow-xs ${
                      latestToast.type === "chat" || latestToast.link?.startsWith("/messages")
                        ? "bg-[#00a884] text-white hover:bg-[#008f6f]"
                        : "bg-white text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {latestToast.type === "chat" || latestToast.link?.startsWith("/messages")
                      ? "Open Chat →"
                      : "View Order →"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={dismissToast}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white font-bold"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissToast}
              className="text-slate-400 hover:text-white text-sm p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 2. Global Notification Center Dropdown / Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center sm:justify-end pointer-events-auto">
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Panel */}
          <div className="relative w-full sm:w-[420px] bg-white h-full sm:h-[88vh] sm:mt-16 sm:mr-4 rounded-b-3xl sm:rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-10 animate-in slide-in-from-top-4 sm:slide-in-from-right duration-200 overflow-hidden font-sans">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-sm shadow-xs">
                  🔔
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    Notifications
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {unreadCount > 0
                      ? `${unreadCount} unread update${unreadCount === 1 ? "" : "s"}`
                      : "All notifications caught up"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="px-2.5 py-1 text-[11px] font-extrabold text-slate-700 hover:text-black bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all active:scale-95"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center text-sm transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <span className="text-4xl block">📭</span>
                  <p className="text-xs font-extrabold text-slate-700">No Notifications</p>
                  <p className="text-[11px] text-slate-400">
                    Live order & chat alerts will appear here automatically.
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 sm:p-4 flex items-start gap-3 transition-colors ${
                      !n.read ? "bg-rose-50/35 hover:bg-rose-50/60" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) {
                          setIsOpen(false);
                          router.push(n.link);
                        }
                      }}
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm shrink-0 mt-0.5 cursor-pointer ${
                        !n.read
                          ? n.type === "chat" || n.link?.startsWith("/messages")
                            ? "bg-[#00a884] text-white shadow-xs"
                            : "bg-[#18181B] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {n.type === "chat" || n.link?.startsWith("/messages") ? "💬" : "📦"}
                    </div>

                    <div
                      onClick={() => {
                        markAsRead(n.id);
                        if (n.link) {
                          setIsOpen(false);
                          router.push(n.link);
                        }
                      }}
                      className="flex-1 min-w-0 cursor-pointer text-left"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-xs truncate ${
                            !n.read ? "font-black text-slate-900" : "font-semibold text-slate-700"
                          }`}
                        >
                          {n.title}
                        </span>
                        {!n.read && (
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0"
                            title="Unread"
                          />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {n.body}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                        {new Date(n.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!n.read && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(n.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl text-xs font-bold transition-colors"
                          title="Mark as read"
                        >
                          ✓
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-xs transition-colors"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-700 hover:text-slate-900"
              >
                Push Settings & Webhooks →
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
