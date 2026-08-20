import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { notificationService, VapidConfigError } from "@/services/notifications";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const result = await notificationService.sendTestNotification();

    return NextResponse.json({
      success: true,
      message: `Test push sent to ${result.delivered} active device(s).`,
      data: result,
    });
  } catch (error) {
    if (error instanceof VapidConfigError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "vapid_not_configured",
            message: error.message,
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "test_push_failed",
          message: error instanceof Error ? error.message : "Failed to send test push notification.",
        },
      },
      { status: 500 }
    );
  }
}
