/**
 * Application constants and enumeration mappings.
 */

import { OrderStatus } from "@/types";

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; description: string }
> = {
  pending: {
    label: "Pending Payment",
    color: "amber",
    description: "Order received, no payment initiated.",
  },
  processing: {
    label: "Processing",
    color: "blue",
    description: "Payment received, stock has been reduced, the order is awaiting fulfillment.",
  },
  "on-hold": {
    label: "On Hold",
    color: "orange",
    description: "Awaiting payment, stock is reduced, but confirmation is needed.",
  },
  completed: {
    label: "Completed",
    color: "emerald",
    description: "Order fulfilled and complete.",
  },
  cancelled: {
    label: "Cancelled",
    color: "rose",
    description: "Cancelled by an admin or the customer.",
  },
  refunded: {
    label: "Refunded",
    color: "slate",
    description: "Refunded by an admin.",
  },
  failed: {
    label: "Failed",
    color: "red",
    description: "Payment failed or was declined.",
  },
  trash: {
    label: "Trash",
    color: "zinc",
    description: "Order moved to trash.",
  },
};

export const PWA_CONFIG = {
  manifestUrl: "/manifest.webmanifest",
  themeColor: "#0f172a",
  backgroundColor: "#020617",
  display: "standalone" as const,
  orientation: "portrait-primary" as const,
};
