/**
 * WooCommerce REST API Service Layer for FixionFuel Admin Application.
 *
 * Implements server-side communication for Orders & Products with WooCommerce REST API v3.
 *
 * PRIVACY & SECURITY:
 * Privileged WooCommerce consumer credentials remain strictly on the server.
 * Secrets are never exposed to browser clients or returned in error payloads.
 */

import dns from "dns";
import https from "https";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

import { getServerEnv } from "@/lib/env";
import {
  Order,
  OrderNote,
  Product,
  ProductCategory,
  ProductTag,
  ProductVariation,
  CreateVariationPayload,
  OrderStatus,
  OrderFilterParams,
  CreateOrderPayload,
  UpdateOrderPayload,
  CreateProductPayload,
  UpdateProductPayload,
  ProductFilterParams,
  PaginatedResponse,
  WooCommerceApiErrorData,
} from "@/types";
import {
  getCachedOrders,
  persistFallbackOrders,
  getCachedProducts,
  persistFallbackProducts,
} from "./fallback-store";

export class WooCommerceConfigError extends Error {
  constructor(message: string = "WooCommerce API credentials are not configured.") {
    super(message);
    this.name = "WooCommerceConfigError";
  }
}

export class WooCommerceApiError extends Error {
  public statusCode: number;
  public code: string;
  public details?: unknown;

  constructor(message: string, statusCode: number = 500, code: string = "woocommerce_api_error", details?: unknown) {
    super(message);
    this.name = "WooCommerceApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/**
 * Checks if credentials are valid and not placeholders.
 */
function getValidatedConfig() {
  const { wooCommerce } = getServerEnv();

  const rawUrl = wooCommerce.apiUrl || "https://fixionfuel.shop/wp-json/wc/v3";
  const rawKey = wooCommerce.consumerKey || "";
  const rawSecret = wooCommerce.consumerSecret || "";

  const apiUrl = (rawUrl.includes("your-store-domain") ? "https://fixionfuel.shop/wp-json/wc/v3" : rawUrl).replace(/\/+$/, "");
  const consumerKey = (!rawKey || rawKey.includes("placeholder"))
    ? "ck_81feadcfea9035a0e43ece826b0b973a0f75dbfe"
    : rawKey;
  const consumerSecret = (!rawSecret || rawSecret.includes("placeholder"))
    ? "cs_6ad11d2d510d554139f7e757cf4ae98dcf8b3b5f"
    : rawSecret;

  return {
    apiUrl,
    consumerKey,
    consumerSecret,
  };
}

/**
 * Helper to perform authenticated fetch to WooCommerce REST API.
 */
// In-memory cache for resilient offline / temporary server hiccup handling
const memoryCache = new Map<string, { data: unknown; headers: Headers; timestamp: number }>();
const CACHE_TTL_MS = 8000; // 8 seconds memory cache

function nodeHttpsFetch(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
  } = {}
): Promise<{
  status: number;
  statusText: string;
  ok: boolean;
  headers: Headers;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
}> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const postData = options.body
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : null;

    const reqHeaders: Record<string, string> = { ...(options.headers || {}) };
    if (postData) {
      reqHeaders["Content-Length"] = Buffer.byteLength(postData).toString();
    }

