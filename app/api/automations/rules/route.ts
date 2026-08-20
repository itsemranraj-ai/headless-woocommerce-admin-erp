import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getAutomationRules,
  getAutomationRuleById,
  createAutomationRule,
  updateAutomationRule,
  duplicateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  resetDefaultAutomationRules,
} from "@/lib/automations/automation-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const rules = getAutomationRules();
  return NextResponse.json({
    success: true,
    data: rules,
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
    const { action = "toggle", id, ruleData, enabled } = body;

    // 1. Toggle status
    if (action === "toggle") {
      if (!id || typeof enabled !== "boolean") {
        return NextResponse.json(
          { success: false, error: { code: "invalid_data", message: "Rule ID and boolean enabled status are required." } },
          { status: 400 }
        );
      }
      const ok = toggleAutomationRule(id, enabled);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Automation rule not found." } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: enabled ? "Automation enabled." : "Automation disabled.",
        data: { id, enabled },
      });
    }

    // 2. Create new automation
    if (action === "create") {
      if (!ruleData || !ruleData.name?.trim() || !ruleData.trigger) {
        return NextResponse.json(
          { success: false, error: { code: "validation_error", message: "Automation name and trigger event are required." } },
          { status: 400 }
        );
      }

      if (!Array.isArray(ruleData.actions) || ruleData.actions.length === 0) {
        return NextResponse.json(
          { success: false, error: { code: "validation_error", message: "At least one action is required." } },
          { status: 400 }
        );
      }

      const created = createAutomationRule(ruleData);
      return NextResponse.json({
        success: true,
        message: "Automation created successfully!",
        data: created,
      });
    }

    // 3. Update existing automation
    if (action === "update") {
      if (!id || !ruleData) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_data", message: "Rule ID and updated data are required." } },
          { status: 400 }
        );
      }

      const updated = updateAutomationRule(id, ruleData);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Automation not found." } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Automation updated successfully!",
        data: updated,
      });
    }

    // 4. Duplicate automation
    if (action === "duplicate") {
      if (!id) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_data", message: "Rule ID is required." } },
          { status: 400 }
        );
      }
      const duplicated = duplicateAutomationRule(id);
      if (!duplicated) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Automation not found." } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Automation duplicated!",
        data: duplicated,
      });
    }

    // 5. Delete automation
    if (action === "delete") {
      if (!id) {
        return NextResponse.json(
          { success: false, error: { code: "invalid_data", message: "Rule ID is required." } },
          { status: 400 }
        );
      }
      const ok = deleteAutomationRule(id);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "Automation not found." } },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: "Automation deleted successfully.",
      });
    }

    // 6. Reset defaults
    if (action === "reset_defaults") {
      const defaults = resetDefaultAutomationRules();
      return NextResponse.json({
        success: true,
        message: "Default automations restored.",
        data: defaults,
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "unknown_action", message: "Unknown action requested." } },
      { status: 400 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "server_error", message: err instanceof Error ? err.message : "Internal server error." },
      },
      { status: 500 }
    );
  }
}
