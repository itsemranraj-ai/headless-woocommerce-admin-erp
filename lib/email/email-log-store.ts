import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { EmailLog } from "@/types/email";

const LOGS_FILE = path.join(os.tmpdir(), "ff_email_logs.json");
const MAX_LOGS = 500; // Keep most recent 500 delivery logs for high performance

let inMemoryLogs: EmailLog[] = [];

function loadLogs(): EmailLog[] {
  if (inMemoryLogs.length > 0) return inMemoryLogs;

  try {
    if (fs.existsSync(LOGS_FILE)) {
      const data = fs.readFileSync(LOGS_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        inMemoryLogs = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

function persistLogs(logs: EmailLog[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, MAX_LOGS), null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function logEmailDelivery(entry: Omit<EmailLog, "id" | "createdAt">): EmailLog {
  const logs = loadLogs();
  const newLog: EmailLog = {
    ...entry,
    id: `elog_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    createdAt: new Date().toISOString(),
  };

  // Prepend to show most recent first
  logs.unshift(newLog);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  inMemoryLogs = logs;
  persistLogs(logs);
  return newLog;
}

export function getEmailLogs(options: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
} = {}): { logs: EmailLog[]; total: number; successCount: number; failedCount: number } {
  const allLogs = loadLogs();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const total = allLogs.length;
  const successCount = allLogs.filter((l) => l.status === "success").length;
  const failedCount = allLogs.filter((l) => l.status === "failed").length;

  let filtered = allLogs;

  if (options.status && options.status !== "all") {
    filtered = filtered.filter((l) => l.status === options.status);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.recipient.toLowerCase().includes(q) ||
        l.subject.toLowerCase().includes(q) ||
        (l.templateName && l.templateName.toLowerCase().includes(q)) ||
        (l.orderNumber && String(l.orderNumber).includes(q)) ||
        (l.orderId && String(l.orderId).includes(q))
    );
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total: filtered.length,
    successCount,
    failedCount,
  };
}

export function clearEmailLogs(): boolean {
  inMemoryLogs = [];
  try {
    if (fs.existsSync(LOGS_FILE)) {
      fs.unlinkSync(LOGS_FILE);
    }
  } catch {
    // Ignore
  }
  return true;
}
