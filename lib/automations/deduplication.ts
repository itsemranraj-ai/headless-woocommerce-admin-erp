import fs from "fs";
import path from "path";
import os from "os";

const DEDUP_FILE = path.join(os.tmpdir(), "ff_automation_dedup.json");
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours retention

interface DedupEntry {
  processedAt: number;
}

let inMemoryDedup: Record<string, DedupEntry> = {};

function loadDedup(): Record<string, DedupEntry> {
  if (Object.keys(inMemoryDedup).length > 0) return inMemoryDedup;

  try {
    if (fs.existsSync(DEDUP_FILE)) {
      const data = fs.readFileSync(DEDUP_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        inMemoryDedup = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }

  return {};
}

function persistDedup(dedup: Record<string, DedupEntry>) {
  try {
    fs.writeFileSync(DEDUP_FILE, JSON.stringify(dedup, null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function isEventProcessed(eventKey: string): boolean {
  if (!eventKey) return false;
  const dedup = loadDedup();
  const entry = dedup[eventKey];

  if (!entry) return false;

  // Check TTL
  const now = Date.now();
  if (now - entry.processedAt > DEDUP_TTL_MS) {
    delete dedup[eventKey];
    inMemoryDedup = dedup;
    persistDedup(dedup);
    return false;
  }

  return true;
}

export function markEventProcessed(eventKey: string): void {
  if (!eventKey) return;
  const dedup = loadDedup();
  dedup[eventKey] = { processedAt: Date.now() };

  // Prune expired entries
  const now = Date.now();
  Object.keys(dedup).forEach((key) => {
    if (now - dedup[key].processedAt > DEDUP_TTL_MS) {
      delete dedup[key];
    }
  });

  inMemoryDedup = dedup;
  persistDedup(dedup);
}
