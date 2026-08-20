import fs from "fs";
import path from "path";
import os from "os";
import { WhatsAppConfig, WhatsAppTemplate, WhatsAppScenario } from "@/types/whatsapp";

const CONFIG_FILE = path.join(os.tmpdir(), "ff_whatsapp_config.json");
const TEMPLATES_FILE = path.join(os.tmpdir(), "ff_whatsapp_templates.json");

// Default initial seed templates for standard WhatsApp scenarios
export const SEED_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "wa_tpl_new_order",
    name: "New Order Received",
    scenario: "new_order",
    content: "Hi {customer_name}! 👋 Thank you for placing order #{order_id} at {store_name}.\n\n📦 Order Total: ${order_total}\n📅 Date: {order_date}\n\nOur team is currently preparing your package. We will notify you once it's on the way!",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_order_confirmed",
    name: "Order Confirmed",
    scenario: "order_confirmed",
    content: "Hi {customer_name}, your order #{order_id} has been confirmed! 🎉\n\nTotal Paid: ${order_total}\nThank you for choosing {store_name}.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_order_processing",
    name: "Order Processing Update",
    scenario: "order_processing",
    content: "Hello {customer_name}! ⚙️ Your order #{order_id} is now being processed and packed by our dispatch team at {store_name}.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_order_shipped",
    name: "Order Shipped & Tracking",
    scenario: "order_shipped",
    content: "Great news {customer_name}! 🚀 Your order #{order_id} has been dispatched.\n\n🚚 Tracking Number: {tracking_number}\n\nThank you for trusting {store_name}!",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_order_completed",
    name: "Order Completed & Delivered",
    scenario: "order_completed",
    content: "Hi {customer_name}! ✨ Your order #{order_id} has been marked as completed and delivered.\n\nWe hope you love your products. Thank you for shopping with {store_name}!",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_order_cancelled",
    name: "Order Cancelled Notice",
    scenario: "order_cancelled",
    content: "Hello {customer_name}, order #{order_id} has been cancelled. If you believe this is an error or need assistance, please reply to this message.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "wa_tpl_payment_failed",
    name: "Payment Failed Recovery",
    scenario: "payment_failed",
    content: "Hi {customer_name}, payment for order #{order_id} could not be completed. Please visit {store_name} to update your payment method and secure your items.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryTemplates: WhatsAppTemplate[] = [];
let inMemoryConfig: WhatsAppConfig | null = null;

export function interpolateWhatsAppVariables(
  templateText: string,
  variables: Record<string, string | number | boolean | undefined | null>
): string {
  if (!templateText) return "";

  const defaults: Record<string, string> = {
    store_name: "Store ERP",
    customer_name: "Valued Customer",
    customer_phone: "",
    order_id: "",
    order_total: "0.00",
    order_status: "Pending",
    order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    product_name: "Product",
    tracking_number: "N/A",
  };

  const merged = { ...defaults };
  Object.entries(variables).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      merged[k] = String(v);
    }
  });

  return templateText.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    if (key in merged) {
      return merged[key];
    }
    return match;
  });
}

export function getWhatsAppConfig(): WhatsAppConfig {
  if (inMemoryConfig) {
    return inMemoryConfig;
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === "object") {
        inMemoryConfig = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore read error
  }

  // Fallback from environment variables
  const envWabaId = process.env.WHATSAPP_WABA_ID || "";
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN || "";
  const envVersion = process.env.WHATSAPP_API_VERSION || "v21.0";

  const isConfigured = Boolean(envPhoneId && envToken);

  const defaultConfig: WhatsAppConfig = {
    wabaId: envWabaId,
    phoneNumberId: envPhoneId,
    accessToken: envToken,
    apiVersion: envVersion,
    isConfigured,
    updatedAt: new Date().toISOString(),
  };

  inMemoryConfig = defaultConfig;
  return defaultConfig;
}

export function getSafeWhatsAppConfig(): Omit<WhatsAppConfig, "accessToken"> & { accessTokenMasked: string } {
  const config = getWhatsAppConfig();
  const hasToken = Boolean(config.accessToken && config.accessToken.length > 0);
  return {
    wabaId: config.wabaId,
    phoneNumberId: config.phoneNumberId,
    apiVersion: config.apiVersion || "v21.0",
    accessTokenMasked: hasToken ? "••••••••••••••••" : "",
    isConfigured: config.isConfigured,
    updatedAt: config.updatedAt,
  };
}

