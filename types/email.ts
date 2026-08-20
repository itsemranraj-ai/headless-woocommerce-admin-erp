export type EmailScenario =
  | "new_order"
  | "order_processing"
  | "order_completed"
  | "order_cancelled"
  | "order_refunded"
  | "payment_failed"
  | "payment_completed"
  | "low_stock"
  | "out_of_stock"
  | "custom";

export interface EmailTemplate {
  id: string;
  name: string;
  scenario: EmailScenario;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  enabled: boolean;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EmailProvider = "smtp" | "resend" | "sendgrid" | "custom_api";

export interface EmailConfig {
  provider: EmailProvider;
  senderName: string;
  senderEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean; // true for 465, false for 587 / 25
  smtpUser: string;
  smtpPassword?: string; // Stored server-side only
  smtpPasswordMasked?: string; // Returned to client as ••••••••
  apiKey?: string; // Optional for Resend/SendGrid
  apiKeyMasked?: string;
  isConfigured: boolean;
  updatedAt: string;
}

export interface EmailLog {
  id: string;
  recipient: string;
  subject: string;
  templateId?: string;
  templateName?: string;
  orderId?: number;
  orderNumber?: string;
  status: "success" | "failed";
  errorMessage?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface EmailSendPayload {
  to: string;
  subject?: string;
  templateId?: string;
  scenario?: EmailScenario;
  variables?: Record<string, string | number | boolean | undefined | null>;
  orderData?: unknown;
  customHtml?: string;
  customText?: string;
  attachments?: EmailAttachment[];
  configOverride?: Partial<EmailConfig>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
