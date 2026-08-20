import { NextRequest, NextResponse } from "next/server";
import { signSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifyUserCredentials, fetchUsersFromCloud } from "@/lib/auth/user-store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body || {};

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_credentials", message: "Username and password are required." } },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim();

    // Ensure cloud users are synced across all serverless instances
    await fetchUsersFromCloud();

    // Verify against registered user database
    const user = verifyUserCredentials(cleanUsername, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "unauthorized", message: "Invalid username or password." } },
        { status: 401 }
      );
    }

    // Generate signed session token
    const token = await signSessionToken({
      username: user.username,
      role: user.role,
    });

    // Construct response with Set-Cookie header
    const response = NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
        },
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
          code: "server_error",
          message: error instanceof Error ? error.message : "Authentication processing failed.",
        },
      },
      { status: 500 }
    );
  }
}
