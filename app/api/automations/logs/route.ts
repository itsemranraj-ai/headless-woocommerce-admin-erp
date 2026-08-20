import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAutomationLogs, clearAutomationLogs } from "@/lib/automations/automation-log-store";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const trigger = searchParams.get("trigger") || "all";
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const data = getAutomationLogs({
    trigger,
    status,
    search,
    limit,
    offset,
  });

  return NextResponse.json({
    success: true,
    data,
  });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role === "staff") {
    return NextResponse.json(
      { success: false, error: { code: "forbidden", message: "Administrator access required." } },
      { status: 403 }
    );
  }

  clearAutomationLogs();
  return NextResponse.json({
    success: true,
    message: "Automation execution logs cleared successfully.",
  });
}
