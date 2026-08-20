/**
 * General utility functions for FixionFuel Order Management.
 */

/**
 * Combines class names cleanly, filtering out falsy values.
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Formats a currency amount (USD default).
 */
export function formatCurrency(
  amount: number | string,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) return "$0.00";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `$${numericAmount.toFixed(2)}`;
  }
}

/**
 * Formats ISO date string into readable local format.
 */
export function formatDate(
  dateString: string | Date,
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = typeof dateString === "string" ? new Date(dateString) : dateString;
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...options,
    }).format(date);
  } catch {
    return String(dateString);
  }
}

/**
 * Formats user/staff display name nicely, stripping emails and formatting clean username/name.
 */
export function formatDisplayName(name?: string, username?: string): string {
  let val = (name || username || "").trim();
  if (!val) return "Sales Representative";

  // If it is an email address, extract clean username part before @
  if (val.includes("@")) {
    val = val.split("@")[0].trim();
  }

  // Replace separators like underscores/dots/hyphens with spaces
  val = val.replace(/[._-]+/g, " ").trim();

  // If entirely lowercase or uppercase, convert to Title Case
  if (val === val.toLowerCase() || val === val.toUpperCase()) {
    val = val
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return val || "Sales Representative";
}
