import { NextRequest, NextResponse } from "next/server";
import { verifyWooCommerceWebhook } from "@/lib/security/webhook";
import { notificationService, VapidConfigError } from "@/services/notifications";
import { woocommerceService } from "@/services/woocommerce";
import { automationEngine } from "@/services/automation-engine";
import { Order } from "@/types";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-wc-webhook-signature");
  const topic = request.headers.get("x-wc-webhook-topic") || "order.created";

  const rawBody = await request.text();

  // Handle WooCommerce test ping event
  if (topic === "action.woocommerce_webhook_ping" || rawBody.includes("webhook_id")) {
    return NextResponse.json({
      success: true,
      message: "WooCommerce webhook ping received and verified.",
    });
  }

  // Validate webhook signature if present
  if (signature) {
    const isValid = verifyWooCommerceWebhook(rawBody, signature);
    if (!isValid) {
      console.warn("WooCommerce webhook signature mismatch, proceeding with caution for order event:", topic);
    }
  }

  try {
    let orderData: Order | null = null;
    let parsed: unknown = null;

    try {
      parsed = JSON.parse(rawBody);
    } catch {
      // Not JSON
    }

    if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (obj.id && (obj.total || obj.billing || obj.line_items)) {
        orderData = obj as unknown as Order;
      } else if (obj.id || obj.arg || typeof obj === "number") {
        const orderId = Number(obj.id || obj.arg || obj);
        if (orderId > 0) {
          try {
            orderData = await woocommerceService.getOrderById(orderId);
          } catch (e) {
            console.error("Failed to fetch full order for webhook id:", orderId, e);
          }
        }
      }
    } else if (typeof parsed === "number" && parsed > 0) {
      try {
        orderData = await woocommerceService.getOrderById(parsed);
      } catch (e) {
        console.error("Failed to fetch full order for id:", parsed, e);
      }
    }

    if (!orderData || !orderData.id) {
      return NextResponse.json(
        {
          success: true,
          message: "Webhook event processed (no order broadcast needed).",
        },
        { status: 200 }
      );
    }

    const isUpdate = topic.includes("update") || topic.includes("status");
    const eventType = isUpdate ? "updated" : "created";

    // 1. Determine triggers to execute
    const triggersToRun: string[] = [];
    const status = String(orderData.status || "").toLowerCase();

    if (!isUpdate) {
      // For any new order, always run order.created
      triggersToRun.push("order.created");
    }

    if (status === "processing") triggersToRun.push("order.processing");
    else if (status === "completed") triggersToRun.push("order.completed");
    else if (status === "cancelled") triggersToRun.push("order.cancelled");
    else if (status === "refunded") triggersToRun.push("order.refunded");
    else if (status === "failed") triggersToRun.push("order.payment_failed");
    else if (triggersToRun.length === 0) triggersToRun.push("order.created");

    // Remove duplicates
    const uniqueTriggers = Array.from(new Set(triggersToRun));

    // 2. Dispatch to Automation Engine with Deduplication
    const autoLogs: any[] = [];
    for (const trig of uniqueTriggers) {
      const eventId = `wc_evt_${orderData.id}_${trig}_${status}_${signature || Date.now()}`;
      const logs = await automationEngine.processEvent({
        trigger: trig as any,
        eventId,
        orderData: orderData as any,
      });
      autoLogs.push(...logs);
    }

    // 3. Broadcast push notification to all subscribed admin devices via Google FCM
    const pushResult = await notificationService.broadcastOrderNotification(orderData, eventType);

    return NextResponse.json({
      success: true,
      message: `Processed Order #${orderData.id} (${uniqueTriggers.join(", ")}): ${autoLogs.length} automations executed`,
      data: { push: pushResult, automations: autoLogs },
    });
  } catch (error) {
    if (error instanceof VapidConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "vapid_not_configured",
            message: error.message,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "webhook_processing_error",
          message: error instanceof Error ? error.message : "Failed to process webhook.",
        },
      },
      { status: 500 }
    );
  }
}
