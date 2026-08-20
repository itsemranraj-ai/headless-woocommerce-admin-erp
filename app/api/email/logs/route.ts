import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getEmailLogs, clearEmailLogs } from "@/lib/email/email-log-store";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  const data = getEmailLogs({
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

  clearEmailLogs();
  return NextResponse.json({
    success: true,
    message: "Email delivery logs cleared successfully.",
  });
}
