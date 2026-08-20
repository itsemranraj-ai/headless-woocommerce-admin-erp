import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSafeEmailConfig, saveEmailConfig } from "@/lib/email/email-store";
import { emailService } from "@/services/email-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const config = getSafeEmailConfig();
  return NextResponse.json({
    success: true,
    data: config,
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
    const { senderName, senderEmail, smtpHost, smtpPort, smtpSecure, smtpUser, smtpPassword } = body;

    const updated = saveEmailConfig({
      senderName: senderName ? String(senderName).trim() : undefined,
      senderEmail: senderEmail ? String(senderEmail).trim() : undefined,
      smtpHost: smtpHost ? String(smtpHost).trim() : undefined,
      smtpPort: smtpPort ? parseInt(String(smtpPort), 10) : undefined,
      smtpSecure: typeof smtpSecure === "boolean" ? smtpSecure : undefined,
      smtpUser: smtpUser ? String(smtpUser).trim() : undefined,
      smtpPassword: smtpPassword && !smtpPassword.includes("••••") ? String(smtpPassword).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Email configuration updated successfully.",
      data: getSafeEmailConfig(),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "config_error", message: err instanceof Error ? err.message : "Failed to update configuration." },
      },
      { status: 400 }
    );
  }
}
