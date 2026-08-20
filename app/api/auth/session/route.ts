import { NextResponse } from "next/server";
import { getSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { findUserByUsernameOrEmail, fetchUsersFromCloud, ensureSessionUserExists } from "@/lib/auth/user-store";
import { cookies } from "next/headers";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { success: true, data: { authenticated: false } },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );
  }

  // Ensure cloud users are loaded across serverless instances
  await fetchUsersFromCloud();

  // Verify that the user exists in user database or restore from verified JWT payload
  let existingUser = findUserByUsernameOrEmail(session.username);
  if (!existingUser) {
    existingUser = ensureSessionUserExists(session);
  }

  if (!existingUser) {
    // User was genuinely deleted by admin. Invalidate cookie.
    try {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);
    } catch {
      // Ignore
    }

    const response = NextResponse.json(
      {
        success: true,
        data: {
          authenticated: false,
          error: "account_deleted",
          message: "Your account has been deleted by an administrator.",
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
    );

    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        authenticated: true,
        user: {
          username: existingUser.username,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      },
    },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" } }
  );
}
