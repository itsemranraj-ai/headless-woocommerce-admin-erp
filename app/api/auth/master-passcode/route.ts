import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getMasterAdminPasscode, setMasterAdminPasscode } from "@/lib/auth/user-store";

export async function GET() {
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

  const passcode = getMasterAdminPasscode();
  return NextResponse.json({ success: true, data: { passcode } });
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
    const { passcode } = body || {};

    if (!passcode || passcode.trim().length < 4) {
      return NextResponse.json(
        { success: false, error: { code: "invalid_passcode", message: "Passcode must be at least 4 characters long." } },
        { status: 400 }
      );
    }

    await setMasterAdminPasscode(passcode.trim());
    return NextResponse.json({
      success: true,
      data: { passcode: passcode.trim() },
      message: "Master Admin Passcode updated successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "server_error", message: "Failed to update passcode." } },
      { status: 500 }
    );
  }
}
