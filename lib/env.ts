/**
 * Environment configuration helper for Headless WooCommerce ERP.
 *
 * Enforces strict separation between server-only privileged credentials
 * and public client-safe configurations.
 */

const DEFAULT_VAPID_PUBLIC_KEY = "BH-90OzQAof2VRvv4oTMGK1LHapE2XJjABQkTBLjoILYwWtw-wAMcJNg5NuNr1vvYlTgBCjOhaQ06sFB0AsCEmo";
const DEFAULT_VAPID_PRIVATE_KEY = "-3HSMVi5tOkJzcMnDXaa1ZdHg4qv2HeeJbMyOyjRbmU";
const DEFAULT_VAPID_SUBJECT = "mailto:itsemranraj@gmail.com";

export interface PublicEnv {
  appName: string;
  appUrl: string;
  storeUrl: string;
  vapidPublicKey: string;
}

export interface ServerEnv extends PublicEnv {
  wooCommerce: {
    apiUrl?: string;
    consumerKey?: string;
    consumerSecret?: string;
    webhookSecret?: string;
  };
  auth: {
    secret?: string;
    url?: string;
    adminUsername?: string;
    adminPassword?: string;
  };
  vapid: {
    publicKey: string;
    privateKey: string;
    subject: string;
  };
}

/**
 * Returns public environment variables safe to use in both Client and Server components.
 */
export function getPublicEnv(): PublicEnv {
  return {
    appName: process.env.NEXT_PUBLIC_APP_NAME || "Headless WooCommerce ERP",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://demo-erp.itsemranraj.com",
    storeUrl: process.env.NEXT_PUBLIC_STORE_URL || "https://itsemranraj.com/sss",
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
  };
}

/**
 * Returns server-only environment variables containing privileged secrets.
 * Must NEVER be called inside client-side components.
 */
export function getServerEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY ERROR: getServerEnv() was invoked in a client-side environment. Server secrets must never be exposed to the browser."
    );
  }

  const publicEnv = getPublicEnv();

  return {
    ...publicEnv,
    wooCommerce: {
      apiUrl: process.env.WOOCOMMERCE_API_URL || "https://itsemranraj.com/sss/wp-json/wc/v3",
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY || "ck_81feadcfea9035a0e43ece826b0b973a0f75dbfe",
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET || "cs_6ad11d2d510d554139f7e757cf4ae98dcf8b3b5f",
      webhookSecret: process.env.WOOCOMMERCE_WEBHOOK_SECRET || "eb037def126b57f94dfbe6e266e0b25269dc58d52c75833ae99bd670adf14b1f",
    },
    auth: {
      secret: process.env.AUTH_SECRET || "6ef6daf8f2b509d161b7ad9d5adeef65552cd40f6459e270d7f0319893afa824",
      url: process.env.AUTH_URL || "https://demo-erp.itsemranraj.com",
      adminUsername: process.env.ADMIN_USERNAME || "admin",
      adminPassword: process.env.ADMIN_PASSWORD || "admin12345",
    },
    vapid: {
      publicKey: process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY,
      subject: process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT,
    },
  };
}
