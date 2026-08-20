export type WhatsAppScenario =
  | "new_order"
  | "order_confirmed"
  | "order_processing"
  | "order_shipped"
  | "order_completed"
  | "order_cancelled"
  | "payment_failed"
  | "custom";

export interface WhatsAppTemplate {
  id: string;
  name: string;
  scenario: WhatsAppScenario;
  content: string;
  metaTemplateName?: string; // Optional Meta approved template name e.g. "hello_world"
  enabled: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppConfig {
  wabaId: string;
  phoneNumberId: string;
  accessToken?: string; // Server-side secured only
  accessTokenMasked?: string; // Masked for frontend: ••••••••
  apiVersion: string; // e.g. "v21.0"
  isConfigured: boolean;
  updatedAt: string;
}

export interface WhatsAppLog {
  id: string;
  recipientPhone: string;
  normalizedPhone: string;
  content: string;
  templateId?: string;
  templateName?: string;
  orderId?: number;
  orderNumber?: string;
  status: "sent" | "failed" | "pending";
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppSendPayload {
  to: string; // Recipient phone number
  templateId?: string;
  scenario?: WhatsAppScenario;
  metaTemplateName?: string; // e.g. "hello_world"
  customMessage?: string;
  variables?: Record<string, string | number | boolean | undefined | null>;
  orderData?: unknown;
}

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  normalizedPhone?: string;
}
