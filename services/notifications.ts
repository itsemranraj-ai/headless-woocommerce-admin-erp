/**
 * Web Push Notification Service Layer.
 *
 * Implements server-side Web Push notification delivery using VAPID protocol
 * via the 'web-push' library.
 *
 * PRIVACY & SECURITY:
 * VAPID private key is strictly isolated to the server.
 * Dead or expired subscriptions (HTTP 404 / 410 Gone) are automatically cleaned up.
 */

import webpush from "web-push";
import { getServerEnv } from "@/lib/env";
import { subscriptionStore, StoredSubscription } from "@/lib/notifications/subscription-store";
import { PushSubscriptionData, WebNotificationPayload, Order } from "@/types";
import { formatCurrency } from "@/lib/utils";

export class VapidConfigError extends Error {
  constructor(message: string = "VAPID credentials are not configured.") {
    super(message);
    this.name = "VapidConfigError";
  }
}

/**
 * Validates and configures Web Push VAPID details.
 */
function ensureVapidConfigured(): { publicKey: string; privateKey: string; subject: string } {
  const { vapid, appUrl } = getServerEnv();

  const publicKey = vapid.publicKey;
  const privateKey = vapid.privateKey;
  const subject = vapid.subject || `mailto:admin@${new URL(appUrl).hostname}`;

  const isPlaceholder =
    !publicKey ||
    !privateKey ||
    publicKey.includes("placeholder") ||
    privateKey.includes("placeholder");

  if (isPlaceholder) {
    throw new VapidConfigError(
      "Web Push VAPID credentials are not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local."
    );
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
  } catch (err) {
    throw new VapidConfigError(
      `Invalid VAPID credentials: ${err instanceof Error ? err.message : "Configuration failed."}`
    );
  }

  return { publicKey, privateKey, subject };
}

