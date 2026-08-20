import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSafeWhatsAppConfig, saveWhatsAppConfig } from "@/lib/whatsapp/whatsapp-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const config = getSafeWhatsAppConfig();
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
    const { wabaId, phoneNumberId, accessToken, apiVersion } = body;

    saveWhatsAppConfig({
      wabaId: wabaId ? String(wabaId).trim() : undefined,
      phoneNumberId: phoneNumberId ? String(phoneNumberId).trim() : undefined,
      accessToken: accessToken && !accessToken.includes("••••") ? String(accessToken).trim() : undefined,
      apiVersion: apiVersion ? String(apiVersion).trim() : "v21.0",
    });

    return NextResponse.json({
      success: true,
      message: "WhatsApp configuration saved successfully.",
      data: getSafeWhatsAppConfig(),
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
