/**
 * TypeScript definitions for PWA and Web Push notifications.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export type PWAInstallState =
  | "unsupported"
  | "installable"
  | "installed"
  | "standalone";

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime: number | null;
}

export interface WebNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    orderId?: number | string;
    type?: "new_order" | "status_change" | "low_stock" | "system" | "sales_rep_registered" | "chat_message";
  };
}
