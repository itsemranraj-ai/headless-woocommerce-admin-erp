import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { AutomationRule } from "@/types/automation";

const RULES_FILE = path.join(os.tmpdir(), "ff_dynamic_automation_rules.json");

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule_instant_order_confirm",
    name: "Instant Order Confirmation",
    description: "Sends an immediate WhatsApp confirmation and Email invoice to the customer upon order placement.",
    trigger: "order.created",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_whatsapp", scenario: "new_order" },
      { type: "send_email", scenario: "new_order" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_high_value_vip",
    name: "High-Value VIP Order Notification",
    description: "Detects large purchases (Total > $200) and triggers a WhatsApp VIP greeting, Email invoice, and Admin Push Alert.",
    trigger: "order.created",
    matchLogic: "AND",
    conditions: [
      {
        field: "order_total",
        operator: "greater_than",
        value: 200,
      },
    ],
    actions: [
      { type: "send_whatsapp", scenario: "order_confirmed" },
      { type: "send_email", scenario: "order_confirmed" },
      { type: "send_admin_notification", title: "VIP High-Value Order Received" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_order_processing",
    name: "Order Processing Update",
    description: "Sends an automated WhatsApp status dispatch and Email update when order fulfillment begins.",
    trigger: "order.processing",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_whatsapp", scenario: "order_processing" },
      { type: "send_email", scenario: "order_processing" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_order_completed",
    name: "Order Completed & Delivery Receipt",
    description: "Sends an official Email delivery receipt and WhatsApp delivery confirmation once fulfilled.",
    trigger: "order.completed",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_email", scenario: "order_completed" },
      { type: "send_whatsapp", scenario: "order_completed" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_order_cancelled",
    name: "Cancelled Order Follow-up",
    description: "Sends an Email cancellation notice, WhatsApp update to customer, and alerts the admin team.",
    trigger: "order.cancelled",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_email", scenario: "order_cancelled" },
      { type: "send_whatsapp", scenario: "order_cancelled" },
      { type: "send_admin_notification", title: "Order Cancelled by Customer/Admin" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_order_refunded",
    name: "Order Refunded Notification",
    description: "Sends an Email refund receipt and WhatsApp refund confirmation to the customer.",
    trigger: "order.refunded",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_email", scenario: "order_refunded" },
      { type: "send_whatsapp", scenario: "order_completed" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_payment_failed",
    name: "Payment Failed Recovery",
    description: "Sends an immediate WhatsApp recovery link and Email notice to customer when payment checkout fails.",
    trigger: "payment.failed",
    matchLogic: "AND",
    conditions: [],
    actions: [
      { type: "send_whatsapp", scenario: "payment_failed" },
      { type: "send_email", scenario: "payment_failed" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  {
    id: "rule_low_stock",
    name: "Low Stock Inventory Warning",
    description: "Alerts store admins via Email and in-app push when stock quantity reaches 3 units or below.",
    trigger: "product.low_stock",
    matchLogic: "AND",
    conditions: [
      {
        field: "stock_quantity",
        operator: "less_than_or_equal",
        value: 3,
      },
    ],
    actions: [
      { type: "send_email", scenario: "low_stock" },
      { type: "send_admin_notification", title: "Low Stock Warning" },
    ],
    enabled: true,
    isDefault: true,
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
];

let inMemoryRules: AutomationRule[] = [];

function loadRules(): AutomationRule[] {
  if (inMemoryRules.length > 0) return inMemoryRules;

  try {
    if (fs.existsSync(RULES_FILE)) {
      const data = fs.readFileSync(RULES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryRules = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }

  inMemoryRules = [...DEFAULT_AUTOMATION_RULES];
  persistRules(inMemoryRules);
  return inMemoryRules;
}

function persistRules(rules: AutomationRule[]) {
  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(rules, null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function getAutomationRules(): AutomationRule[] {
  return loadRules();
}

export function getAutomationRuleById(id: string): AutomationRule | null {
  const rules = loadRules();
  return rules.find((r) => r.id === id) || null;
}

export function getRulesByTrigger(trigger: string): AutomationRule[] {
  const rules = loadRules();
  return rules.filter((r) => {
    if (!r.enabled) return false;
    if (r.trigger === trigger) return true;
    if (trigger === "order.status_changed" && r.trigger.startsWith("order.")) return true;
    if (trigger === "order.payment_failed" && r.trigger === "payment.failed") return true;
    return false;
  });
}

export function createAutomationRule(ruleData: Omit<AutomationRule, "id" | "createdAt" | "updatedAt">): AutomationRule {
  const rules = loadRules();
  const newRule: AutomationRule = {
    ...ruleData,
    id: `rule_custom_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    matchLogic: ruleData.matchLogic || "AND",
    conditions: Array.isArray(ruleData.conditions) ? ruleData.conditions : [],
    actions: Array.isArray(ruleData.actions) ? ruleData.actions : [],
    enabled: ruleData.enabled !== undefined ? ruleData.enabled : true,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  rules.unshift(newRule);
  inMemoryRules = rules;
  persistRules(rules);
  return newRule;
}

export function updateAutomationRule(id: string, updates: Partial<AutomationRule>): AutomationRule | null {
  const rules = loadRules();
  const index = rules.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const existing = rules[index];
  const updated: AutomationRule = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: new Date().toISOString(),
  };

  rules[index] = updated;
  inMemoryRules = rules;
  persistRules(rules);
  return updated;
}

export function duplicateAutomationRule(id: string): AutomationRule | null {
  const rules = loadRules();
  const target = rules.find((r) => r.id === id);
  if (!target) return null;

  const duplicated: AutomationRule = {
    ...target,
    id: `rule_copy_${Date.now()}_${crypto.randomBytes(2).toString("hex")}`,
    name: `${target.name} (Copy)`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  rules.unshift(duplicated);
  inMemoryRules = rules;
  persistRules(rules);
  return duplicated;
}

export function deleteAutomationRule(id: string): boolean {
  const rules = loadRules();
  const filtered = rules.filter((r) => r.id !== id);
  if (filtered.length === rules.length) return false;

  inMemoryRules = filtered;
  persistRules(filtered);
  return true;
}

export function toggleAutomationRule(id: string, enabled: boolean): boolean {
  const rules = loadRules();
  const rule = rules.find((r) => r.id === id);
  if (!rule) return false;

  rule.enabled = enabled;
  rule.updatedAt = new Date().toISOString();
  inMemoryRules = rules;
  persistRules(rules);
  return true;
}

export function resetDefaultAutomationRules(): AutomationRule[] {
  inMemoryRules = [...DEFAULT_AUTOMATION_RULES];
  persistRules(inMemoryRules);
  return inMemoryRules;
}