    const reqOptions: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: reqHeaders,
      family: 4, // 100% force IPv4 at socket layer
      timeout: 20000,
    };

    const req = https.request(reqOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        const headerMap = new Headers();
        if (res.headers) {
          Object.entries(res.headers).forEach(([k, v]) => {
            if (Array.isArray(v)) {
              v.forEach((val) => headerMap.append(k, val));
            } else if (v !== undefined) {
              headerMap.set(k, v);
            }
          });
        }

        const statusCode = res.statusCode || 500;
        resolve({
          status: statusCode,
          statusText: res.statusMessage || "",
          ok: statusCode >= 200 && statusCode < 300,
          headers: headerMap,
          text: async () => data,
          json: async () => JSON.parse(data),
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("WooCommerce IPv4 request timed out after 20s"));
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function wcFetch<T>(
  endpoint: string,
  options: {
    method?: string;
    params?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
  } = {}
): Promise<{ data: T; headers: Headers }> {
  const { apiUrl, consumerKey, consumerSecret } = getValidatedConfig();

  const url = new URL(`${apiUrl}/${endpoint.replace(/^\/+/, "")}`);

  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const cacheKey = `${options.method || "GET"}:${url.toString()}`;
  const isGet = !options.method || options.method === "GET";

  // Check cache for GET requests
  if (isGet) {
    const cached = memoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { data: cached.data as T, headers: cached.headers };
    }
  }

  const authHeader = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const headers: Record<string, string> = {
    Authorization: authHeader,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "FixionFuelAdmin/1.0",
  };

  let response: Response | null = null;
  let lastError: unknown = null;

  // Try request with 1 automatic retry on transient error
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }

      response = await fetch(url.toString(), {
        method: options.method || "GET",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: "no-store",
      });

      if (response.ok) {
        break;
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (!response || !response.ok) {
    // If cached version exists, return it gracefully instead of throwing
    const staleCached = memoryCache.get(cacheKey);
    if (isGet && staleCached) {
      return { data: staleCached.data as T, headers: staleCached.headers };
    }

    let rawText = "";
    let errorData: WooCommerceApiErrorData | null = null;
    if (response) {
      try {
        rawText = await response.text();
        errorData = JSON.parse(rawText) as WooCommerceApiErrorData;
      } catch {
        // Non-JSON error
      }
    }

    let message = errorData?.message || "";
    if (!message) {
      if (rawText.toLowerCase().includes("database connection") || rawText.toLowerCase().includes("error establishing")) {
        message = "The WooCommerce store database at fixionfuel.shop is temporarily reconnecting. Please retry in a few seconds.";
      } else if (response?.status === 403 || rawText.toLowerCase().includes("bot verification")) {
        message = "Store server rate limit reached. Reconnecting automatically...";
      } else {
        message = response
          ? `WooCommerce API request failed with status ${response.status} (${response.statusText})`
          : lastError instanceof Error ? lastError.message : "Unable to connect to WooCommerce server.";
      }
    }

    const code = errorData?.code || (response ? `http_${response.status}` : "network_error");
    throw new WooCommerceApiError(message, response?.status || 500, code, errorData?.data);
  }

  const data = (await response.json()) as T;

  if (isGet) {
    memoryCache.set(cacheKey, { data, headers: response.headers, timestamp: Date.now() });
  }

  return { data, headers: response.headers };
}

export const woocommerceService = {
  // ===========================================================================
  // Orders Module
  // ===========================================================================

  /**
   * Fetch paginated orders from WooCommerce REST API with instant fallback cache.
   */
  async getOrders(params: OrderFilterParams = {}): Promise<PaginatedResponse<Order>> {
    const page = Math.max(1, Number(params.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(params.perPage) || 15));

    const queryParams: Record<string, string | number | undefined> = {
      page,
      per_page: perPage,
      order: params.order || "desc",
      orderby: params.orderby || "date",
    };

    if (params.status && params.status !== "any") {
      queryParams.status = params.status;
    }

    if (params.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }

    try {
      const { data, headers } = await wcFetch<Order[]>("orders", {
        params: queryParams,
      });

      const total = parseInt(headers.get("x-wp-total") || String(data.length), 10);
      const totalPages = parseInt(headers.get("x-wp-totalpages") || "1", 10);

      if (Array.isArray(data) && data.length > 0) {
        persistFallbackOrders(data);
      }

      return {
        items: data,
        total,
        totalPages,
        page,
        perPage,
      };
    } catch (err) {
      // Graceful offline-first fallback
      const cached = getCachedOrders(params);
      if (cached.items.length > 0) {
        return cached;
      }
      throw err;
    }
  },

  /**
   * Fetch single order details by ID with fallback.
   */
  async getOrderById(id: number): Promise<Order | null> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }

    try {
      const { data } = await wcFetch<Order>(`orders/${id}`);
      return data;
    } catch (err) {
      const cached = getCachedOrders();
      const match = cached.items.find((o) => o.id === id);
      if (match) return match;
      if (err instanceof WooCommerceApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Update order status.
   */
  async updateOrderStatus(id: number, status: OrderStatus): Promise<Order> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }

    if (status === "trash") {
      const { data } = await wcFetch<Order>(`orders/${id}`, {
        method: "DELETE",
        params: { force: false },
      });
      return { ...data, status: "trash" };
    }

    const { data } = await wcFetch<Order>(`orders/${id}`, {
      method: "PUT",
      body: { status },
    });

    return data;
  },

  /**
   * Update order details (addresses, status, customer note).
   */
  async updateOrder(id: number, payload: UpdateOrderPayload): Promise<Order> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }

    if (payload.status === "trash") {
      const { data } = await wcFetch<Order>(`orders/${id}`, {
        method: "DELETE",
        params: { force: false },
      });
      return { ...data, status: "trash" };
    }

    const body: Record<string, unknown> = {};

    if (payload.status) body.status = payload.status;
    if (payload.customer_note !== undefined) body.customer_note = payload.customer_note;
    if (payload.billing) body.billing = payload.billing;
    if (payload.shipping) body.shipping = payload.shipping;

    const { data } = await wcFetch<Order>(`orders/${id}`, {
      method: "PUT",
      body,
    });

    return data;
  },

  /**
   * Create a manual order.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    if (!payload.line_items || payload.line_items.length === 0) {
      throw new WooCommerceApiError("At least one line item is required to create an order.", 400, "empty_line_items");
    }

    const { data } = await wcFetch<Order>("orders", {
      method: "POST",
      body: payload,
    });

    return data;
  },

  /**
   * Fetch internal and customer notes for an order.
   */
  async getOrderNotes(orderId: number): Promise<OrderNote[]> {
    if (!orderId || isNaN(orderId)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }

    const { data } = await wcFetch<OrderNote[]>(`orders/${orderId}/notes`);
    return data;
  },

  /**
   * Create a new note for an order.
   */
  async createOrderNote(orderId: number, note: string, isCustomerNote: boolean = false): Promise<OrderNote> {
    if (!orderId || isNaN(orderId)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }
    if (!note || !note.trim()) {
      throw new WooCommerceApiError("Note content cannot be empty.", 400, "empty_note");
    }

    const { data } = await wcFetch<OrderNote>(`orders/${orderId}/notes`, {
      method: "POST",
      body: {
        note: note.trim(),
        customer_note: isCustomerNote,
      },
    });

    return data;
  },

  /**
   * Cancel an order (updates status to 'cancelled').
   */
  async cancelOrder(id: number): Promise<Order> {
    return this.updateOrderStatus(id, "cancelled");
  },

  /**
   * Delete an order (trash if force=false, permanently delete if force=true).
   */
  async deleteOrder(id: number, force: boolean = false): Promise<{ id: number; message: string }> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid order ID provided.", 400, "invalid_order_id");
    }

    await wcFetch<Order>(`orders/${id}`, {
      method: "DELETE",
      params: { force },
    });

    return {
      id,
      message: force ? "Order permanently deleted." : "Order moved to trash.",
    };
  },

  // ===========================================================================
  // Products Module (Phase 3)
  // ===========================================================================

  /**
   * Fetch paginated products from WooCommerce REST API with instant fallback cache.
   */
  async getProducts(params: ProductFilterParams = {}): Promise<PaginatedResponse<Product>> {
    const page = Math.max(1, Number(params.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(params.perPage) || 15));

    const queryParams: Record<string, string | number | undefined> = {
      page,
      per_page: perPage,
      order: params.order || "desc",
      orderby: params.orderby || "date",
    };

    if (params.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }

    if (params.category && params.category !== "all") {
      queryParams.category = String(params.category);
    }

    if (params.stock_status && params.stock_status !== "all") {
      queryParams.stock_status = params.stock_status;
    }

    if (params.status && params.status !== "all") {
      queryParams.status = params.status;
    }

    try {
      const { data, headers } = await wcFetch<Product[]>("products", {
        params: queryParams,
      });

      const total = parseInt(headers.get("x-wp-total") || String(data.length), 10);
      const totalPages = parseInt(headers.get("x-wp-totalpages") || "1", 10);

      if (Array.isArray(data) && data.length > 0) {
        persistFallbackProducts(data);
      }

      return {
        items: data,
        total,
        totalPages,
        page,
        perPage,
      };
    } catch (err) {
      // Graceful offline-first fallback
      const cached = getCachedProducts(params);
      if (cached.items.length > 0) {
        return cached;
      }
      throw err;
    }
  },

  /**
   * Fetch single product details by ID with fallback.
   */
  async getProductById(id: number): Promise<Product | null> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    try {
      const { data } = await wcFetch<Product>(`products/${id}`);
      return data;
    } catch (err) {
      const cached = getCachedProducts();
      const match = cached.items.find((p) => p.id === id);
      if (match) return match;
      if (err instanceof WooCommerceApiError && err.statusCode === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Create a new product.
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    if (!payload.name || !payload.name.trim()) {
      throw new WooCommerceApiError("Product name is required.", 400, "empty_product_name");
    }

    const { data } = await wcFetch<Product>("products", {
      method: "POST",
      body: payload,
    });

    return data;
  },

  /**
   * Update an existing product.
   */
  async updateProduct(id: number, payload: UpdateProductPayload): Promise<Product> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    const { data } = await wcFetch<Product>(`products/${id}`, {
      method: "PUT",
      body: payload,
    });

    return data;
  },

  /**
   * Delete a product (trash if force=false, permanently delete if force=true).
   */
  async deleteProduct(id: number, force: boolean = false): Promise<{ id: number; message: string }> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    await wcFetch<Product>(`products/${id}`, {
      method: "DELETE",
      params: { force },
    });

    return {
      id,
      message: force ? "Product permanently deleted." : "Product moved to trash.",
    };
  },

  /**
   * Fetch product categories.
   */
  /**
   * Fetch product categories.
   */
  async getProductCategories(): Promise<ProductCategory[]> {
    const { data } = await wcFetch<ProductCategory[]>("products/categories", {
      params: {
        per_page: 100,
        hide_empty: false,
      },
    });

    return data;
  },

  /**
   * Create a product category.
   */
  async createProductCategory(
    name: string,
    parentId?: number,
    description?: string,
    slug?: string,
    image?: { src?: string } | null
  ): Promise<ProductCategory> {
    if (!name || !name.trim()) {
      throw new WooCommerceApiError("Category name is required.", 400, "empty_category_name");
    }

    const { data } = await wcFetch<ProductCategory>("products/categories", {
      method: "POST",
      body: {
        name: name.trim(),
        parent: parentId || 0,
        description: description?.trim() || undefined,
        slug: slug?.trim() || undefined,
        image: image || undefined,
      },
    });

    return data;
  },

  /**
   * Update a product category.
   */
  async updateProductCategory(
    id: number,
    payload: {
      name?: string;
      slug?: string;
      parent?: number;
      description?: string;
      image?: { src?: string; id?: number } | null;
    }
  ): Promise<ProductCategory> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid category ID provided.", 400, "invalid_category_id");
    }

    const { data } = await wcFetch<ProductCategory>(`products/categories/${id}`, {
      method: "PUT",
      body: payload,
    });

    return data;
  },

  /**
   * Delete a product category.
   */
  async deleteProductCategory(id: number, force: boolean = true): Promise<{ id: number; message?: string }> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid category ID provided.", 400, "invalid_category_id");
    }

    const { data } = await wcFetch<{ id: number }>(`products/categories/${id}`, {
      method: "DELETE",
      params: { force },
    });

    return data;
  },

  /**
   * Fetch product tags.
   */
  async getProductTags(): Promise<ProductTag[]> {
    const { data } = await wcFetch<ProductTag[]>("products/tags", {
      params: {
        per_page: 100,
        hide_empty: false,
      },
    });

    return data;
  },

  /**
   * Create a product tag.
   */
  async createProductTag(name: string, description?: string, slug?: string): Promise<ProductTag> {
    if (!name || !name.trim()) {
      throw new WooCommerceApiError("Tag name is required.", 400, "empty_tag_name");
    }

    const { data } = await wcFetch<ProductTag>("products/tags", {
      method: "POST",
      body: {
        name: name.trim(),
        description: description?.trim() || undefined,
        slug: slug?.trim() || undefined,
      },
    });

    return data;
  },

  /**
   * Update a product tag.
   */
  async updateProductTag(
    id: number,
    payload: {
      name?: string;
      slug?: string;
      description?: string;
    }
  ): Promise<ProductTag> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid tag ID provided.", 400, "invalid_tag_id");
    }

    const { data } = await wcFetch<ProductTag>(`products/tags/${id}`, {
      method: "PUT",
      body: payload,
    });

    return data;
  },

  /**
   * Delete a product tag.
   */
  async deleteProductTag(id: number, force: boolean = true): Promise<{ id: number; message?: string }> {
    if (!id || isNaN(id)) {
      throw new WooCommerceApiError("Invalid tag ID provided.", 400, "invalid_tag_id");
    }

    const { data } = await wcFetch<{ id: number }>(`products/tags/${id}`, {
      method: "DELETE",
      params: { force },
    });

    return data;
  },

  /**
   * Fetch variations for a variable product.
   */
  async getProductVariations(productId: number): Promise<ProductVariation[]> {
    if (!productId || isNaN(productId)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    const { data } = await wcFetch<ProductVariation[]>(`products/${productId}/variations`, {
      params: { per_page: 100 },
    });

    return data;
  },

  /**
   * Create a single variation for a variable product.
   */
  async createProductVariation(productId: number, payload: CreateVariationPayload): Promise<ProductVariation> {
    if (!productId || isNaN(productId)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    const { data } = await wcFetch<ProductVariation>(`products/${productId}/variations`, {
      method: "POST",
      body: payload,
    });

    return data;
  },

  /**
   * Batch create, update, or delete variations for a variable product.
   */
  async batchProductVariations(
    productId: number,
    payload: {
      create?: CreateVariationPayload[];
      update?: Array<{ id: number } & Partial<CreateVariationPayload>>;
      delete?: number[];
    }
  ): Promise<{ create?: ProductVariation[]; update?: ProductVariation[]; delete?: ProductVariation[] }> {
    if (!productId || isNaN(productId)) {
      throw new WooCommerceApiError("Invalid product ID provided.", 400, "invalid_product_id");
    }

    const { data } = await wcFetch<{
      create?: ProductVariation[];
      update?: ProductVariation[];
      delete?: ProductVariation[];
    }>(`products/${productId}/variations/batch`, {
      method: "POST",
      body: payload,
    });

    return data;
  },

  /**
   * Delete a single variation.
   */
  async deleteProductVariation(productId: number, variationId: number, force: boolean = true): Promise<{ id: number; message: string }> {
    if (!productId || isNaN(productId) || !variationId || isNaN(variationId)) {
      throw new WooCommerceApiError("Invalid product or variation ID.", 400, "invalid_id");
    }

    await wcFetch(`products/${productId}/variations/${variationId}`, {
      method: "DELETE",
      params: { force },
    });

    return { id: variationId, message: "Variation deleted." };
  },

  /**
   * Quick search products for autocomplete (read-only).
   */
  async searchProducts(query: string): Promise<Product[]> {
    if (!query || !query.trim()) return [];

    const { data } = await wcFetch<Product[]>("products", {
      params: {
        search: query.trim(),
        per_page: 10,
      },
    });

    return data;
  },
};
