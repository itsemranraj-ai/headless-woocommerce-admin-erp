/**
 * Core type exports for Headless WooCommerce ERP.
 */

export * from "./woocommerce";
export * from "./pwa";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  totalPages: number;
  page: number;
  perPage: number;
}

export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  badge?: string;
}
