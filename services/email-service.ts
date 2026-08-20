import net from "net";
import tls from "tls";
import { EmailConfig, EmailSendPayload, EmailSendResult, EmailTemplate } from "@/types/email";
import { getEmailConfig, getEmailTemplateById, getEmailTemplateByScenario, interpolateEmailVariables } from "@/lib/email/email-store";
import { logEmailDelivery } from "@/lib/email/email-log-store";
import { Order } from "@/types";

/**
 * Pure Node.js zero-dependency RFC 5321/5322 SMTP client.
 * Connects directly to SMTP servers (e.g. Gmail, Hostinger, Outlook, AWS SES, SendGrid SMTP, Mailgun)
 * supporting both direct TLS (port 465) and STARTTLS (port 587/25).
 */
async function sendRawSmtpEmail(
  config: EmailConfig,
  mailOptions: {
    from: string;
    fromName: string;
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer | string;
      contentType?: string;
    }>;
  }
): Promise<{ success: boolean; messageId: string; response: string }> {
  const host = (config.smtpHost || "smtp.gmail.com").trim();
  const port = Number(config.smtpPort) || (config.smtpSecure ? 465 : 587);
  const secure = port === 465;
  const clientDomain = host.includes(".") ? host.split(".").slice(-2).join(".") : "localhost";
  const user = config.smtpUser;
  const pass = config.smtpPassword || "";

  if (!host || !user) {
    throw new Error("SMTP host and username must be configured.");
  }

  const messageId = `<${Date.now()}.${Math.random().toString(36).substring(2, 9)}@${host}>`;

  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket;
    let buffer = "";
    let step = 0;
    let isTlsUpgraded = false;

    const timeout = setTimeout(() => {
      if (socket) socket.destroy();
      reject(new Error(`SMTP Connection to ${host}:${port} timed out after 12 seconds.`));
    }, 12000);

    function cleanup() {
      clearTimeout(timeout);
    }

    function send(cmd: string) {
      if (socket && socket.writable) {
        socket.write(cmd + "\r\n");
      }
    }

    function handleResponse(data: Buffer) {
      buffer += data.toString("utf-8");
      const lines = buffer.split("\r\n");

      // Process complete lines
      while (lines.length > 1) {
        const line = lines.shift() || "";
        const code = parseInt(line.substring(0, 3), 10);
        const isMultiLine = line.charAt(3) === "-";

        if (isMultiLine) {
          continue; // Wait for final line of multi-line response
        }

        if (isNaN(code)) continue;

        if (code >= 400) {
          cleanup();
          socket.destroy();
          return reject(new Error(`SMTP Server Error (${code}): ${line}`));
        }

        // State Machine
        if (step === 0 && code === 220) {
          // Greeting received, send EHLO
          step = 1;
          send(`EHLO ${clientDomain}`);
        } else if (step === 1 && code === 250) {
          if (!secure && !isTlsUpgraded && (port === 587 || port === 25)) {
            // Initiate STARTTLS
            step = 2;
            send("STARTTLS");
          } else {
            // Proceed directly to AUTH LOGIN
            step = 3;
            send("AUTH LOGIN");
          }
        } else if (step === 2 && code === 220) {
          // STARTTLS accepted, upgrade socket to TLS
          isTlsUpgraded = true;
          const plainSocket = socket as net.Socket;
          plainSocket.removeAllListeners("data");

          const secureSocket = tls.connect({
            socket: plainSocket,
            servername: host,
            rejectUnauthorized: false,
          });

          socket = secureSocket;
          secureSocket.on("data", handleResponse);
          secureSocket.on("error", (err) => {
            cleanup();
            reject(err);
          });

          // Resend EHLO on encrypted channel
          step = 1;
          send(`EHLO ${clientDomain}`);
        } else if (step === 3 && code === 334) {
          // Send Username in base64
          step = 4;
          send(Buffer.from(user).toString("base64"));
        } else if (step === 4 && code === 334) {
          // Send Password in base64
          step = 5;
          send(Buffer.from(pass).toString("base64"));
        } else if (step === 5 && code === 235) {
          // Authentication successful, send MAIL FROM
          step = 6;
          send(`MAIL FROM:<${mailOptions.from}>`);
        } else if (step === 6 && code === 250) {
          // Send RCPT TO
          step = 7;
          send(`RCPT TO:<${mailOptions.to}>`);
        } else if (step === 7 && code === 250) {
          // Send DATA command
          step = 8;
          send("DATA");
        } else if (step === 8 && code === 354) {
          // Send MIME message content
          step = 9;

          let mimeData = "";
          if (mailOptions.attachments && mailOptions.attachments.length > 0) {
            const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            const lines: string[] = [
              `From: "${mailOptions.fromName}" <${mailOptions.from}>`,
              `To: <${mailOptions.to}>`,
              `Subject: ${mailOptions.subject}`,
              `Message-ID: ${messageId}`,
              `Date: ${new Date().toUTCString()}`,
              `MIME-Version: 1.0`,
              `Content-Type: multipart/mixed; boundary="${boundary}"`,
              ``,
              `--${boundary}`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: 8bit`,
              ``,
              mailOptions.html,
              ``,
            ];

            for (const att of mailOptions.attachments) {
              const base64Content = Buffer.isBuffer(att.content)
                ? att.content.toString("base64")
                : Buffer.from(att.content).toString("base64");

              lines.push(
                `--${boundary}`,
                `Content-Type: ${att.contentType || "application/pdf"}; name="${att.filename}"`,
                `Content-Transfer-Encoding: base64`,
                `Content-Disposition: attachment; filename="${att.filename}"`,
                ``,
                base64Content.replace(/(.{76})/g, "$1\r\n"),
                ``
              );
            }

            lines.push(`--${boundary}--`, `.`);
            mimeData = lines.join("\r\n");
          } else {
            mimeData = [
              `From: "${mailOptions.fromName}" <${mailOptions.from}>`,
              `To: <${mailOptions.to}>`,
              `Subject: ${mailOptions.subject}`,
              `Message-ID: ${messageId}`,
              `Date: ${new Date().toUTCString()}`,
              `MIME-Version: 1.0`,
              `Content-Type: text/html; charset=UTF-8`,
              `Content-Transfer-Encoding: 8bit`,
              ``,
              mailOptions.html,
              `.`,
            ].join("\r\n");
          }

          send(mimeData);
        } else if (step === 9 && code === 250) {
          // Message accepted for delivery, send QUIT
          step = 10;
          send("QUIT");
          cleanup();
          resolve({
            success: true,
            messageId,
            response: line,
          });
        }
      }
      buffer = lines.join("\r\n");
    }

    try {
      if (secure) {
        socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {});
      } else {
        socket = net.connect({ host, port }, () => {});
      }

      socket.on("data", handleResponse);
      socket.on("error", (err) => {
        cleanup();
        reject(err);
      });
      socket.on("close", () => {
        cleanup();
      });
    } catch (err) {
      cleanup();
      reject(err);
    }
  });
}

/**
 * Extracts standard dynamic template variables from a WooCommerce Order object.
 */
export function extractVariablesFromOrder(order: Partial<Order> & Record<string, unknown>): Record<string, string> {
  const billing = (order.billing || {}) as Record<string, unknown>;
  const shipping = (order.shipping || {}) as Record<string, unknown>;
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];

  const customerName =
    String(billing.first_name || "") + (billing.last_name ? ` ${billing.last_name}` : "") ||
    String(shipping.first_name || "") + (shipping.last_name ? ` ${shipping.last_name}` : "") ||
    "Customer";

  const customerEmail = String(billing.email || "");
  const customerPhone = String(billing.phone || "");

  const orderId = String(order.id || order.number || "");
  const orderTotal = String(order.total || "0.00");
  const orderStatus = String(order.status || "Pending");
  const orderDate = order.date_created
    ? new Date(String(order.date_created)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const firstItem = lineItems[0] as unknown as Record<string, unknown> | undefined;
  const productName = firstItem ? String(firstItem.name || "Product Item") : "Store Product";
  const productQuantity = firstItem ? String(firstItem.quantity || "1") : "1";

  const billingAddress = [billing.address_1, billing.city, billing.state, billing.postcode, billing.country]
    .filter(Boolean)
    .join(", ");
  const shippingAddress = [shipping.address_1, shipping.city, shipping.state, shipping.postcode, shipping.country]
    .filter(Boolean)
    .join(", ") || billingAddress;

  const trackingMeta = Array.isArray(order.meta_data)
    ? (order.meta_data as Array<{ key: string; value: unknown }>).find((m) =>
        m.key === "_tracking_number" || m.key === "tracking_number" || m.key === "custom_tracking_number"
      )
    : undefined;
  const trackingNumber = trackingMeta ? String(trackingMeta.value) : "N/A";

  return {
    store_name: "Store ERP",
    customer_name: customerName.trim(),
    customer_email: customerEmail.trim(),
    customer_phone: customerPhone.trim(),
    order_id: orderId,
    order_total: orderTotal,
    order_status: orderStatus.toUpperCase(),
    order_date: orderDate,
    product_name: productName,
    product_quantity: productQuantity,
    billing_address: billingAddress,
    shipping_address: shippingAddress,
    tracking_number: trackingNumber,
  };
}

export class EmailService {
  /**
   * Dispatches an email using template or custom payload.
   * Fully reusable for standalone calls, manual test sends, and Automation Engine action hooks.
   */
  async sendEmail(payload: EmailSendPayload): Promise<EmailSendResult> {
    const baseConfig = getEmailConfig();
    const config: EmailConfig = {
      ...baseConfig,
      ...payload.configOverride,
      smtpPassword: payload.configOverride?.smtpPassword && !payload.configOverride.smtpPassword.includes("••••")
        ? payload.configOverride.smtpPassword
        : baseConfig.smtpPassword,
    };

    if (!payload.to || !payload.to.includes("@")) {
      const err = "Invalid recipient email address.";
      logEmailDelivery({
        recipient: payload.to || "unknown",
        subject: payload.subject || "No Subject",
        status: "failed",
        errorMessage: err,
      });
      return { success: false, error: err };
    }

    // 1. Resolve template if specified
    let template: EmailTemplate | null = null;
    if (payload.templateId) {
      template = getEmailTemplateById(payload.templateId);
    } else if (payload.scenario) {
      template = getEmailTemplateByScenario(payload.scenario);
    }

    // 2. Prepare variables
    let resolvedVars: Record<string, string> = {};
    if (payload.orderData && typeof payload.orderData === "object") {
      resolvedVars = extractVariablesFromOrder(payload.orderData as Record<string, unknown>);
    }
    if (payload.variables) {
      Object.entries(payload.variables).forEach(([k, v]) => {
        if (v !== undefined && v !== null) resolvedVars[k] = String(v);
      });
    }

    // 3. Resolve Subject and HTML body
    let finalSubject = payload.subject || "";
    let finalHtml = payload.customHtml || "";
    let finalTemplateName = "Custom Email";

    if (template) {
      finalSubject = interpolateEmailVariables(template.subject, resolvedVars);
      finalHtml = interpolateEmailVariables(template.bodyHtml, resolvedVars);
      finalTemplateName = template.name;
    } else if (payload.subject && payload.customHtml) {
      finalSubject = interpolateEmailVariables(payload.subject, resolvedVars);
      finalHtml = interpolateEmailVariables(payload.customHtml, resolvedVars);
    } else {
      const err = "No email template or custom body provided.";
      logEmailDelivery({
        recipient: payload.to,
        subject: finalSubject || "Untitled Email",
        status: "failed",
        errorMessage: err,
      });
      return { success: false, error: err };
    }

    const orderId = resolvedVars.order_id ? parseInt(resolvedVars.order_id, 10) : undefined;
    const orderNumber = resolvedVars.order_id || undefined;

    // 4. Check if SMTP configuration is ready
    if (!config.smtpHost || !config.smtpUser || !config.smtpPassword) {
      const errorMsg = "SMTP is not configured. Please enter your SMTP Host, Username, and Password in the 'SMTP & Provider' tab.";
      logEmailDelivery({
        recipient: payload.to,
        subject: finalSubject,
        templateId: template?.id,
        templateName: finalTemplateName,
        orderId,
        orderNumber,
        status: "failed",
        errorMessage: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }

    // 5. Send real email via SMTP
    try {
      const res = await sendRawSmtpEmail(config, {
        from: config.senderEmail || "orders@itsemranraj.com/sss",
        fromName: config.senderName || "Store ERP",
        to: payload.to,
        subject: finalSubject,
        html: finalHtml,
        text: template ? interpolateEmailVariables(template.bodyText || "", resolvedVars) : undefined,
        attachments: payload.attachments,
      });

      logEmailDelivery({
        recipient: payload.to,
        subject: finalSubject,
        templateId: template?.id,
        templateName: finalTemplateName,
        orderId,
        orderNumber,
        status: "success",
        metadata: { messageId: res.messageId, attachmentsCount: payload.attachments?.length || 0 },
      });

      return {
        success: true,
        messageId: res.messageId,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "SMTP dispatch failed.";
      logEmailDelivery({
        recipient: payload.to,
        subject: finalSubject,
        templateId: template?.id,
        templateName: finalTemplateName,
        orderId,
        orderNumber,
        status: "failed",
        errorMessage: errorMsg,
      });

      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Generates and emails the official Invoice PDF directly to the customer.
   * Triggered automatically when Admin completes an order, or manually.
   */
  async sendOrderInvoiceEmail(order: Order): Promise<EmailSendResult> {
    const customerEmail = order.billing?.email || (order.shipping as any)?.email;
    if (!customerEmail || !customerEmail.includes("@")) {
      return {
        success: false,
        error: "Customer has no valid email address.",
      };
    }

    const { generateInvoicePdf } = await import("@/lib/email/invoice-pdf");
    const pdfBuffer = generateInvoicePdf(order);
    const orderId = String(order.id || order.number || "0");
    const customerName = `${order.billing?.first_name || ""} ${order.billing?.last_name || ""}`.trim() || "Customer";

    const customHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #eaeaea; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
  <div style="background-color: #18181b; padding: 32px 24px; text-align: center;">
    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Store ERP</h1>
    <p style="color: #22c55e; margin: 8px 0 0 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">✓ Order Completed & Invoiced</p>
  </div>
  <div style="padding: 32px 24px;">
    <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-top: 0;">Hi ${customerName},</h2>
    <p style="color: #52525b; font-size: 15px; line-height: 1.6;">Thank you for shopping with <strong>Store ERP</strong>! Your order <strong>#${orderId}</strong> has been marked as <strong>Completed</strong>.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="color: #64748b; padding-bottom: 8px;">Invoice Number:</td>
          <td style="color: #0f172a; font-weight: 700; text-align: right; padding-bottom: 8px;">INV-${orderId}</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding-bottom: 8px;">Order Status:</td>
          <td style="color: #16a34a; font-weight: 800; text-align: right; padding-bottom: 8px;">COMPLETED / PAID</td>
        </tr>
        <tr>
          <td style="color: #64748b; padding-top: 8px; border-top: 1px solid #e2e8f0;">Total Amount Paid:</td>
          <td style="color: #16a34a; font-weight: 900; font-size: 18px; text-align: right; padding-top: 8px; border-top: 1px solid #e2e8f0;">$${order.total || "0.00"} USD</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; color: #15803d; font-size: 14px; font-weight: 600;">📎 Attached: Official Tax Invoice PDF (Invoice-INV-${orderId}.pdf)</p>
      <p style="margin: 4px 0 0 0; color: #166534; font-size: 12px;">Your official PDF invoice is attached to this email for your records and accounting.</p>
    </div>

    <p style="color: #52525b; font-size: 14px; line-height: 1.6;">If you have any questions, require tracking assistance, or need further support, please feel free to reply directly to this email.</p>
    
    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; text-align: center; color: #94a3b8; font-size: 12px;">
      <p style="margin: 0;">&copy; Store ERP • <a href="https://itsemranraj.com/sss" style="color: #64748b; text-decoration: none;">itsemranraj.com/sss</a></p>
    </div>
  </div>
</div>
`.trim();

    return this.sendEmail({
      to: customerEmail,
      subject: `Official Invoice & Receipt for Order #${orderId} - Store ERP`,
      customHtml,
      orderData: order as any,
      attachments: [
        {
          filename: `Invoice-INV-${orderId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });
  }

  /**
   * Sends a test email to the specified address with sample or custom variables.
   */
  async sendTestEmail(
    to: string,
    templateId?: string,
    customVariables?: Record<string, string>,
    configOverride?: Partial<EmailConfig>
  ): Promise<EmailSendResult> {
    const sampleOrderData = {
      id: 1058,
      number: "1058",
      total: "295.00",
      status: "processing",
      date_created: new Date().toISOString(),
      billing: {
        first_name: "Alexander",
        last_name: "Wright",
        email: to,
        phone: "+1 (555) 234-5678",
        address_1: "742 Evergreen Terrace",
        city: "Springfield",
        state: "OR",
        postcode: "97477",
        country: "US",
      },
      line_items: [
        {
          id: 1,
          name: "Kisspeptin 10mg & HGH 191aa Pack",
          quantity: 2,
          price: "147.50",
        },
      ],
      meta_data: [{ key: "_tracking_number", value: "USPS-9400111899562537468219" }],
    };

    return this.sendEmail({
      to,
      templateId: templateId || "tpl_new_order",
      orderData: sampleOrderData,
      variables: customVariables,
      configOverride,
    });
  }

  /**
   * Verifies SMTP connection and authentication handshake.
   */
  async verifySmtpConnection(overrideConfig?: Partial<EmailConfig>): Promise<{ success: boolean; message: string }> {
    const current = getEmailConfig();
    const config: EmailConfig = {
      ...current,
      ...overrideConfig,
      smtpPassword: overrideConfig?.smtpPassword && !overrideConfig.smtpPassword.includes("••••")
        ? overrideConfig.smtpPassword
        : current.smtpPassword,
    };

    if (!config.smtpHost || !config.smtpUser) {
      return {
        success: false,
        message: "SMTP Host and Username are required to verify connection.",
      };
    }

    try {
      const fromEmail = (config.senderEmail || config.smtpUser || "orders@itsemranraj.com").trim();
      const toEmail = (config.smtpUser || config.senderEmail || "verify@itsemranraj.com").trim();

      const res = await sendRawSmtpEmail(config, {
        from: fromEmail,
        fromName: config.senderName || "Store ERP Verifier",
        to: toEmail,
        subject: "SMTP Connection Verification Ping",
        html: "<p>Store ERP SMTP Connection Verified Successfully.</p>",
      });

      return {
        success: true,
        message: `Successfully connected to SMTP server ${config.smtpHost}:${config.smtpPort}! (${res.response})`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Failed to connect to SMTP server.",
      };
    }
  }

  /**
   * Renders a template with given variables for instant UI live preview.
   */
  renderTemplate(
    template: EmailTemplate,
    variables: Record<string, string>
  ): { subject: string; html: string; text: string } {
    const subject = interpolateEmailVariables(template.subject, variables);
    const html = interpolateEmailVariables(template.bodyHtml, variables);
    const text = interpolateEmailVariables(template.bodyText || "", variables);
    return { subject, html, text };
  }
}

export const emailService = new EmailService();
