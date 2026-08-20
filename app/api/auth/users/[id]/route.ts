import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteSystemUser, updateSystemUserPassword } from "@/lib/auth/user-store";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const success = await deleteSystemUser(id);
  if (!success) {
    return NextResponse.json(
      { success: false, error: { code: "delete_failed", message: "Cannot delete master administrator account or user not found." } },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, message: "User deleted successfully." });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  try {
    const body = await request.json();
    if (body.newPassword) {
      const ok = await updateSystemUserPassword(id, body.newPassword);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: { code: "not_found", message: "User not found." } },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ success: true, message: "User updated successfully." });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: "server_error", message: error instanceof Error ? error.message : "Failed to update user." } },
      { status: 500 }
    );
  }
}
