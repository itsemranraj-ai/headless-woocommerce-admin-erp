import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";
import { notificationService } from "@/services/notifications";
import { CreateOrderPayload, Order } from "@/types";

export async function GET(request: NextRequest) {
  // Verify application authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to access orders." } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "15", 10);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const { fetchUsersFromCloud, getUserOrderIds } = await import("@/lib/auth/user-store");
    await fetchUsersFromCloud();

    const isStaff = session.role === "staff";

    if (isStaff) {
      const myOrderIds = new Set(getUserOrderIds(session.username));

      // Fetch batch from WooCommerce to filter
      const result = await woocommerceService.getOrders({
        page: 1,
        perPage: 100,
        status: status === "all" ? undefined : status,
        search,
      });

      const staffOrders = result.items.filter((o: Order) => {
        if (myOrderIds.has(o.id)) return true;
        const repMeta = o.meta_data?.find(
          (m) =>
            m.key === "_sales_rep_username" ||
            m.key === "_created_by" ||
            m.key === "sales_rep"
        );
        if (repMeta && String(repMeta.value).toLowerCase() === session.username.toLowerCase()) {
          return true;
        }
        return false;
      });

      const total = staffOrders.length;
      const totalPages = Math.ceil(total / perPage) || 1;
      const paginated = staffOrders.slice((page - 1) * perPage, page * perPage);

      return NextResponse.json(
        {
          success: true,
          data: {
            items: paginated,
            total,
            totalPages,
            page,
            perPage,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          },
        }
      );
    }

    // Admin sees all store orders
    const result = await woocommerceService.getOrders({
      page,
      perPage,
      status: status === "all" ? undefined : status,
      search,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "woocommerce_not_configured",
            message: error.message,
          },
        },
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
            message: error.statusCode === 401 || error.statusCode === 403 
              ? `WooCommerce REST API rejected credentials: ${error.message} (Please verify Consumer Key and Consumer Secret permissions in WordPress).`
              : error.message,
            details: error.details,
          },
        },
        { status: httpStatus }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : "Failed to fetch orders.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to create orders." } },
      { status: 401 }
    );
  }

  try {
    const body = (await request.json()) as CreateOrderPayload;

    if (!body.line_items || !Array.isArray(body.line_items) || body.line_items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "validation_error", message: "At least one order line item is required." },
        },
        { status: 400 }
      );
    }

    // Sanitize and ensure billing & shipping emails are valid so WooCommerce never fails with "Invalid parameter(s): billing"
    const billing = { ...(body.billing || {}) };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!billing.email || typeof billing.email !== "string" || !billing.email.trim() || !emailRegex.test(billing.email.trim())) {
      const phoneDigits = (billing.phone || "").replace(/[^0-9]/g, "");
      billing.email = `customer_${phoneDigits || Date.now()}@itsemranraj.com/sss`;
    }

    const shipping = { ...(body.shipping || billing) };
    if (!shipping.email || typeof shipping.email !== "string" || !shipping.email.trim() || !emailRegex.test(shipping.email.trim())) {
      shipping.email = billing.email;
    }

    const metaData = [
      ...(body.meta_data || []),
      { key: "_sales_rep_username", value: session.username.toLowerCase() },
      { key: "_sales_rep_name", value: session.username },
      { key: "_created_by", value: session.username.toLowerCase() },
    ];

    const newOrder = await woocommerceService.createOrder({
      ...body,
      billing,
      shipping,
      meta_data: metaData,
    });

    // Record order in Sales Rep performance store
    try {
      const { recordUserOrder } = await import("@/lib/auth/user-store");
      recordUserOrder(session.username, newOrder.id, parseFloat(newOrder.total) || 0);
    } catch {
      // Non-critical logging
    }

    // Broadcast push notification to subscribed admin devices
    try {
      await notificationService.broadcastNewOrderNotification(newOrder);
    } catch (pushErr) {
      console.error("Failed to broadcast push notification on order create:", pushErr);
    }

    // Trigger automations for order.created
    try {
      const { automationEngine } = await import("@/services/automation-engine");
      await automationEngine.processEvent({
        trigger: "order.created",
        eventId: `order_created_${newOrder.id}_${Date.now()}`,
        orderData: newOrder as any,
      });
    } catch (autoErr) {
      console.error("[Orders API] Failed to trigger automation on order create:", autoErr);
    }

    return NextResponse.json(
      {
        success: true,
        data: newOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof WooCommerceConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "woocommerce_not_configured",
            message: error.message,
          },
        },
        { status: 503 }
      );
    }

    if (error instanceof WooCommerceApiError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "internal_error",
          message: error instanceof Error ? error.message : "Failed to create order.",
        },
      },
      { status: 500 }
    );
  }
}
