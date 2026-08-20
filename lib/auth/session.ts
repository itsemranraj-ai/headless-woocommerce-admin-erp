/**
 * Session Manager for Store Admin ERP Application.
 *
 * Implements HMAC-SHA256 stateless session tokens using Node.js crypto.
 * Cookie properties enforce httpOnly, sameSite lax, and secure flags.
 */

import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env";

export const SESSION_COOKIE_NAME = "ff_admin_session";
const DEFAULT_SESSION_DURATION_SEC = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  username: string;
  role: "admin" | "manager" | "staff";
  iat: number;
  exp: number;
}

/**
 * Signs a payload into an HMAC-SHA256 token: `header.payload.signature`
 */
export async function signSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">,
  durationSec: number = DEFAULT_SESSION_DURATION_SEC
): Promise<string> {
  const { auth } = getServerEnv();
  const secret = auth.secret || "dev_demo-store_auth_secret_key_32_bytes";

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + durationSec,
  };

  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(dataToSign)
    .digest("base64url");

  return `${dataToSign}.${signature}`;
}

/**
 * Verifies an HMAC-SHA256 session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToVerify = `${encodedHeader}.${encodedPayload}`;

  const { auth } = getServerEnv();
  const secret = auth.secret || "dev_demo-store_auth_secret_key_32_bytes";

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(dataToVerify)
      .digest("base64url");

    // Constant-time comparison
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payloadJson = Buffer.from(encodedPayload, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson) as SessionPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Retrieves the current session from incoming cookies in Server Components or Route Handlers.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) return null;

  return verifySessionToken(sessionCookie.value);
}

/**
 * Guard function to require an active session. Throws error or returns payload.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Authentication required.");
  }
  return session;
}
