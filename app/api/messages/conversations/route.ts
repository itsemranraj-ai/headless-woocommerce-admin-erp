import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getConversationsList } from "@/lib/messages/message-store";
import { findUserByUsernameOrEmail, fetchUsersFromCloud } from "@/lib/auth/user-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    // Ensure all sales reps are loaded from cloud on Vercel Serverless instances
    await fetchUsersFromCloud();

    const user = findUserByUsernameOrEmail(session.username);
    const conversations = getConversationsList({
      username: session.username,
      role: session.role,
      name: user?.name || session.username,
    });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to load conversations.",
        },
      },
      { status: 500 }
    );
  }
}
