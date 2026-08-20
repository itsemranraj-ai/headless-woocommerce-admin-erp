import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAllUsers, createSystemUser, fetchUsersFromCloud } from "@/lib/auth/user-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  // Only Admins / Managers can view the user list
  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json(
      { success: false, error: { code: "forbidden", message: "Administrator permission required." } },
      { status: 403 }
    );
  }

  const cloudUsers = await fetchUsersFromCloud();
  const users = cloudUsers.map(({ passwordHash, ...user }) => user);
  return NextResponse.json({ success: true, data: users });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { success: false, error: { code: "unauthorized", message: "Authentication required." } },
      { status: 401 }
    );
  }

  if (session.role !== "admin" && session.role !== "manager") {
    return NextResponse.json(
      { success: false, error: { code: "forbidden", message: "Administrator permission required." } },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, username, password, role } = body || {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Name is required." } },
        { status: 400 }
      );
    }
    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Username must be at least 3 chars." } },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: "validation_error", message: "Password must be at least 6 chars." } },
        { status: 400 }
      );
    }

    const newUser = await createSystemUser({
      name: name.trim(),
      email: email?.trim() || `${username.trim()}@itsemranraj.com/sss`,
      username: username.trim(),
      password,
      role: role === "staff" ? "staff" : "admin",
    });

    const { passwordHash, ...safeUser } = newUser;
    return NextResponse.json({ success: true, data: safeUser }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "server_error", message: error instanceof Error ? error.message : "Failed to create user." } },
      { status: 500 }
    );
  }
}
