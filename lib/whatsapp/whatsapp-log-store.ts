import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { WhatsAppLog } from "@/types/whatsapp";

const LOGS_FILE = path.join(os.tmpdir(), "ff_whatsapp_logs.json");
const MAX_LOGS = 500;

let inMemoryLogs: WhatsAppLog[] = [];

function loadLogs(): WhatsAppLog[] {
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

function persistLogs(logs: WhatsAppLog[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, MAX_LOGS), null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function logWhatsAppMessage(entry: Omit<WhatsAppLog, "id" | "createdAt">): WhatsAppLog {
  const logs = loadLogs();
  const newLog: WhatsAppLog = {
    ...entry,
    id: `walog_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    createdAt: new Date().toISOString(),
  };

  logs.unshift(newLog);
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }

  inMemoryLogs = logs;
  persistLogs(logs);
  return newLog;
}

export function getWhatsAppLogs(options: {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
} = {}): { logs: WhatsAppLog[]; total: number; sentCount: number; failedCount: number } {
  const allLogs = loadLogs();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const total = allLogs.length;
  const sentCount = allLogs.filter((l) => l.status === "sent").length;
  const failedCount = allLogs.filter((l) => l.status === "failed").length;

  let filtered = allLogs;

  if (options.status && options.status !== "all") {
    filtered = filtered.filter((l) => l.status === options.status);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.recipientPhone.includes(q) ||
        l.normalizedPhone.includes(q) ||
        l.content.toLowerCase().includes(q) ||
        (l.templateName && l.templateName.toLowerCase().includes(q)) ||
        (l.orderNumber && String(l.orderNumber).includes(q)) ||
        (l.orderId && String(l.orderId).includes(q)) ||
        (l.messageId && l.messageId.includes(q))
    );
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total: filtered.length,
    sentCount,
    failedCount,
  };
}

export function clearWhatsAppLogs(): boolean {
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
