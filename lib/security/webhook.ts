/**
 * WooCommerce Webhook Security & Verification Helper.
 *
 * Validates HMAC-SHA256 signature from 'x-wc-webhook-signature' header.
 * Uses timing-safe string comparison to prevent timing side-channel attacks.
 */

import crypto from "crypto";
import { getServerEnv } from "@/lib/env";

export function verifyWooCommerceWebhook(
  rawBody: string,
  signatureHeader: string | null
): boolean {
  const { wooCommerce } = getServerEnv();
  const secret = wooCommerce.webhookSecret;

  // If webhook secret is not configured, reject the webhook
  if (!secret || secret.includes("placeholder")) {
    return false;
  }

  if (!signatureHeader || !rawBody) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("base64");

    const computedBuffer = Buffer.from(computedSignature, "utf8");
    const headerBuffer = Buffer.from(signatureHeader, "utf8");

    if (computedBuffer.length !== headerBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(computedBuffer, headerBuffer);
  } catch {
    return false;
  }
}