export const notificationService = {
  /**
   * Save a browser push subscription.
   */
  async saveSubscription(
    subscription: PushSubscriptionData,
    userAgent?: string
  ): Promise<StoredSubscription> {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      throw new Error("Invalid push subscription format.");
    }
    return subscriptionStore.saveSubscription(subscription, userAgent);
  },

  /**
   * Remove a push subscription by endpoint.
   */
  async removeSubscription(endpoint: string): Promise<boolean> {
    return subscriptionStore.removeSubscription(endpoint);
  },

  /**
   * Get all active push subscriptions.
   */
  async getSubscriptions(): Promise<StoredSubscription[]> {
    return subscriptionStore.getAllSubscriptions();
  },

  /**
   * Send a Web Push notification to a single subscriber.
   */
  async sendPushNotification(
    subscription: PushSubscriptionData,
    payload: WebNotificationPayload
  ): Promise<{ success: boolean; error?: string }> {
    ensureVapidConfigured();

    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
          },
        },
        JSON.stringify(payload),
        {
          TTL: 60 * 60 * 24, // 24 hours
          urgency: "high",
        }
      );
      return { success: true };
    } catch (error: unknown) {
      const err = error as { statusCode?: number; message?: string };
      // 404 Not Found or 410 Gone indicates the subscription has expired or unsubscribed
      if (err.statusCode === 404 || err.statusCode === 410) {
        await subscriptionStore.removeSubscription(subscription.endpoint);
        return { success: false, error: "Subscription expired and removed." };
      }
      return { success: false, error: err.message || "Failed to deliver push notification." };
    }
  },

  /**
   * Broadcast an Order notification (New Order or Status Update) to all subscribed admin devices.
   */
  async broadcastOrderNotification(
    order: Order,
    eventType: "created" | "updated" = "created"
  ): Promise<{
    totalSubscriptions: number;
    delivered: number;
    failed: number;
  }> {
    const subscriptions = await subscriptionStore.getAllSubscriptions();
    if (subscriptions.length === 0) {
      return { totalSubscriptions: 0, delivered: 0, failed: 0 };
    }

    ensureVapidConfigured();

    const customerName =
      `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() ||
      "Website Customer";
    const orderTotal = formatCurrency(order.total, order.currency);
    const itemCount = order.line_items?.length || 0;

    const isCreated = eventType === "created";
    const title = isCreated
      ? `🔔 New Order #${order.number || order.id}`
      : `📦 Order #${order.number || order.id} Status: ${order.status.toUpperCase()}`;

    const body = isCreated
      ? `${customerName} placed a new order for ${orderTotal} (${itemCount} item${itemCount === 1 ? "" : "s"}).`
      : `Status updated to ${order.status.toUpperCase()} • ${customerName} (${orderTotal}).`;

    const payload: WebNotificationPayload = {
      title,
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `order-${order.id}-${order.status}`,
      data: {
        url: `/orders/${order.id}`,
        orderId: order.id,
        type: isCreated ? "new_order" : "status_change",
      },
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendPushNotification(sub, payload))
    );

    let delivered = 0;
    let failed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        delivered++;
      } else {
        failed++;
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      delivered,
      failed,
    };
  },

  /**
   * Broadcast a notification to all admin devices when a new Sales Rep registers.
   */
  async broadcastSalesRepRegisteredNotification(user: {
    name: string;
    username: string;
    email?: string;
  }): Promise<{
    totalSubscriptions: number;
    delivered: number;
    failed: number;
  }> {
    const subscriptions = await subscriptionStore.getAllSubscriptions();
    if (subscriptions.length === 0) {
      return { totalSubscriptions: 0, delivered: 0, failed: 0 };
    }

    ensureVapidConfigured();

    const title = `💼 New Sales Rep Registered!`;
    const body = `${user.name || user.username} (@${user.username}) just registered as a Field Sales Rep.`;

    const payload: WebNotificationPayload = {
      title,
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `sales-rep-${user.username}`,
      data: {
        url: `/team`,
        type: "sales_rep_registered",
      },
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendPushNotification(sub, payload))
    );

    let delivered = 0;
    let failed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        delivered++;
      } else {
        failed++;
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      delivered,
      failed,
    };
  },

  /**
   * Broadcast a real-time Web Push notification to subscribed devices when a chat message is sent.
   */
  async broadcastChatMessageNotification(params: {
    senderName: string;
    senderUsername: string;
    recipientUsername: string;
    content: string;
    hasAttachment?: boolean;
    attachmentType?: string;
  }): Promise<{
    totalSubscriptions: number;
    delivered: number;
    failed: number;
  }> {
    const subscriptions = await subscriptionStore.getAllSubscriptions();
    if (subscriptions.length === 0) {
      return { totalSubscriptions: 0, delivered: 0, failed: 0 };
    }

    try {
      ensureVapidConfigured();
    } catch {
      return { totalSubscriptions: 0, delivered: 0, failed: 0 };
    }

    const preview = params.content
      ? params.content
      : params.attachmentType === "image"
      ? "📷 Sent a photo"
      : params.attachmentType === "audio"
      ? "🎙️ Sent a voice message"
      : "📎 Sent an attachment";

    const payload: WebNotificationPayload = {
      title: `💬 ${params.senderName}`,
      body: preview,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `chat-msg-${params.senderUsername}-${Date.now()}`,
      data: {
        url: `/messages`,
        type: "chat_message",
      },
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendPushNotification(sub, payload))
    );

    let delivered = 0;
    let failed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        delivered++;
      } else {
        failed++;
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      delivered,
      failed,
    };
  },

  /**
   * Alias for backward compatibility.
   */
  async broadcastNewOrderNotification(order: Order) {
    return this.broadcastOrderNotification(order, "created");
  },

  /**
   * Send a test notification to all active subscriptions.
   */
  async sendTestNotification(): Promise<{
    totalSubscriptions: number;
    delivered: number;
    failed: number;
  }> {
    const subscriptions = await subscriptionStore.getAllSubscriptions();
    if (subscriptions.length === 0) {
      throw new Error("No active browser push subscriptions found. Please subscribe this device first.");
    }

    ensureVapidConfigured();

    const payload: WebNotificationPayload = {
      title: "⚡ Store ERP Push Test",
      body: "Web Push notifications are working successfully on this device!",
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: "test-notification",
      data: {
        url: "/notifications",
        type: "system",
      },
    };

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.sendPushNotification(sub, payload))
    );

    let delivered = 0;
    let failed = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value.success) {
        delivered++;
      } else {
        failed++;
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      delivered,
      failed,
    };
  },
};
