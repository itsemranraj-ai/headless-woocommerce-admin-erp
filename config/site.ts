/**
 * Site configuration and metadata constants.
 */

export const siteConfig = {
  name: "Headless WooCommerce ERP",
  shortName: "Store ERP",
  description:
    "Real-time order & product management PWA for Store ERP WooCommerce store.",
  appDomain: "demo-erp.itsemranraj.com",
  storeDomain: "itsemranraj.com/sss",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://demo-erp.itsemranraj.com",
  storeUrl: process.env.NEXT_PUBLIC_STORE_URL || "https://itsemranraj.com/sss",
  version: "0.1.0-foundation",
  themeColor: "#0f172a",
  backgroundColor: "#020617",
  links: {
    store: "https://itsemranraj.com/sss",
    admin: "https://demo-erp.itsemranraj.com",
  },
  navigation: [
    {
      title: "Dashboard",
      href: "/",
      status: "foundation",
    },
    {
      title: "Orders",
      href: "/orders",
      status: "phase-2",
    },
    {
      title: "Products",
      href: "/products",
      status: "phase-3",
    },
    {
      title: "Notifications",
      href: "/notifications",
      status: "phase-4",
    },
    {
      title: "Settings",
      href: "/settings",
      status: "phase-5",
    },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
