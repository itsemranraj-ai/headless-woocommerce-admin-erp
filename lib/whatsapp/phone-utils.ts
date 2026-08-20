/**
 * Normalizes phone numbers to standard E.164 without leading plus for Meta WhatsApp Cloud API.
 * e.g. "+1 (555) 234-5678" -> "15552345678"
 * e.g. "+880 1712-345678" -> "8801712345678"
 */
export function normalizeWhatsAppPhone(rawPhone: string): {
  isValid: boolean;
  normalized: string;
  formatted: string;
  error?: string;
} {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      normalized: "",
      formatted: "",
      error: "Phone number is empty.",
    };
  }

  // Strip all non-digit characters except leading plus
  let cleaned = rawPhone.trim();

  // If starts with 00, replace with international prefix
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.substring(2);
  }

  // Extract all pure digits
  let digitsOnly = cleaned.replace(/\D/g, "");

  // Auto-format local Bangladeshi numbers (e.g. 01712345678, 01610857553 -> 8801610857553)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("01")) {
    digitsOnly = `88${digitsOnly}`;
  } else if (digitsOnly.length === 10 && digitsOnly.startsWith("1")) {
    digitsOnly = `880${digitsOnly}`;
  }

  if (digitsOnly.length < 8) {
    return {
      isValid: false,
      normalized: digitsOnly,
      formatted: rawPhone,
      error: "Phone number is too short (minimum 8 digits required including country code).",
    };
  }

  if (digitsOnly.length > 15) {
    return {
      isValid: false,
      normalized: digitsOnly,
      formatted: rawPhone,
      error: "Phone number is too long (maximum 15 digits allowed by E.164 standard).",
    };
  }

  return {
    isValid: true,
    normalized: digitsOnly,
    formatted: `+${digitsOnly}`,
  };
}
