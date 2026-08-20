import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { whatsappService } from "@/services/whatsapp-service";
import { getWhatsAppTemplateById } from "@/lib/whatsapp/whatsapp-store";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action, to, templateId, customVariables, configOverride } = body;

    // 1. Verify Meta API connection
    if (action === "test_connection") {
      const result = await whatsappService.verifyConnection(configOverride);
      return NextResponse.json({
        success: result.success,
        message: result.message,
        details: result.details,
      });
    }

    // 2. Send live test message
    if (action === "send_test" || !action) {
      if (!to) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_phone", message: "A valid recipient phone number is required." } },
          { status: 400 }
        );
      }

      const result = await whatsappService.sendTestMessage(to.trim(), templateId, customVariables);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Test WhatsApp message successfully dispatched to ${result.normalizedPhone || to}!`,
          data: { messageId: result.messageId, normalizedPhone: result.normalizedPhone },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: result.errorCode || "send_failed",
              message: result.error || "Failed to dispatch WhatsApp message.",
            },
          },
          { status: 400 }
        );
      }
    }

    // 3. Render Live Preview
    if (action === "preview") {
      if (!templateId) {
        return NextResponse.json(
          { success: false, error: { code: "missing_template", message: "Template ID is required." } },
          { status: 400 }
        );
      }
      const template = getWhatsAppTemplateById(templateId);
      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Template not found." } },
          { status: 404 }
        );
      }

      const sampleVariables: Record<string, string> = {
        store_name: "Store ERP",
        customer_name: "Alexander Wright",
        customer_phone: to || "+1 (555) 234-5678",
        order_id: "1058",
        order_total: "295.00",
        order_status: "PROCESSING",
        order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        product_name: "Kisspeptin 10mg (Pack of 5)",
        tracking_number: "USPS-9400111899562537468219",
        ...customVariables,
      };

      const rendered = whatsappService.renderTemplate(template, sampleVariables);
      return NextResponse.json({
        success: true,
        data: { rendered },
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "unknown_action", message: "Unknown test action." } },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "test_error", message: err instanceof Error ? err.message : "Test execution failed." },
      },
      { status: 500 }
    );
  }
}
