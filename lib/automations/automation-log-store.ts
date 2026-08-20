import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { AutomationExecutionLog } from "@/types/automation";

const LOGS_FILE = path.join(os.tmpdir(), "ff_automation_execution_logs.json");
const MAX_LOGS = 500;

let inMemoryLogs: AutomationExecutionLog[] = [];

function loadLogs(): AutomationExecutionLog[] {
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

function persistLogs(logs: AutomationExecutionLog[]) {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs.slice(0, MAX_LOGS), null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function logAutomationExecution(entry: Omit<AutomationExecutionLog, "id" | "createdAt">): AutomationExecutionLog {
  const logs = loadLogs();
  const newLog: AutomationExecutionLog = {
    ...entry,
    id: `autolog_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
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

export function getAutomationLogs(options: {
  limit?: number;
  offset?: number;
  trigger?: string;
  status?: string;
  search?: string;
} = {}): {
  logs: AutomationExecutionLog[];
  total: number;
  successCount: number;
  partialFailureCount: number;
  failedCount: number;
} {
  const allLogs = loadLogs();
  const limit = options.limit || 50;
  const offset = options.offset || 0;

  const total = allLogs.length;
  const successCount = allLogs.filter((l) => l.overallStatus === "success").length;
  const partialFailureCount = allLogs.filter((l) => l.overallStatus === "partial_failure").length;
  const failedCount = allLogs.filter((l) => l.overallStatus === "failed").length;

  let filtered = allLogs;

  if (options.trigger && options.trigger !== "all") {
    filtered = filtered.filter((l) => l.trigger === options.trigger);
  }

  if (options.status && options.status !== "all") {
    filtered = filtered.filter((l) => l.overallStatus === options.status);
  }

  if (options.search && options.search.trim()) {
    const q = options.search.toLowerCase().trim();
    filtered = filtered.filter(
      (l) =>
        l.ruleName.toLowerCase().includes(q) ||
        l.trigger.toLowerCase().includes(q) ||
        (l.orderNumber && String(l.orderNumber).includes(q)) ||
        (l.orderId && String(l.orderId).includes(q)) ||
        (l.productName && l.productName.toLowerCase().includes(q))
    );
  }

  const paginated = filtered.slice(offset, offset + limit);

  return {
    logs: paginated,
    total: filtered.length,
    successCount,
    partialFailureCount,
    failedCount,
  };
}

export function clearAutomationLogs(): boolean {
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