export function saveWhatsAppConfig(newConfig: Partial<WhatsAppConfig>): WhatsAppConfig {
  const current = getWhatsAppConfig();
  const token = newConfig.accessToken && newConfig.accessToken.trim().length > 0 && !newConfig.accessToken.includes("••••")
    ? newConfig.accessToken.trim()
    : current.accessToken;

  const phoneId = newConfig.phoneNumberId !== undefined ? newConfig.phoneNumberId.trim() : current.phoneNumberId;
  const wabaId = newConfig.wabaId !== undefined ? newConfig.wabaId.trim() : current.wabaId;

  const updated: WhatsAppConfig = {
    ...current,
    wabaId,
    phoneNumberId: phoneId,
    apiVersion: newConfig.apiVersion ? newConfig.apiVersion.trim() : current.apiVersion || "v21.0",
    accessToken: token,
    isConfigured: Boolean(phoneId && token),
    updatedAt: new Date().toISOString(),
  };

  inMemoryConfig = updated;

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch {
    // Ignore tmp write errors
  }

  return updated;
}

export function getWhatsAppTemplates(): WhatsAppTemplate[] {
  if (inMemoryTemplates.length > 0) {
    return inMemoryTemplates;
  }

  try {
    if (fs.existsSync(TEMPLATES_FILE)) {
      const data = fs.readFileSync(TEMPLATES_FILE, "utf-8");
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryTemplates = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }

  inMemoryTemplates = [...SEED_WHATSAPP_TEMPLATES];
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(inMemoryTemplates, null, 2), "utf-8");
  } catch {
    // Ignore
  }
  return inMemoryTemplates;
}

export function getWhatsAppTemplateById(id: string): WhatsAppTemplate | null {
  const templates = getWhatsAppTemplates();
  return templates.find((t) => t.id === id) || null;
}

export function getWhatsAppTemplateByScenario(scenario: WhatsAppScenario): WhatsAppTemplate | null {
  const templates = getWhatsAppTemplates();
  return templates.find((t) => t.scenario === scenario && t.enabled) || null;
}

export function createWhatsAppTemplate(templateData: Omit<WhatsAppTemplate, "id" | "createdAt" | "updatedAt">): WhatsAppTemplate {
  const templates = getWhatsAppTemplates();
  const newTemplate: WhatsAppTemplate = {
    ...templateData,
    id: `wa_tpl_custom_${Date.now()}`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  templates.push(newTemplate);
  inMemoryTemplates = templates;

  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
  } catch {
    // Ignore
  }

  return newTemplate;
}

export function updateWhatsAppTemplate(id: string, updates: Partial<WhatsAppTemplate>): WhatsAppTemplate | null {
  const templates = getWhatsAppTemplates();
  const index = templates.findIndex((t) => t.id === id);
  if (index === -1) return null;

  const updated: WhatsAppTemplate = {
    ...templates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  templates[index] = updated;
  inMemoryTemplates = templates;

  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
  } catch {
    // Ignore
  }

  return updated;
}

export function deleteWhatsAppTemplate(id: string): boolean {
  const templates = getWhatsAppTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;

  inMemoryTemplates = filtered;
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(filtered, null, 2), "utf-8");
  } catch {
    // Ignore
  }

  return true;
}

export function saveWhatsAppTemplate(templateData: Partial<WhatsAppTemplate> & { id?: string }): WhatsAppTemplate {
  if (templateData.id) {
    const updated = updateWhatsAppTemplate(templateData.id, templateData);
    if (updated) return updated;
  }
  return createWhatsAppTemplate(templateData as any);
}

export function duplicateWhatsAppTemplate(id: string): WhatsAppTemplate | null {
  const templates = getWhatsAppTemplates();
  const target = templates.find((t) => t.id === id);
  if (!target) return null;
  return createWhatsAppTemplate({
    ...target,
    name: `${target.name} (Copy)`,
    isDefault: false,
  });
}

export function toggleWhatsAppTemplate(id: string, enabled: boolean): boolean {
  const updated = updateWhatsAppTemplate(id, { enabled });
  return Boolean(updated);
}

export function resetDefaultWhatsAppTemplates(): WhatsAppTemplate[] {
  inMemoryTemplates = [...SEED_WHATSAPP_TEMPLATES];
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(inMemoryTemplates, null, 2), "utf-8");
  } catch {
    // Ignore
  }
  return inMemoryTemplates;
}
