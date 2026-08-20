import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";
import { EmailConfig, EmailTemplate, EmailScenario } from "@/types/email";

const CONFIG_FILE = path.join(os.tmpdir(), "ff_email_config.json");
const TEMPLATES_FILE = path.join(os.tmpdir(), "ff_email_templates.json");

// Default initial seed templates for all standard WooCommerce scenarios
export const SEED_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "tpl_new_order",
    name: "New Order Confirmation",
    scenario: "new_order",
    subject: "Order Confirmation #{order_id} - Thank You for Shopping with {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #18181b; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">{store_name}</h1>
    <p style="color: #a1a1aa; margin: 8px 0 0 0; font-size: 14px;">Order Confirmed & Received</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hi {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Thank you for your order! We have received order <strong>#{order_id}</strong> placed on {order_date}. Our dispatch team is currently preparing your package.</p>
    
    <div style="background-color: #f4f4f5; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="color: #71717a; padding-bottom: 8px;">Order Number:</td>
          <td style="color: #18181b; font-weight: 700; text-align: right; padding-bottom: 8px;">#{order_id}</td>
        </tr>
        <tr>
          <td style="color: #71717a; padding-bottom: 8px;">Order Status:</td>
          <td style="color: #18181b; font-weight: 700; text-align: right; padding-bottom: 8px;">{order_status}</td>
        </tr>
        <tr>
          <td style="color: #71717a; padding-top: 8px; border-top: 1px solid #e4e4e7;">Total Amount:</td>
          <td style="color: #16a34a; font-weight: 800; font-size: 18px; text-align: right; padding-top: 8px; border-top: 1px solid #e4e4e7;">\${order_total}</td>
        </tr>
      </table>
    </div>

    <p style="color: #52525b; font-size: 14px; line-height: 1.6;">If you have any questions or need to make changes to your shipping address, simply reply to this email.</p>
    
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hi {customer_name},\n\nThank you for your order #{order_id} of ${order_total} placed on {order_date}.\nStatus: {order_status}\n\nThank you,\n{store_name}",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_order_processing",
    name: "Order Processing Update",
    scenario: "order_processing",
    subject: "Your Order #{order_id} is Now Being Processed - {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #2563eb; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #dbeafe; margin: 8px 0 0 0; font-size: 14px;">Order Status Update</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hello {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Great news! Your order <strong>#{order_id}</strong> is now <strong>Processing</strong> and being prepared for shipment.</p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #1e40af; font-size: 14px; font-weight: 600;">Current Status: In Fulfillment & Quality Check</p>
    </div>

    <p style="color: #52525b; font-size: 14px; line-height: 1.6;">We will notify you immediately once your package is dispatched with tracking information.</p>
    
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hello {customer_name},\n\nYour order #{order_id} is now processing and being packed.\n\nThank you,\n{store_name}",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_order_completed",
    name: "Order Completed & Delivered",
    scenario: "order_completed",
    subject: "Order #{order_id} Completed - Thank You from {store_name}!",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #16a34a; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #dcfce7; margin: 8px 0 0 0; font-size: 14px;">Order Completed Successfully</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hi {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Your order <strong>#{order_id}</strong> has been completed and marked as delivered!</p>
    
    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center;">
      <p style="color: #15803d; font-size: 16px; font-weight: 700; margin: 0;">Total Paid: \${order_total}</p>
      <p style="color: #166534; font-size: 13px; margin: 4px 0 0 0;">Thank you for trusting {store_name}</p>
    </div>

    <p style="color: #52525b; font-size: 14px; line-height: 1.6;">We hope you are delighted with your items. If you have any feedback or need support, our team is always here to assist.</p>
    
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hi {customer_name},\n\nYour order #{order_id} (Total: ${order_total}) has been completed.\n\nThank you for shopping with {store_name}!",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_order_cancelled",
    name: "Order Cancelled Notification",
    scenario: "order_cancelled",
    subject: "Order #{order_id} Has Been Cancelled - {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #dc2626; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #fee2e2; margin: 8px 0 0 0; font-size: 14px;">Order Cancellation Notice</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hello {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">This email is to notify you that your order <strong>#{order_id}</strong> has been cancelled.</p>
    
    <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #991b1b; font-size: 14px; margin: 0;">If this was done in error or you have questions regarding a refund, please contact our support team immediately.</p>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hello {customer_name},\n\nOrder #{order_id} has been cancelled.\nPlease contact {store_name} if you have any questions.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_order_refunded",
    name: "Order Refund Confirmation",
    scenario: "order_refunded",
    subject: "Refund Processed for Order #{order_id} - {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #475569; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #e2e8f0; margin: 8px 0 0 0; font-size: 14px;">Refund Confirmation</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hi {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">We have processed a refund for order <strong>#{order_id}</strong> (\${order_total}). The refund will reflect in your original payment account within 3-5 business days depending on your bank.</p>
    
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hi {customer_name},\n\nA refund has been processed for order #{order_id} (${order_total}).\n\nThank you,\n{store_name}",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_payment_failed",
    name: "Payment Failed Alert",
    scenario: "payment_failed",
    subject: "Action Required: Payment Failed for Order #{order_id} - {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #ea580c; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #ffedd5; margin: 8px 0 0 0; font-size: 14px;">Payment Issue Encountered</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hello {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">We were unable to process payment for order <strong>#{order_id}</strong> (\${order_total}).</p>
    
    <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #9a3412; font-size: 14px;">Please retry your payment or update your billing details to prevent order cancellation.</p>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hello {customer_name},\n\nPayment failed for order #{order_id} (${order_total}). Please update your payment information.\n\n{store_name}",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_payment_completed",
    name: "Payment Completed Receipt",
    scenario: "payment_completed",
    subject: "Payment Received for Order #{order_id} - {store_name}",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #0f766e; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">{store_name}</h1>
    <p style="color: #ccfbf1; margin: 8px 0 0 0; font-size: 14px;">Payment Receipt</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hi {customer_name},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">We have successfully received your payment of <strong>\${order_total}</strong> for order <strong>#{order_id}</strong>.</p>
    
    <div style="background-color: #f0fdfa; border: 1px solid #99f6e4; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #115e59; font-weight: 700; margin: 0; font-size: 14px;">✓ Payment Verified & Secured</p>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #a1a1aa; font-size: 12px;">
      <p style="margin: 0;">&copy; {store_name}. All rights reserved.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Hi {customer_name},\n\nPayment of ${order_total} for order #{order_id} has been verified.\n\nThank you,\n{store_name}",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_low_stock",
    name: "Low Stock Inventory Warning (Admin)",
    scenario: "low_stock",
    subject: "⚠️ Low Stock Alert: {product_name} ({product_quantity} remaining)",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #b45309; padding: 28px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">{store_name} Inventory Alert</h1>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 18px; font-weight: 700; margin-top: 0;">Low Stock Warning</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">The inventory level for <strong>{product_name}</strong> is currently at <strong>{product_quantity} units</strong>.</p>
    
    <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <p style="color: #92400e; font-weight: 700; margin: 0; font-size: 14px;">Action Required: Re-order stock to avoid fulfillment delays.</p>
    </div>
  </div>
</div>
`.trim(),
    bodyText: "Low Stock Alert for {store_name}:\n{product_name} has only {product_quantity} units remaining.\n\nPlease restock soon.",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "tpl_out_of_stock",
    name: "Out of Stock Critical Alert (Admin)",
    scenario: "out_of_stock",
    subject: "🚨 Critical: {product_name} is NOW OUT OF STOCK",
    bodyHtml: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea;">
  <div style="background-color: #991b1b; padding: 28px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">{store_name} Stock Out Alert</h1>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 18px; font-weight: 700; margin-top: 0;">Product Out of Stock</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;"><strong>{product_name}</strong> has reached 0 units and is now out of stock in your store catalog.</p>
  </div>
</div>
`.trim(),
    bodyText: "Out of Stock Critical Alert for {store_name}:\n{product_name} is now out of stock (0 units).",
    enabled: true,
    isDefault: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let inMemoryTemplates: EmailTemplate[] = [];
let inMemoryConfig: EmailConfig | null = null;

export function interpolateEmailVariables(
  templateText: string,
  variables: Record<string, string | number | boolean | undefined | null>
): string {
  if (!templateText) return "";

  // Normalize defaults
  const defaults: Record<string, string> = {
    store_name: "Store ERP",
    customer_name: "Valued Customer",
    customer_email: "",
    customer_phone: "",
    order_id: "",
    order_total: "0.00",
    order_status: "Pending",
    order_date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    product_name: "Product",
    product_quantity: "1",
    tracking_number: "N/A",
    billing_address: "",
    shipping_address: "",
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
    return match; // Leave unreplaced if unknown
  });
}

export function getEmailConfig(): EmailConfig {
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
    // Ignore filesystem read error
  }

  // Fallback default config
  const envHost = process.env.SMTP_HOST || "";
  const envPort = Number(process.env.SMTP_PORT) || 587;
  const envUser = process.env.SMTP_USER || "";
  const envPass = process.env.SMTP_PASSWORD || "";
  const envSenderName = process.env.SMTP_FROM_NAME || "Store ERP Order Desk";
  const envSenderEmail = process.env.SMTP_FROM_EMAIL || "orders@itsemranraj.com/sss";

  const isConfigured = Boolean(envHost && envUser);

  const defaultConfig: EmailConfig = {
    provider: "smtp",
    senderName: envSenderName,
    senderEmail: envSenderEmail,
    smtpHost: envHost,
    smtpPort: envPort,
    smtpSecure: envPort === 465,
    smtpUser: envUser,
    smtpPassword: envPass,
    isConfigured,
    updatedAt: new Date().toISOString(),
  };

  inMemoryConfig = defaultConfig;
  return defaultConfig;
}

export function getSafeEmailConfig(): Omit<EmailConfig, "smtpPassword"> & { smtpPasswordMasked: string } {
  const config = getEmailConfig();
  const hasPass = Boolean(config.smtpPassword && config.smtpPassword.length > 0);
  return {
    provider: config.provider,
    senderName: config.senderName,
    senderEmail: config.senderEmail,
    smtpHost: config.smtpHost,
    smtpPort: config.smtpPort,
    smtpSecure: config.smtpSecure,
    smtpUser: config.smtpUser,
    smtpPasswordMasked: hasPass ? "••••••••••••" : "",
    isConfigured: config.isConfigured,
    updatedAt: config.updatedAt,
  };
}

export function saveEmailConfig(newConfig: Partial<EmailConfig>): EmailConfig {
  const current = getEmailConfig();
  const updated: EmailConfig = {
    ...current,
    ...newConfig,
    // Preserve existing password if not supplied in update
    smtpPassword: newConfig.smtpPassword && newConfig.smtpPassword.trim().length > 0 && !newConfig.smtpPassword.includes("••••")
      ? newConfig.smtpPassword
      : current.smtpPassword,
    isConfigured: Boolean(
      (newConfig.smtpHost || current.smtpHost) &&
      (newConfig.smtpUser || current.smtpUser)
    ),
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

export function getEmailTemplates(): EmailTemplate[] {
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

  inMemoryTemplates = [...SEED_EMAIL_TEMPLATES];
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(inMemoryTemplates, null, 2), "utf-8");
  } catch {
    // Ignore
  }
  return inMemoryTemplates;
}

export function getEmailTemplateById(id: string): EmailTemplate | null {
  const templates = getEmailTemplates();
  return templates.find((t) => t.id === id) || null;
}

export function getEmailTemplateByScenario(scenario: EmailScenario): EmailTemplate | null {
  const templates = getEmailTemplates();
  return templates.find((t) => t.scenario === scenario && t.enabled) || null;
}

export function saveEmailTemplate(templateData: Partial<EmailTemplate> & { name: string; scenario: EmailScenario; subject: string; bodyHtml: string }): EmailTemplate {
  const templates = getEmailTemplates();
  const now = new Date().toISOString();

  if (templateData.id) {
    const idx = templates.findIndex((t) => t.id === templateData.id);
    if (idx !== -1) {
      const updated: EmailTemplate = {
        ...templates[idx],
        ...templateData,
        updatedAt: now,
      };
      templates[idx] = updated;
      inMemoryTemplates = templates;
      persistTemplates(templates);
      return updated;
    }
  }

  // Create new template
  const newTemplate: EmailTemplate = {
    id: `tpl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    name: templateData.name,
    scenario: templateData.scenario,
    subject: templateData.subject,
    bodyHtml: templateData.bodyHtml,
    bodyText: templateData.bodyText,
    enabled: templateData.enabled !== undefined ? templateData.enabled : true,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(newTemplate);
  inMemoryTemplates = templates;
  persistTemplates(templates);
  return newTemplate;
}

export function duplicateEmailTemplate(id: string): EmailTemplate | null {
  const templates = getEmailTemplates();
  const target = templates.find((t) => t.id === id);
  if (!target) return null;

  const now = new Date().toISOString();
  const copy: EmailTemplate = {
    ...target,
    id: `tpl_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`,
    name: `${target.name} (Copy)`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  templates.push(copy);
  inMemoryTemplates = templates;
  persistTemplates(templates);
  return copy;
}

export function toggleEmailTemplate(id: string, enabled: boolean): boolean {
  const templates = getEmailTemplates();
  const target = templates.find((t) => t.id === id);
  if (!target) return false;

  target.enabled = enabled;
  target.updatedAt = new Date().toISOString();
  inMemoryTemplates = templates;
  persistTemplates(templates);
  return true;
}

export function deleteEmailTemplate(id: string): boolean {
  const templates = getEmailTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  if (filtered.length === templates.length) return false;

  inMemoryTemplates = filtered;
  persistTemplates(filtered);
  return true;
}

export function resetDefaultEmailTemplates(): EmailTemplate[] {
  inMemoryTemplates = [...SEED_EMAIL_TEMPLATES];
  persistTemplates(inMemoryTemplates);
  return inMemoryTemplates;
}

function persistTemplates(templates: EmailTemplate[]) {
  try {
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2), "utf-8");
  } catch {
    // Ignore
  }
}
