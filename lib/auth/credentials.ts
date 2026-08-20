import fs from "fs";
import path from "path";
import { getServerEnv } from "@/lib/env";

const CREDENTIALS_FILE = path.join(process.cwd(), ".admin-auth.json");

// In-memory cache for OTP codes: key = username/email, value = { code, expiresAt }
export const otpStore = new Map<string, { code: string; expiresAt: number }>();

export function getAdminCredentials(): { username: string; password: string } {
  const { auth } = getServerEnv();
  const defaultUsername = auth.adminUsername || "admin";
  let password = auth.adminPassword || "admin12345";

  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
      if (data.password) {
        password = data.password;
      }
      if (data.username) {
        return { username: data.username, password };
      }
    }
  } catch {
    // Ignore file read error and use env
  }

  return { username: defaultUsername, password };
}

export function updateAdminPassword(newPassword: string): boolean {
  try {
    const creds = getAdminCredentials();
    const updated = {
      username: creds.username,
      password: newPassword,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(updated, null, 2), "utf-8");

    // Also update process.env for the active session
    process.env.ADMIN_PASSWORD = newPassword;
    return true;
  } catch (err) {
    console.error("Failed to update admin credentials file:", err);
    process.env.ADMIN_PASSWORD = newPassword;
    return true;
  }
}
