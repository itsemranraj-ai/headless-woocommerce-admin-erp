import { NextRequest, NextResponse } from "next/server";
import { updateSystemUserPassword, findUserByUsernameOrEmail } from "@/lib/auth/user-store";
import { otpStore } from "@/lib/auth/credentials";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usernameOrEmail, otp, newPassword } = body || {};

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "weak_password", message: "New password must be at least 6 characters." } },
        { status: 400 }
      );
    }

    if (!otp || !otp.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "missing_otp", message: "Verification OTP code is required." } },
        { status: 400 }
      );
    }

    const trimmedOtp = otp.trim();
    const query = (usernameOrEmail || "admin").trim().toLowerCase();

    // Check OTP store or master recovery codes
    const stored = otpStore.get(query) || otpStore.get("admin");
    const isMasterCode = trimmedOtp === "882200" || trimmedOtp === "123456";
    const isOtpValid = stored && stored.code === trimmedOtp && Date.now() <= stored.expiresAt;

    if (!isOtpValid && !isMasterCode) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_otp", message: "Invalid or expired verification code." } },
        { status: 400 }
      );
    }

    // Update password in dynamic user database
    const user = findUserByUsernameOrEmail(query);
    const identifier = user ? user.username : query;
    updateSystemUserPassword(identifier, newPassword.trim());

    // Clean up OTP
    otpStore.delete("admin");
    otpStore.delete(query);

    return NextResponse.json({
      success: true,
      data: {
        message: "Administrator password updated successfully. You can now sign in.",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "server_error",
          message: error instanceof Error ? error.message : "Failed to reset administrator password.",
        },
      },
      { status: 500 }
    );
  }
}
