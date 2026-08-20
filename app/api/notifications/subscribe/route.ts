import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { notificationService } from "@/services/notifications";
import { getServerEnv, getPublicEnv } from "@/lib/env";
import { PushSubscriptionData } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  const { vapidPublicKey } = getPublicEnv();
  const { vapid } = getServerEnv();
  const subscriptions = await notificationService.getSubscriptions();

  const activeKey =
    vapidPublicKey ||
    vapid.publicKey ||
    "BH-90OzQAof2VRvv4oTMGK1LHapE2XJjABQkTBLjoILYwWtw-wAMcJNg5NuNr1vvYlTgBCjOhaQ06sFB0AsCEmo";

  return NextResponse.json({
    success: true,
    data: {
      isConfigured: true,
      vapidPublicKey: activeKey,
      activeSubscriptionsCount: subscriptions.length,
    },
  });
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
    const body = (await request.json()) as PushSubscriptionData;

    if (!body || !body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_subscription",
            message: "Push subscription payload is missing required endpoint or cryptographic keys.",
          },
        },
        { status: 400 }
      );
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const stored = await notificationService.saveSubscription(body, userAgent);

    return NextResponse.json(
      {
        success: true,
        message: "Browser push subscription registered successfully.",
        data: { id: stored.id, createdAt: stored.createdAt },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "subscription_error",
          message: error instanceof Error ? error.message : "Failed to register subscription.",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const endpoint = body?.endpoint;

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "invalid_endpoint",
            message: "Subscription endpoint is required to unsubscribe.",
          },
        },
        { status: 400 }
      );
    }

    await notificationService.removeSubscription(endpoint);

    return NextResponse.json({
      success: true,
      message: "Browser push subscription removed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "unsubscribe_error",
          message: error instanceof Error ? error.message : "Failed to remove subscription.",
        },
      },
      { status: 500 }
    );
  }
}
