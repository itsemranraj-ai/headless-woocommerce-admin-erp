import { Order, Product } from "@/types";
import fs from "fs";
import path from "path";
import os from "os";

const ORDERS_CACHE_FILE = path.join(os.tmpdir(), "ff_orders_fallback_cache.json");
const PRODUCTS_CACHE_FILE = path.join(os.tmpdir(), "ff_products_fallback_cache.json");

// Default initial live store data for zero-downtime resilience
export const INITIAL_FALLBACK_PRODUCTS = [
  {
    id: 2297,
    name: "KISSPEPTIN 10MG",
    slug: "kisspeptin-10mg",
    permalink: "https://itsemranraj.com/sss/product/kisspeptin-10mg/",
    date_created: "2026-08-10T12:00:00",
    date_modified: "2026-08-15T12:00:00",
    type: "variable",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "<p>Kisspeptin is a synthetic research peptide utilized in laboratory environments for analytical research applications.</p>",
    short_description: "<p>High purity research peptide for laboratory analysis.</p>",
    sku: "FF-KISS-10",
    price: "42.00",
    regular_price: "42.00",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 12,
    virtual: false,
    downloadable: false,
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    categories: [{ id: 15, name: "Peptides", slug: "peptides" }],
    tags: [],
    images: [
      {
        id: 2298,
        src: "https://itsemranraj.com/sss/wp-content/uploads/2026/08/kisspeptin.png",
        name: "Kisspeptin 10mg",
        alt: "Kisspeptin 10mg Vial",
      },
    ],
    attributes: [
      {
        id: 1,
        name: "Size",
        position: 0,
        visible: true,
        variation: true,
        options: ["Single (1 Vial)", "1/2 Kit (5 Vials)", "Full Kit (10 Vials)"],
      },
    ],
    variations: [2299, 2300, 2301],
  },
  {
    id: 2280,
    name: "BPC-157 10MG",
    slug: "bpc-157-10mg",
    permalink: "https://itsemranraj.com/sss/product/bpc-157-10mg/",
    date_created: "2026-08-10T12:00:00",
    date_modified: "2026-08-15T12:00:00",
    type: "variable",
    status: "publish",
    featured: true,
    catalog_visibility: "visible",
    description: "<p>Body Protection Compound-157 research peptide.</p>",
    short_description: "<p>Research grade lyophilized peptide.</p>",
    sku: "FF-BPC-10",
    price: "45.00",
    regular_price: "45.00",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 48,
    virtual: false,
    downloadable: false,
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    categories: [{ id: 15, name: "Peptides", slug: "peptides" }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
  },
  {
    id: 2285,
    name: "TB-500 10MG",
    slug: "tb-500-10mg",
    permalink: "https://itsemranraj.com/sss/product/tb-500-10mg/",
    date_created: "2026-08-10T12:00:00",
    date_modified: "2026-08-15T12:00:00",
    type: "variable",
    status: "publish",
    featured: false,
    catalog_visibility: "visible",
    description: "<p>Thymosin Beta-4 synthetic research peptide fragment.</p>",
    short_description: "<p>Laboratory research grade peptide.</p>",
    sku: "FF-TB-10",
    price: "48.00",
    regular_price: "48.00",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 32,
    virtual: false,
    downloadable: false,
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    categories: [{ id: 15, name: "Peptides", slug: "peptides" }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
  },
  {
    id: 2290,
    name: "SEMAGLUTIDE 5MG",
    slug: "semaglutide-5mg",
    permalink: "https://itsemranraj.com/sss/product/semaglutide-5mg/",
    date_created: "2026-08-10T12:00:00",
    date_modified: "2026-08-15T12:00:00",
    type: "variable",
    status: "publish",
    featured: true,
    catalog_visibility: "visible",
    description: "<p>GLP-1 receptor agonist research peptide.</p>",
    short_description: "<p>High purity research grade peptide.</p>",
    sku: "FF-SEMA-5",
    price: "75.00",
    regular_price: "75.00",
    sale_price: "",
    on_sale: false,
    purchasable: true,
    total_sales: 64,
    virtual: false,
    downloadable: false,
    manage_stock: false,
    stock_quantity: null,
    stock_status: "instock",
    categories: [{ id: 15, name: "Peptides", slug: "peptides" }],
    tags: [],
    images: [],
    attributes: [],
    variations: [],
  },
];

export const INITIAL_FALLBACK_ORDERS = [
  {
    id: 2443,
    number: "2443",
    status: "on-hold",
    currency: "USD",
    date_created: "2026-08-15T10:15:00",
    date_modified: "2026-08-15T10:15:00",
    discount_total: "0.00",
    shipping_total: "15.00",
    total: "290.00",
    total_tax: "0.00",
    prices_include_tax: false,
    payment_method: "zelle",
    payment_method_title: "Zelle Transfer",
    customer_id: 0,
    customer_ip_address: "",
    customer_user_agent: "",
    customer_note: "Sales order taken by Field Agent.",
    billing: {
      first_name: "John",
      last_name: "Doe",
      company: "",
      address_1: "742 Evergreen Terrace",
      address_2: "",
      city: "Springfield",
      state: "OR",
      postcode: "97477",
      country: "US",
      email: "johndoe@example.com",
      phone: "+1 (555) 019-2834",
    },
    shipping: {
      first_name: "John",
      last_name: "Doe",
      company: "",
      address_1: "742 Evergreen Terrace",
      address_2: "",
      city: "Springfield",
      state: "OR",
      postcode: "97477",
      country: "US",
      phone: "+1 (555) 019-2834",
    },
    line_items: [
      {
        id: 101,
        name: "KISSPEPTIN 10MG - Full Kit (10 Vials)",
        product_id: 2297,
        variation_id: 2299,
        quantity: 1,
        tax_class: "",
        subtotal: "275.00",
        subtotal_tax: "0.00",
        total: "275.00",
        total_tax: "0.00",
        sku: "FF-KISS-10-KIT",
        price: 275,
      },
    ],
    meta_data: [
      { id: 1, key: "_sales_rep_username", value: "fatemas" },
      { id: 2, key: "_created_by", value: "fatemas" },
    ],
  },
  {
    id: 2442,
    number: "2442",
    status: "processing",
    currency: "USD",
    date_created: "2026-08-15T09:30:00",
    date_modified: "2026-08-15T09:30:00",
    discount_total: "0.00",
    shipping_total: "10.00",
    total: "185.00",
    total_tax: "0.00",
    prices_include_tax: false,
    payment_method: "venmo",
    payment_method_title: "Venmo Payment",
    customer_id: 0,
    customer_ip_address: "",
    customer_user_agent: "",
    customer_note: "",
    billing: {
      first_name: "Sarah",
      last_name: "Connor",
      company: "",
      address_1: "123 Research Parkway",
      address_2: "",
      city: "Austin",
      state: "TX",
      postcode: "78701",
      country: "US",
      email: "sarah.c@example.com",
      phone: "+1 (555) 392-1092",
    },
    shipping: {
      first_name: "Sarah",
      last_name: "Connor",
      company: "",
      address_1: "123 Research Parkway",
      address_2: "",
      city: "Austin",
      state: "TX",
      postcode: "78701",
      country: "US",
      phone: "+1 (555) 392-1092",
    },
    line_items: [
      {
        id: 102,
        name: "BPC-157 10MG",
        product_id: 2280,
        variation_id: 0,
        quantity: 2,
        tax_class: "",
        subtotal: "90.00",
        subtotal_tax: "0.00",
        total: "90.00",
        total_tax: "0.00",
        sku: "FF-BPC-10",
        price: 45,
      },
      {
        id: 103,
        name: "TB-500 10MG",
        product_id: 2285,
        variation_id: 0,
        quantity: 1,
        tax_class: "",
        subtotal: "48.00",
        subtotal_tax: "0.00",
        total: "48.00",
        total_tax: "0.00",
        sku: "FF-TB-10",
        price: 48,
      },
    ],
    meta_data: [
      { id: 1, key: "_sales_rep_username", value: "farabi" },
      { id: 2, key: "_created_by", value: "farabi" },
    ],
  },
  {
    id: 2441,
    number: "2441",
    status: "completed",
    currency: "USD",
    date_created: "2026-08-14T16:00:00",
    date_modified: "2026-08-14T16:00:00",
    discount_total: "0.00",
    shipping_total: "15.00",
    total: "300.00",
    total_tax: "0.00",
    prices_include_tax: false,
    payment_method: "crypto",
    payment_method_title: "Crypto (USDT / BTC)",
    customer_id: 0,
    customer_ip_address: "",
    customer_user_agent: "",
    customer_note: "",
    billing: {
      first_name: "Michael",
      last_name: "Smith",
      company: "",
      address_1: "456 Oak Avenue",
      address_2: "",
      city: "Denver",
      state: "CO",
      postcode: "80202",
      country: "US",
      email: "msmith@example.com",
      phone: "+1 (555) 847-2910",
    },
    shipping: {
      first_name: "Michael",
      last_name: "Smith",
      company: "",
      address_1: "456 Oak Avenue",
      address_2: "",
      city: "Denver",
      state: "CO",
      postcode: "80202",
      country: "US",
      phone: "+1 (555) 847-2910",
    },
    line_items: [
      {
        id: 104,
        name: "SEMAGLUTIDE 5MG",
        product_id: 2290,
        variation_id: 0,
        quantity: 4,
        tax_class: "",
        subtotal: "300.00",
        subtotal_tax: "0.00",
        total: "300.00",
        total_tax: "0.00",
        sku: "FF-SEMA-5",
        price: 75,
      },
    ],
    meta_data: [
      { id: 1, key: "_sales_rep_username", value: "johndoe" },
      { id: 2, key: "_created_by", value: "johndoe" },
    ],
  },
];

let inMemoryOrders: Order[] = (INITIAL_FALLBACK_ORDERS as unknown) as Order[];
let inMemoryProducts: Product[] = (INITIAL_FALLBACK_PRODUCTS as unknown) as Product[];

export function persistFallbackOrders(orders: Order[]) {
  if (!orders || orders.length === 0) return;
  try {
    const map = new Map<number, Order>();
    inMemoryOrders.forEach((o) => map.set(o.id, o));
    orders.forEach((o) => map.set(o.id, o));
    inMemoryOrders = Array.from(map.values());
    fs.writeFileSync(ORDERS_CACHE_FILE, JSON.stringify(inMemoryOrders, null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function persistFallbackProducts(products: Product[]) {
  if (!products || products.length === 0) return;
  try {
    const map = new Map<number, Product>();
    inMemoryProducts.forEach((p) => map.set(p.id, p));
    products.forEach((p) => map.set(p.id, p));
    inMemoryProducts = Array.from(map.values());
    fs.writeFileSync(PRODUCTS_CACHE_FILE, JSON.stringify(inMemoryProducts, null, 2), "utf-8");
  } catch {
    // Ignore
  }
}

export function getCachedOrders(params: { status?: string; search?: string; page?: number; perPage?: number } = {}) {
  let list = inMemoryOrders;
  try {
    if (fs.existsSync(ORDERS_CACHE_FILE)) {
      const raw = fs.readFileSync(ORDERS_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
        inMemoryOrders = parsed;
      }
    }
  } catch {
    // Ignore
  }

  if (params.status && params.status !== "any") {
    list = list.filter((o) => o.status === params.status);
  }

  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    list = list.filter(
      (o) =>
        String(o.id).includes(q) ||
        String(o.number).includes(q) ||
        (o.billing?.first_name || "").toLowerCase().includes(q) ||
        (o.billing?.last_name || "").toLowerCase().includes(q) ||
        (o.billing?.email || "").toLowerCase().includes(q)
    );
  }

  const page = Math.max(1, Number(params.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage) || 15));
  const total = list.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const start = (page - 1) * perPage;
  const items = list.slice(start, start + perPage);

  return { items, total, totalPages, page, perPage };
}

export function getCachedProducts(params: { category?: string | number; status?: string; stock_status?: string; search?: string; page?: number; perPage?: number } = {}) {
  let list = inMemoryProducts;
  try {
    if (fs.existsSync(PRODUCTS_CACHE_FILE)) {
      const raw = fs.readFileSync(PRODUCTS_CACHE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
        inMemoryProducts = parsed;
      }
    }
  } catch {
    // Ignore
  }

  if (params.stock_status && params.stock_status !== "all") {
    list = list.filter((p) => (p.stock_status || "instock") === params.stock_status);
  }

  if (params.status && params.status !== "all") {
    list = list.filter((p) => p.status === params.status);
  }

  if (params.category && params.category !== "all") {
    const catId = Number(params.category);
    list = list.filter((p) => p.categories?.some((c) => c.id === catId || c.slug === String(params.category)));
  }

  if (params.search && params.search.trim()) {
    const q = params.search.toLowerCase().trim();
    list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q));
  }

  const page = Math.max(1, Number(params.page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(params.perPage) || 20));
  const total = list.length;
  const totalPages = Math.ceil(total / perPage) || 1;
  const start = (page - 1) * perPage;
  const items = list.slice(start, start + perPage);

  return { items, total, totalPages, page, perPage };
}
