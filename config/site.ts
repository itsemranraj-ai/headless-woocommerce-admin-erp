/**
 * Site configuration and metadata constants.
 */

export const siteConfig = {
  name: "FixionFuel Order Management",
  shortName: "FixionFuel",
  description:
    "Real-time order & product management PWA for FixionFuel WooCommerce store.",
  appDomain: "admin.fixionfuel.shop",
  storeDomain: "fixionfuel.shop",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://admin.fixionfuel.shop",
  storeUrl: process.env.NEXT_PUBLIC_STORE_URL || "https://fixionfuel.shop",
  version: "0.1.0-foundation",
  themeColor: "#0f172a",
  backgroundColor: "#020617",
  links: {
    store: "https://fixionfuel.shop",
    admin: "https://admin.fixionfuel.shop",
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
