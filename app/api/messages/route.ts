import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMessagesBetween, addMessage, markConversationAsRead } from "@/lib/messages/message-store";
import { findUserByUsernameOrEmail } from "@/lib/auth/user-store";
import { notificationService } from "@/services/notifications";
import { formatDisplayName } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const partner = searchParams.get("partner");

  if (!partner) {
    return NextResponse.json(
      { success: false, error: { code: "missing_partner", message: "Partner username is required." } },
      { status: 400 }
    );
  }

  try {
    const messages = getMessagesBetween(session.username, partner);
    // Mark as read when fetching conversation
    markConversationAsRead(session.username, partner);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to load messages.",
        },
      },
      { status: 500 }
    );
  }
}

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
    const { recipientUsername, content, attachment } = body;

    const hasText = content && typeof content === "string" && content.trim().length > 0;
    const hasAttachment = attachment && typeof attachment === "object" && attachment.url;

    if (!recipientUsername || (!hasText && !hasAttachment)) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_payload", message: "Recipient and message content or attachment are required." } },
        { status: 400 }
      );
    }

    const recipientUser = findUserByUsernameOrEmail(recipientUsername);
    const recipientName = formatDisplayName(recipientUser?.name, recipientUsername);
    const senderUser = findUserByUsernameOrEmail(session.username);
    const senderName = formatDisplayName(senderUser?.name, session.username);

    const newMessage = addMessage(
      {
        username: session.username,
        name: senderName,
        role: session.role as any,
      },
      {
        username: recipientUsername,
        name: recipientName,
      },
      hasText ? content.trim() : "",
      hasAttachment ? attachment : undefined
    );

    // Non-blocking Web Push notification to all subscribed devices
    notificationService
      .broadcastChatMessageNotification({
        senderName,
        senderUsername: session.username,
        recipientUsername,
        content: hasText ? content.trim() : "",
        hasAttachment: Boolean(hasAttachment),
        attachmentType: attachment?.type,
      })
      .catch((err) => {
        console.debug("Background chat push broadcast error:", err);
      });

    return NextResponse.json({
      success: true,
      data: newMessage,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to send message.",
        },
      },
      { status: 500 }
    );
  }
}
