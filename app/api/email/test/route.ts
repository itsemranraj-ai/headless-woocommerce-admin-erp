import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { emailService } from "@/services/email-service";
import { getEmailTemplateById, interpolateEmailVariables } from "@/lib/email/email-store";

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

    // 1. Test SMTP Connection Handshake
    if (action === "test_connection") {
      const result = await emailService.verifySmtpConnection(configOverride);
      return NextResponse.json({
        success: result.success,
        message: result.message,
      });
    }

    // 2. Send Live Test Email
    if (action === "send_test" || !action) {
      if (!to || !to.includes("@")) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_email", message: "A valid recipient email address is required." } },
          { status: 400 }
        );
      }

      const result = await emailService.sendTestEmail(to.trim(), templateId, customVariables, configOverride);

      if (result.success) {
        return NextResponse.json({
          success: true,
          message: `Test email successfully dispatched to ${to}!`,
          data: { messageId: result.messageId },
        });
      } else {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "send_failed",
              message: result.error || "Failed to dispatch test email.",
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
      const template = getEmailTemplateById(templateId);
      if (!template) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Template not found." } },
          { status: 404 }
        );
      }

      const sampleVariables: Record<string, string> = {
        store_name: "Store ERP",
        customer_name: "Alexander Wright",
        customer_email: to || "customer@example.com",
        customer_phone: "+1 (555) 234-5678",
        order_id: "1058",
        order_total: "295.00",
        order_status: "PROCESSING",
        order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        product_name: "Kisspeptin 10mg (Pack of 5)",
        product_quantity: "2",
        tracking_number: "USPS-9400111899562537468219",
        billing_address: "742 Evergreen Terrace, Springfield, OR 97477, US",
        shipping_address: "742 Evergreen Terrace, Springfield, OR 97477, US",
        ...customVariables,
      };

      const rendered = emailService.renderTemplate(template, sampleVariables);
      return NextResponse.json({
        success: true,
        data: rendered,
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
