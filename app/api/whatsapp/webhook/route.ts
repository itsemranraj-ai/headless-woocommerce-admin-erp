import { NextRequest, NextResponse } from "next/server";
import { logWhatsAppMessage } from "@/lib/whatsapp/whatsapp-log-store";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "fixionfuel_whatsapp_verify_token";

/**
 * GET Handler: Meta Webhook Verification Challenge
 * Meta calls this when you click "Verify and save" in Developer / Production Setup.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification successful.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { success: false, error: "Verification token mismatch." },
    { status: 403 }
  );
}

/**
 * POST Handler: Meta Incoming Events & Delivery Status Updates
 * Receives delivery receipts (sent, delivered, read) and customer replies.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is an entry from a WhatsApp Business Account
    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;

      if (change) {
        // Status update (sent, delivered, read, failed)
        if (change.statuses && change.statuses.length > 0) {
          const statusObj = change.statuses[0];
          console.log(`[WhatsApp Webhook] Message ${statusObj.id} status: ${statusObj.status}`);
        }

        // Incoming message from customer
        if (change.messages && change.messages.length > 0) {
          const messageObj = change.messages[0];
          console.log(`[WhatsApp Webhook] Incoming message from ${messageObj.from}: ${messageObj.text?.body || ""}`);
        }
      }

      return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
    }

    return NextResponse.json({ status: "NOT_WHATSAPP_EVENT" }, { status: 404 });
  } catch (err: unknown) {
    console.error("[WhatsApp Webhook] Error processing incoming payload:", err);
    return NextResponse.json({ status: "ERROR" }, { status: 500 });
  }
}
