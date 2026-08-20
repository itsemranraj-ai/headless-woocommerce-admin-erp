/**
 * TypeScript definitions for WooCommerce API schemas & Order/Product Management.
 *
 * All types strictly align with WooCommerce REST API v3 specifications.
 */

export type OrderStatus =
  | "pending"
  | "processing"
  | "on-hold"
  | "completed"
  | "cancelled"
  | "refunded"
  | "failed"
  | "trash";

export type OrderFilterStatus = OrderStatus | "any";

export interface Address {
  first_name: string;
  last_name: string;
  company?: string;
  address_1: string;
  address_2?: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email?: string;
  phone?: string;
}

export interface LineItem {
  id: number;
  name: string;
  product_id: number;
  variation_id: number;
  quantity: number;
  tax_class: string;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  sku?: string;
  price: number;
  image?: {
    id: number;
    src: string;
  };
}

export interface OrderFeeLine {
  id: number;
  name: string;
  total: string;
  total_tax: string;
}

export interface OrderShippingLine {
  id: number;
  method_title: string;
  method_id: string;
  total: string;
  total_tax: string;
}

export interface Order {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: OrderStatus;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address?: string;
  customer_user_agent?: string;
  customer_note?: string;
  billing: Address;
  shipping: Address;
  payment_method: string;
  payment_method_title: string;
  transaction_id?: string;
  date_paid?: string;
  date_paid_gmt?: string;
  date_completed?: string;
  date_completed_gmt?: string;
  line_items: LineItem[];
  fee_lines?: OrderFeeLine[];
  shipping_lines?: OrderShippingLine[];
  meta_data?: Array<{ id?: number; key: string; value: any }>;
}

export interface OrderNote {
  id: number;
  author: string;
  date_created: string;
  date_created_gmt: string;
  note: string;
  customer_note: boolean;
  added_by_user?: boolean;
}

export interface CreateOrderPayload {
  status?: OrderStatus;
  customer_note?: string;
  billing: Partial<Address>;
  shipping: Partial<Address>;
  line_items: Array<{
    product_id?: number;
    variation_id?: number;
    name?: string;
    quantity: number;
    price?: string | number;
    total?: string;
  }>;
  payment_method?: string;
  payment_method_title?: string;
  set_paid?: boolean;
  meta_data?: Array<{ key: string; value: any }>;
}

export interface UpdateOrderPayload {
  status?: OrderStatus;
  customer_note?: string;
  billing?: Partial<Address>;
  shipping?: Partial<Address>;
}

export interface OrderFilterParams {
  page?: number;
  perPage?: number;
  status?: OrderStatus | string;
  search?: string;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "include" | "title" | "slug";
}

// -------------------------------------------------------------
// Product Engine Types
// -------------------------------------------------------------

export interface ProductImage {
  id?: number;
  date_created?: string;
  src: string;
  name?: string;
  alt?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
  parent?: number;
  description?: string;
  display?: string;
  image?: { id?: number; src: string; name?: string; alt?: string } | null;
  menu_order?: number;
  count?: number;
}

export interface ProductTag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  count?: number;
}

export interface ProductDimensions {
  length: string;
  width: string;
  height: string;
}

export interface ProductDownload {
  id?: string;
  name: string;
  file: string;
}

export interface ProductAttribute {
  id?: number;
  name: string;
  position?: number;
  visible?: boolean;
  variation?: boolean;
  options: string[];
}

export interface ProductVariationAttribute {
  id?: number;
  name: string;
  option: string;
}

export interface ProductVariation {
  id: number;
  date_created?: string;
  date_modified?: string;
  description?: string;
  permalink?: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  status?: "publish" | "private";
  purchasable: boolean;
  virtual: boolean;
  downloadable: boolean;
  downloads?: ProductDownload[];
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders?: "no" | "notify" | "yes";
  weight?: string;
  dimensions?: ProductDimensions;
  shipping_class?: string;
  image?: ProductImage | null;
  attributes: ProductVariationAttribute[];
}

export type ProductStatus = "draft" | "pending" | "private" | "publish";
export type ProductType = "simple" | "grouped" | "external" | "variable";
export type StockStatus = "instock" | "outofstock" | "onbackorder";
export type TaxStatus = "taxable" | "shipping" | "none";

export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: ProductType;
  status: ProductStatus;
  featured: boolean;
  catalog_visibility: "visible" | "catalog" | "search" | "hidden";
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from?: string | null;
  date_on_sale_to?: string | null;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads?: ProductDownload[];
  download_limit?: number;
  download_expiry?: number;
  external_url?: string;
  button_text?: string;
  tax_status?: TaxStatus;
  tax_class?: string;
  manage_stock: boolean;
  stock_quantity: number | null;
  stock_status: StockStatus;
  backorders?: "no" | "notify" | "yes";
  low_stock_amount?: number | null;
  sold_individually?: boolean;
  weight?: string;
  dimensions?: ProductDimensions;
  shipping_class?: string;
  reviews_allowed?: boolean;
  upsell_ids?: number[];
  cross_sell_ids?: number[];
  parent_id?: number;
  grouped_products?: number[];
  purchase_note?: string;
  categories: ProductCategory[];
  tags?: ProductTag[];
  images: ProductImage[];
  attributes?: ProductAttribute[];
  default_attributes?: ProductVariationAttribute[];
  variations?: number[];
  menu_order?: number;
}

export interface CreateVariationPayload {
  description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  virtual?: boolean;
  downloadable?: boolean;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: StockStatus;
  weight?: string;
  dimensions?: ProductDimensions;
  image?: { src: string };
  attributes: ProductVariationAttribute[];
}

export interface CreateProductPayload {
  name: string;
  type?: ProductType;
  status?: ProductStatus;
  featured?: boolean;
  catalog_visibility?: "visible" | "catalog" | "search" | "hidden";
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  date_on_sale_from?: string | null;
  date_on_sale_to?: string | null;
  virtual?: boolean;
  downloadable?: boolean;
  downloads?: ProductDownload[];
  external_url?: string;
  button_text?: string;
  tax_status?: TaxStatus;
  tax_class?: string;
  manage_stock?: boolean;
  stock_quantity?: number | null;
  stock_status?: StockStatus;
  backorders?: "no" | "notify" | "yes";
  low_stock_amount?: number | null;
  sold_individually?: boolean;
  weight?: string;
  dimensions?: ProductDimensions;
  shipping_class?: string;
  reviews_allowed?: boolean;
  upsell_ids?: number[];
  cross_sell_ids?: number[];
  grouped_products?: number[];
  purchase_note?: string;
  menu_order?: number;
  categories?: Array<{ id: number }>;
  tags?: Array<{ id?: number; name?: string }>;
  images?: Array<{ src: string }>;
  attributes?: ProductAttribute[];
  default_attributes?: ProductVariationAttribute[];
  variations_data?: CreateVariationPayload[];
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  id?: number;
}

export interface ProductFilterParams {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string | number;
  stock_status?: StockStatus | string;
  status?: ProductStatus | string;
  type?: ProductType | string;
  order?: "asc" | "desc";
  orderby?: "date" | "id" | "title" | "slug" | "price" | "popularity";
}

export interface WooCommerceApiErrorData {
  code: string;
  message: string;
  data?: {
    status?: number;
    params?: Record<string, string>;
    details?: unknown;
  };
}
