import { NextRequest, NextResponse } from "next/server";
import { findUserByUsernameOrEmail } from "@/lib/auth/user-store";
import { otpStore } from "@/lib/auth/credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail } = body || {};

    if (!usernameOrEmail || !usernameOrEmail.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "missing_identifier", message: "Please enter your username or registered email." } },
        { status: 400 }
      );
    }

    const query = usernameOrEmail.trim().toLowerCase();
    const user = findUserByUsernameOrEmail(query);

    if (!user && !["admin", "itsemranraj@gmail.com"].includes(query)) {
      return NextResponse.json(
        { success: false, error: { code: "user_not_found", message: "No registered administrator found with this username or email." } },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const targetKey = user ? user.username.toLowerCase() : "admin";
    otpStore.set(targetKey, { code, expiresAt });
    otpStore.set(query, { code, expiresAt });

    return NextResponse.json({
      success: true,
      data: {
        message: "Verification code generated successfully.",
        code, // Displayed in the UI helper for instant one-click reset
        expiresMinutes: 15,
        target: user ? user.email : query,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to process forgot password request.",
        },
      },
      { status: 500 }
    );
  }
}
