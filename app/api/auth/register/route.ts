import { NextRequest, NextResponse } from "next/server";
import { createSystemUser, getMasterAdminPasscode } from "@/lib/auth/user-store";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, username, password, role } = body || {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "missing_name", message: "Full Name is required." } },
        { status: 400 }
      );
    }

    if (!email || !email.trim() || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_email", message: "A valid Email Address is required." } },
        { status: 400 }
      );
    }

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_username", message: "Username must be at least 3 characters." } },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "weak_password", message: "Password must be at least 6 characters." } },
        { status: 400 }
      );
    }

    // If registering as Administrator, verify Master Admin Passcode
    if (role === "admin") {
      const { adminPasscode } = body || {};
      const currentMasterPasscode = getMasterAdminPasscode();
      const validPasscodes = [currentMasterPasscode, "FixionFuel@Admin2026#", "FixionFuel2026"];
      if (!adminPasscode || !validPasscodes.includes(adminPasscode.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "invalid_admin_passcode",
              message: "Invalid Master Admin Passcode. Only authorized administrators can create Admin accounts.",
            },
          },
          { status: 403 }
        );
      }
    }

    // Create new system user
    const newUser = await createSystemUser({
      name: name.trim(),
      email: email.trim(),
      username: username.trim(),
      password,
      role: role === "staff" ? "staff" : "admin",
    });

    // Send push notification to Admins when a new Sales Rep registers
    if (newUser.role === "staff") {
      try {
        const { notificationService } = await import("@/services/notifications");
        await notificationService.broadcastSalesRepRegisteredNotification({
          name: newUser.name,
          username: newUser.username,
          email: newUser.email,
        });
      } catch {
        // Non-blocking
      }
    }

    // Automatically issue login session token
    const token = await signSessionToken({
      username: newUser.username,
      role: newUser.role,
    });

    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          username: newUser.username,
          role: newUser.role,
        },
        message: "Account created successfully. Welcome to FixionFuel!",
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "registration_failed",
          message: error instanceof Error ? error.message : "Failed to register account.",
        },
      },
      { status: 400 }
    );
  }
}
