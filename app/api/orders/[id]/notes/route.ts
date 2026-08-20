import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  woocommerceService,
  WooCommerceConfigError,
  WooCommerceApiError,
} from "@/services/woocommerce";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to view order notes." } },
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
    const notes = await woocommerceService.getOrderNotes(orderId);
    return NextResponse.json({
      success: true,
      data: notes,
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
      { success: false, error: { code: "internal_error", message: "Failed to retrieve order notes." } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required to add order notes." } },
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
    const body = await request.json();
    const { note, customer_note } = body || {};

    if (!note || !String(note).trim()) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Note content cannot be empty." } },
        { status: 400 }
      );
    }

    const createdNote = await woocommerceService.createOrderNote(
      orderId,
      String(note).trim(),
      Boolean(customer_note)
    );

    return NextResponse.json(
      {
        success: true,
        data: createdNote,
      },
      { status: 201 }
    );
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
      { success: false, error: { code: "internal_error", message: "Failed to create order note." } },
      { status: 500 }
    );
  }
}
