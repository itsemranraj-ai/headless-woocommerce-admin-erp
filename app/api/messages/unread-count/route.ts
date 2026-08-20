import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getUnreadCountForUser } from "@/lib/messages/message-store";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ success: true, count: 0 });
  }

  try {
    const count = getUnreadCountForUser(session.username);
    return NextResponse.json({
      success: true,
      count,
    });
  } catch {
    return NextResponse.json({ success: true, count: 0 });
  }
}
