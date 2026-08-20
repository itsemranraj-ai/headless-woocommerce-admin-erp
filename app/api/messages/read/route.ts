import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { markConversationAsRead } from "@/lib/messages/message-store";

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
    const { partnerUsername } = body;

    if (!partnerUsername) {
      return NextResponse.json(
        { success: false, error: { code: "missing_partner", message: "Partner username is required." } },
        { status: 400 }
      );
    }

    const count = markConversationAsRead(session.username, partnerUsername);

    return NextResponse.json({
      success: true,
      markedCount: count,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to mark as read.",
        },
      },
      { status: 500 }
    );
  }
}
