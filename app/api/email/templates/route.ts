import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getEmailTemplates,
  getEmailTemplateById,
  saveEmailTemplate,
  duplicateEmailTemplate,
  toggleEmailTemplate,
  deleteEmailTemplate,
  resetDefaultEmailTemplates,
} from "@/lib/email/email-store";
import { EmailScenario } from "@/types/email";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const templates = getEmailTemplates();
  return NextResponse.json({
    success: true,
    data: templates,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role === "staff") {
    return NextResponse.json(
      { success: false, error: { code: "forbidden", message: "Administrator access required." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { action, id, templateData, enabled } = body;

    switch (action) {
      case "create":
      case "update": {
        if (!templateData || !templateData.name || !templateData.subject || !templateData.bodyHtml) {
          return NextResponse.json(
            { success: false, error: { code: "invalid_data", message: "Template name, subject, and HTML body are required." } },
            { status: 400 }
          );
        }
        const saved = saveEmailTemplate({
          id: id || templateData.id,
          name: String(templateData.name).trim(),
          scenario: (templateData.scenario as EmailScenario) || "custom",
          subject: String(templateData.subject).trim(),
          bodyHtml: String(templateData.bodyHtml),
          bodyText: templateData.bodyText ? String(templateData.bodyText) : undefined,
          enabled: templateData.enabled !== undefined ? Boolean(templateData.enabled) : true,
        });
        return NextResponse.json({
          success: true,
          message: id ? "Template updated successfully." : "Template created successfully.",
          data: saved,
        });
      }

      case "duplicate": {
        if (!id) {
          return NextResponse.json(
            { success: false, error: { code: "missing_id", message: "Template ID is required." } },
            { status: 400 }
          );
        }
        const duplicated = duplicateEmailTemplate(id);
        if (!duplicated) {
          return NextResponse.json(
            { success: false, error: { code: "not_found", message: "Template not found." } },
            { status: 404 }
          );
        }
        return NextResponse.json({
          success: true,
          message: "Template duplicated successfully.",
          data: duplicated,
        });
      }

      case "toggle": {
        if (!id || typeof enabled !== "boolean") {
          return NextResponse.json(
            { success: false, error: { code: "invalid_data", message: "Template ID and enabled status required." } },
            { status: 400 }
          );
        }
        const ok = toggleEmailTemplate(id, enabled);
        return NextResponse.json({
          success: ok,
          message: enabled ? "Template enabled." : "Template disabled.",
        });
      }

      case "delete": {
        if (!id) {
          return NextResponse.json(
            { success: false, error: { code: "missing_id", message: "Template ID is required." } },
            { status: 400 }
          );
        }
        const ok = deleteEmailTemplate(id);
        return NextResponse.json({
          success: ok,
          message: "Template deleted successfully.",
        });
      }

      case "reset_defaults": {
        const templates = resetDefaultEmailTemplates();
        return NextResponse.json({
          success: true,
          message: "Default templates restored successfully.",
          data: templates,
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: { code: "unknown_action", message: `Unknown action: ${action}` } },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "template_error", message: err instanceof Error ? err.message : "Failed to process template request." },
      },
      { status: 500 }
    );
  }
}
