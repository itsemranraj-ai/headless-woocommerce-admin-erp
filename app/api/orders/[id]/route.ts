import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";
import { UpdateOrderPayload } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to view order." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid order ID." } },
      { status: 400 }
    );
  }

  try {
    const order = await woocommerceService.getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        { success: false, error: { code: "not_found", message: `Order #${orderId} was not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to retrieve order." } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to update order." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid order ID." } },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as UpdateOrderPayload;
    const updatedOrder = await woocommerceService.updateOrder(orderId, body);

    // Trigger automations on status change or update
    try {
      const { automationEngine } = await import("@/services/automation-engine");
      const status = String(updatedOrder.status || "").toLowerCase();
      let trigger: any = "order.status_changed";
      if (status === "processing") trigger = "order.processing";
      else if (status === "completed") trigger = "order.completed";
      else if (status === "cancelled") trigger = "order.cancelled";
      else if (status === "refunded") trigger = "order.refunded";
      else if (status === "failed") trigger = "payment.failed";

      await automationEngine.processEvent({
        trigger,
        eventId: `order_update_${orderId}_${status}_${Date.now()}`,
        orderData: updatedOrder as any,
      });
    } catch (autoErr) {
      console.error("[Orders API] Error dispatching automation on update:", autoErr);
    }

    // Automatically send Invoice PDF to customer Email and WhatsApp when Admin marks order as Completed
    if (String(updatedOrder.status || "").toLowerCase() === "completed") {
      // 1. Email Invoice with PDF Attachment
      try {
        const { emailService } = await import("@/services/email-service");
        emailService.sendOrderInvoiceEmail(updatedOrder).catch((err) => {
          console.error("[Orders API] Error sending invoice PDF email:", err);
        });
      } catch (emailErr) {
        console.error("[Orders API] Failed to invoke emailService:", emailErr);
      }

      // 2. WhatsApp Invoice Message with PDF Download Link
      try {
        const { whatsappService } = await import("@/services/whatsapp-service");
        whatsappService.sendOrderInvoiceWhatsApp(updatedOrder).catch((err) => {
          console.error("[Orders API] Error sending WhatsApp invoice notification:", err);
        });
      } catch (waErr) {
        console.error("[Orders API] Failed to invoke whatsappService:", waErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedOrder,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to update order." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to delete order." } },
      { status: 401 }
    );
  }

  const { id } = await params;
  const orderId = parseInt(id, 10);

  if (isNaN(orderId) || orderId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: "invalid_id", message: "Invalid order ID." } },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action"); // 'cancel' or undefined
  const force = searchParams.get("force") === "true";

  try {
    if (action === "cancel") {
      const cancelledOrder = await woocommerceService.cancelOrder(orderId);
      return NextResponse.json({
        success: true,
        data: { message: "Order cancelled successfully.", order: cancelledOrder },
      });
    }

    const result = await woocommerceService.deleteOrder(orderId, force);

    try {
      const { removeUserOrder } = await import("@/lib/auth/user-store");
      removeUserOrder(orderId);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        { success: false, error: { code: "woocommerce_not_configured", message: error.message } },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      const httpStatus = error.statusCode === 401 || error.statusCode === 403 ? 502 : (error.statusCode || 500);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.statusCode === 401 || error.statusCode === 403 ? "woocommerce_permission_error" : error.code,
            message: error.message,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: "internal_error", message: "Failed to perform order deletion/cancellation." } },
      { status: 500 }
    );
  }
}
