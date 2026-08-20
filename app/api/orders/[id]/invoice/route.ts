import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { woocommerceService } from "@/services/woocommerce";
import { generateInvoicePdf } from "@/lib/email/invoice-pdf";
import { emailService } from "@/services/email-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
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

    const pdfBuffer = generateInvoicePdf(order);

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Invoice-INV-${orderId}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "pdf_generation_error",
          message: error instanceof Error ? error.message : "Failed to generate invoice PDF.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  // Admin or staff can trigger invoice send
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

    const result = await emailService.sendOrderInvoiceEmail(order);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: "email_error", message: result.error || "Failed to send invoice email." } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Invoice PDF sent successfully to ${order.billing?.email || "customer"}!`,
      data: { messageId: result.messageId },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to send invoice email.",
        },
      },
      { status: 500 }
    );
  }
}
