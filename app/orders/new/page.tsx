"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { OrderStatus, Product, ProductCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { getLocationData, getCitiesForState, getStatesForCity } from "@/lib/data/locations";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface LineItemForm {
  product_id?: number;
  variation_id?: number;
  name: string;
  quantity: number;
  price: string;
  is_variable?: boolean;
  variations?: any[];
  selected_variation_id?: number;
  loading_variations?: boolean;
  image?: string;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<{ username?: string; role?: string } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("ff_user_session_v1");
        if (cached) return JSON.parse(cached);
      } catch {
        // Ignore
      }
    }
    return null;
  });

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user) {
          setCurrentUser(json.data.user);
          try {
            localStorage.setItem("ff_user_session_v1", JSON.stringify(json.data.user));
          } catch {
            // Ignore
          }
        }
      })
      .catch(() => {});
  }, []);
  // Customer & Address State
  const [customer, setCustomer] = useState({
    first_name: "",
    last_name: "",
    company: "",
    email: "",
    phone: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
  });

  const [useSameShipping, setUseSameShipping] = useState(true);
  const [shipping, setShipping] = useState({
    first_name: "",
    last_name: "",
    company: "",
    address_1: "",
    address_2: "",
    city: "",
    state: "",
    postcode: "",
    country: "US",
  });

  // Order Details
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState("zelle");
  const [paymentMethodTitle, setPaymentMethodTitle] = useState("Zelle");
  const [customerNote, setCustomerNote] = useState("");

  // Line items
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    { name: "", quantity: 1, price: "" },
  ]);

  // Product Search State for inline auto-filling
  const [searchingIndex, setSearchingIndex] = useState<number | null>(null);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Visual Product Showcase Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogCategories, setCatalogCategories] = useState<ProductCategory[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [expandedProductMap, setExpandedProductMap] = useState<Record<number, boolean>>({});
  const [productVariationsCache, setProductVariationsCache] = useState<Record<number, any[]>>({});
  const [loadingVarsMap, setLoadingVarsMap] = useState<Record<number, boolean>>({});

  // Form submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);
  const [addedToast, setAddedToast] = useState<string | null>(null);

  // Trigger feedback toast
  const showToast = (text: string) => {
    setAddedToast(text);
    setTimeout(() => setAddedToast(null), 3000);
  };

  // Load catalog products & categories for showcase
  const loadCatalogData = async () => {
    if (catalogProducts.length > 0) return;
    setCatalogLoading(true);
    try {
      const [prodsRes, catsRes] = await Promise.allSettled([
        fetch("/api/products?per_page=100").then((r) => r.json()),
        fetch("/api/products/categories").then((r) => r.json()),
      ]);

      if (prodsRes.status === "fulfilled" && prodsRes.value.success) {
        const prodData = prodsRes.value.data;
        const list = Array.isArray(prodData)
          ? prodData
          : Array.isArray(prodData?.items)
          ? prodData.items
          : Array.isArray(prodData?.products)
          ? prodData.products
          : [];
        setCatalogProducts(list);
      }
      if (catsRes.status === "fulfilled" && catsRes.value.success) {
        const catData = catsRes.value.data;
        const catList = Array.isArray(catData)
          ? catData
          : Array.isArray(catData?.categories)
          ? catData.categories
          : [];
        setCatalogCategories(catList);
      }
    } catch {
      // Non-critical fallback
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleOpenShowcase = () => {
    setIsCatalogModalOpen(true);
    loadCatalogData();
  };

  // Expand and load variants for a product inside showcase modal
  const toggleExpandProduct = async (productId: number) => {
    const isCurrentlyExpanded = Boolean(expandedProductMap[productId]);
    setExpandedProductMap((prev) => ({ ...prev, [productId]: !isCurrentlyExpanded }));

    // If opening and not cached yet, fetch variations
    if (!isCurrentlyExpanded && !productVariationsCache[productId]) {
      setLoadingVarsMap((prev) => ({ ...prev, [productId]: true }));
      try {
        const res = await fetch(`/api/products/${productId}/variations`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setProductVariationsCache((prev) => ({ ...prev, [productId]: json.data }));
        }
      } catch {
        // Ignore
      } finally {
        setLoadingVarsMap((prev) => ({ ...prev, [productId]: false }));
      }
    }
  };

  // Add a simple product from Showcase
  const handleAddSimpleFromShowcase = (prod: Product) => {
    setLineItems((prev) => {
      // If the only item is empty, replace it
      if (prev.length === 1 && !prev[0].name.trim()) {
        return [
          {
            product_id: prod.id,
            name: prod.name,
            quantity: 1,
            price: prod.price || "0",
            is_variable: false,
            image: prod.images?.[0]?.src,
          },
        ];
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          name: prod.name,
          quantity: 1,
          price: prod.price || "0",
          is_variable: false,
          image: prod.images?.[0]?.src,
        },
      ];
    });
    showToast(`Added "${prod.name}" to order!`);
  };

  // Add a specific variation from Showcase
  const handleAddVariationFromShowcase = (prod: Product, variation: any) => {
    const varAttrStr =
      variation.attributes?.map((a: any) => `${a.name || a.slug}: ${a.option}`).join(", ") ||
      variation.attributes?.map((a: any) => a.option).join(", ") ||
      `Pack Size #${variation.id}`;

    const unitPrice =
      variation.price ||
      variation.sale_price ||
      variation.regular_price ||
      prod.price ||
      "0";

    const fullName = `${prod.name} (${varAttrStr})`;

    setLineItems((prev) => {
      if (prev.length === 1 && !prev[0].name.trim()) {
        return [
          {
            product_id: prod.id,
            variation_id: variation.id,
            name: fullName,
            quantity: 1,
            price: unitPrice,
            is_variable: true,
            selected_variation_id: variation.id,
            variations: productVariationsCache[prod.id] || [variation],
            image: variation.image?.src || prod.images?.[0]?.src,
          },
        ];
      }
      return [
        ...prev,
        {
          product_id: prod.id,
          variation_id: variation.id,
          name: fullName,
          quantity: 1,
          price: unitPrice,
          is_variable: true,
          selected_variation_id: variation.id,
          variations: productVariationsCache[prod.id] || [variation],
          image: variation.image?.src || prod.images?.[0]?.src,
        },
      ];
    });
    showToast(`Added "${fullName}" to order!`);
  };

  // Filter products in showcase modal
  const filteredCatalogProducts = useMemo(() => {
    let list = Array.isArray(catalogProducts) ? catalogProducts : [];
    if (selectedCategoryTab !== "all") {
      list = list.filter((p) =>
        p.categories?.some((c) => c.slug === selectedCategoryTab || String(c.id) === selectedCategoryTab)
      );
    }
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.short_description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalogProducts, selectedCategoryTab, catalogSearch]);

  const handleCustomerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "country") {
      setCustomer((prev) => ({
        ...prev,
        country: value,
        city: "",
        state: "",
      }));
    } else {
      setCustomer((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleShippingChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    if (name === "country") {
      setShipping((prev) => ({
        ...prev,
        country: value,
        city: "",
        state: "",
      }));
    } else {
      setShipping((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemForm,
    value: string | number
  ) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addLineItem = () => {
    setLineItems((prev) => [...prev, { name: "", quantity: 1, price: "" }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) {
      setLineItems([{ name: "", quantity: 1, price: "" }]);
      return;
    }
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Inline Search
  const handleSearchProduct = async (query: string, index: number) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchingIndex(null);
      return;
    }

    setSearchingIndex(index);
    setSearchLoading(true);

    try {
      const res = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setSearchResults(json.data);
      }
    } catch {
      // Ignore
    } finally {
      setSearchLoading(false);
    }
  };

  // Select Product from Inline Search
  const selectProduct = async (prod: Product, index: number) => {
    if (prod.type === "variable") {
      setLineItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          product_id: prod.id,
          name: prod.name,
          quantity: 1,
          price: prod.price || "0",
          is_variable: true,
          loading_variations: true,
          variations: [],
          image: prod.images?.[0]?.src,
        };
        return updated;
      });
      setSearchingIndex(null);
      setSearchResults([]);

      // Fetch variations for this product
      try {
        const res = await fetch(`/api/products/${prod.id}/variations`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          const vars = json.data;
          const firstVar = vars[0];
          const varAttrStr =
            firstVar.attributes?.map((a: any) => `${a.name || a.slug}: ${a.option}`).join(", ") ||
            firstVar.attributes?.map((a: any) => a.option).join(", ") ||
            "";

          const unitPrice =
            firstVar.price ||
            firstVar.sale_price ||
            firstVar.regular_price ||
            prod.price ||
            "0";

          setLineItems((prev) => {
            const updated = [...prev];
            if (updated[index]?.product_id === prod.id) {
              updated[index] = {
                ...updated[index],
                variation_id: firstVar.id,
                name: `${prod.name} (${varAttrStr || "Pack Size #" + firstVar.id})`,
                price: unitPrice,
                is_variable: true,
                loading_variations: false,
                variations: vars,
                selected_variation_id: firstVar.id,
              };
            }
            return updated;
          });
        } else {
          setLineItems((prev) => {
            const updated = [...prev];
            if (updated[index]) {
              updated[index].loading_variations = false;
            }
            return updated;
          });
        }
      } catch {
        setLineItems((prev) => {
          const updated = [...prev];
          if (updated[index]) {
            updated[index].loading_variations = false;
          }
          return updated;
        });
      }
    } else {
      setLineItems((prev) => {
        const updated = [...prev];
        updated[index] = {
          product_id: prod.id,
          name: prod.name,
          quantity: 1,
          price: prod.price || "0",
          is_variable: false,
          image: prod.images?.[0]?.src,
        };
        return updated;
      });
      setSearchingIndex(null);
      setSearchResults([]);
    }
  };

  // Change selected variation on a line item
  const handleSelectVariation = (index: number, variationId: number) => {
    setLineItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item || !item.variations) return prev;

      const selectedVar = item.variations.find((v: any) => v.id === variationId);
      if (!selectedVar) return prev;

      const baseName = item.name.split(" (")[0] || item.name;
      const varAttrStr =
        selectedVar.attributes?.map((a: any) => `${a.name || a.slug}: ${a.option}`).join(", ") ||
        selectedVar.attributes?.map((a: any) => a.option).join(", ") ||
        `Pack Size #${selectedVar.id}`;

      const unitPrice =
        selectedVar.price ||
        selectedVar.sale_price ||
        selectedVar.regular_price ||
        item.price;

      updated[index] = {
        ...item,
        variation_id: selectedVar.id,
        selected_variation_id: selectedVar.id,
        name: `${baseName} (${varAttrStr})`,
        price: unitPrice,
      };
      return updated;
    });
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => {
      const p = parseFloat(item.price) || 0;
      const q = Number(item.quantity) || 1;
      return sum + p * q;
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customer.first_name.trim()) {
      setError("First name is required.");
      return;
    }
    if (!customer.phone.trim()) {
      setError("Customer phone number is required.");
      return;
    }
    if (!customer.address_1.trim() || !customer.city.trim()) {
      setError("Delivery street address and city are required.");
      return;
    }

    const validItems = lineItems.filter((item) => item.name.trim() !== "");
    if (validItems.length === 0) {
      setError("Please add at least one line item with a name and price.");
      return;
    }

    const trimmedEmail = (customer.email || "").trim();
    if (!trimmedEmail) {
      setError("Email address is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address (e.g. name@example.com).");
      return;
    }

    const cleanCustomer = {
      ...customer,
      email: trimmedEmail,
    };

    const cleanShipping = useSameShipping
      ? cleanCustomer
      : shipping;

    const payload = {
      status,
      payment_method: paymentMethod,
      payment_method_title: paymentMethodTitle,
      set_paid: status === "completed",
      billing: cleanCustomer,
      shipping: cleanShipping,
      customer_note: customerNote,
      line_items: validItems.map((item) => ({
        product_id: item.product_id,
        variation_id: item.variation_id,
        name: item.name,
        quantity: Math.max(1, Number(item.quantity) || 1),
        price: item.price,
        total: (parseFloat(item.price || "0") * Math.max(1, Number(item.quantity) || 1)).toFixed(2),
      })),
    };

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create order.");
      }

      // If Sales Rep (role === 'staff'), redirect directly to Dashboard with success toast!
      if (currentUser?.role === "staff") {
        try {
          localStorage.setItem(
            "ff_order_created_toast",
            JSON.stringify({
              id: json.data.id,
              customer: `${customer.first_name} ${customer.last_name}`.trim(),
            })
          );
        } catch {
          // Ignore
        }
        router.push("/");
        return;
      }

      setCreatedOrderId(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order.");
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();

  const handleResetForm = () => {
    setCreatedOrderId(null);
    setCustomer({
      first_name: "",
      last_name: "",
      company: "",
      email: "",
      phone: "",
      address_1: "",
      address_2: "",
      city: "",
      state: "",
      postcode: "",
      country: "US",
    });
    setLineItems([{ name: "", quantity: 1, price: "" }]);
    setStatus("pending");
    setPaymentMethod("zelle");
    setPaymentMethodTitle("Zelle");
    setCustomerNote("");
  };

  if (createdOrderId) {
    return (
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-12 font-sans">
        <Card className="border-emerald-200 bg-emerald-50 text-center p-8 rounded-3xl shadow-xl">
          <CardHeader className="items-center">
            <div className="p-4 rounded-full bg-emerald-100 text-emerald-600 mb-3 text-2xl shadow-sm">
              🎉
            </div>
            <CardTitle className="text-2xl font-black text-emerald-950">
              Order #{createdOrderId} Created Successfully!
            </CardTitle>
            <CardDescription className="text-emerald-800 text-xs sm:text-sm mt-1">
              The order has been directly synchronized with your live WooCommerce store in real time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 rounded-2xl bg-white border border-emerald-200/80 text-left space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Customer:</span>
                <span className="font-extrabold text-slate-900">{customer.first_name} {customer.last_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Phone:</span>
                <span className="font-extrabold font-mono text-slate-900">{customer.phone}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-bold">Total Amount:</span>
                <span className="font-black text-emerald-600 font-mono text-sm">{formatCurrency(subtotal.toFixed(2))}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-bold">Status:</span>
                <StatusBadge status={status} />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href={`/orders/${createdOrderId}`}
                className="w-full sm:w-auto px-5 py-3 text-xs font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95"
              >
                View Order Details & Invoice →
              </Link>
              <button
                onClick={handleResetForm}
                className="w-full sm:w-auto px-5 py-3 text-xs font-black rounded-2xl bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 transition-all shadow-sm active:scale-95"
              >
                + Take Another Order
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 font-sans">
      {/* Toast */}
      {addedToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border bg-slate-950 text-white border-slate-800 text-xs font-bold animate-in slide-in-from-top duration-200 flex items-center gap-2">
          <span>✨</span>
          <span>{addedToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Link
              href="/orders"
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 shrink-0"
              title="Back to Orders"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-950">
              Create Manual Order
            </h1>
            <span className="whitespace-nowrap px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] sm:text-xs font-extrabold border border-emerald-200 shrink-0">
              Direct WooCommerce Sync
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Place customer orders with dynamic product variants and sync directly to WooCommerce.
          </p>
        </div>

        {/* Big Showcase Modal Button */}
        <button
          type="button"
          onClick={handleOpenShowcase}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-black rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <span className="text-sm">📱</span>
          <span>Browse Visual Catalog (Show Customer)</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Sections */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer Info */}
          <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-[#18181b]">
                1. Customer Information & Billing
              </CardTitle>
              <CardDescription className="text-xs">
                Enter customer contact and billing address details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={customer.first_name}
                    onChange={handleCustomerChange}
                    placeholder="e.g. John"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={customer.last_name}
                    onChange={handleCustomerChange}
                    placeholder="e.g. Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={customer.phone}
                    onChange={handleCustomerChange}
                    placeholder="e.g. +880 1712 345678"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-mono font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={customer.email}
                    onChange={handleCustomerChange}
                    placeholder="e.g. customer@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Street Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="address_1"
                  value={customer.address_1}
                  onChange={handleCustomerChange}
                  placeholder="House #, Street / Road name"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Country / Region */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Country / Region <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="country"
                    value={customer.country || "US"}
                    onChange={handleCustomerChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all cursor-pointer"
                    required
                  >
                    <option value="US">United States (US)</option>
                    <option value="BD">Bangladesh (BD)</option>
                    <option value="GB">United Kingdom (UK)</option>
                    <option value="CA">Canada (CA)</option>
                    <option value="AU">Australia (AU)</option>
                    <option value="AE">United Arab Emirates (UAE)</option>
                    <option value="SA">Saudi Arabia (SA)</option>
                    <option value="IN">India (IN)</option>
                    <option value="MY">Malaysia (MY)</option>
                    <option value="SG">Singapore (SG)</option>
                  </select>
                </div>

                {/* 2. State / County (Searchable & Typeable Combobox based on Country) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    2. State / County
                  </label>
                  <SearchableSelect
                    name="state"
                    value={customer.state}
                    onChange={(val) => setCustomer((prev) => ({ ...prev, state: val }))}
                    options={getLocationData(customer.country || "US").states}
                    placeholder="e.g. California"
                  />
                </div>

                {/* 3. City (Searchable & Typeable Combobox with A-Z suggestions) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    3. City <span className="text-rose-500">*</span>
                  </label>
                  <SearchableSelect
                    name="city"
                    value={customer.city}
                    onChange={(val) => setCustomer((prev) => ({ ...prev, city: val }))}
                    options={getCitiesForState(customer.country || "US", customer.state)}
                    placeholder="Enter or select city (e.g. Los Angeles)"
                    required
                  />
                </div>

                {/* 4. Postcode / ZIP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    4. Postcode / ZIP
                  </label>
                  <input
                    type="text"
                    name="postcode"
                    value={customer.postcode}
                    onChange={handleCustomerChange}
                    placeholder="e.g. 90001"
                    autoComplete="postal-code"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all font-mono font-medium"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-extrabold text-[#18181b]">
                  Shipping Address
                </CardTitle>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSameShipping}
                  onChange={(e) => setUseSameShipping(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Same as billing address</span>
              </label>
            </CardHeader>

            {!useSameShipping && (
              <CardContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="first_name"
                    placeholder="First Name"
                    value={shipping.first_name}
                    onChange={handleShippingChange}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900"
                  />
                  <input
                    type="text"
                    name="last_name"
                    placeholder="Last Name"
                    value={shipping.last_name}
                    onChange={handleShippingChange}
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900"
                  />
                </div>
                <input
                  type="text"
                  name="address_1"
                  placeholder="Shipping Street Address"
                  value={shipping.address_1}
                  onChange={handleShippingChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* 1. Country / Region */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      1. Country / Region
                    </label>
                    <select
                      name="country"
                      value={shipping.country || "US"}
                      onChange={handleShippingChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-semibold text-slate-900 cursor-pointer"
                    >
                      <option value="US">United States (US)</option>
                      <option value="BD">Bangladesh (BD)</option>
                      <option value="GB">United Kingdom (UK)</option>
                      <option value="CA">Canada (CA)</option>
                      <option value="AU">Australia (AU)</option>
                      <option value="AE">United Arab Emirates (UAE)</option>
                      <option value="SA">Saudi Arabia (SA)</option>
                      <option value="IN">India (IN)</option>
                      <option value="MY">Malaysia (MY)</option>
                      <option value="SG">Singapore (SG)</option>
                    </select>
                  </div>

                  {/* 2. State / County (Searchable & Typeable Combobox based on Country) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      2. State / County
                    </label>
                    <SearchableSelect
                      name="state"
                      value={shipping.state}
                      onChange={(val) => setShipping((prev) => ({ ...prev, state: val }))}
                      options={getLocationData(shipping.country || "US").states}
                      placeholder="e.g. California"
                    />
                  </div>

                  {/* 3. City (Searchable & Typeable Combobox with A-Z suggestions) */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      3. City
                    </label>
                    <SearchableSelect
                      name="city"
                      value={shipping.city}
                      onChange={(val) => setShipping((prev) => ({ ...prev, city: val }))}
                      options={getCitiesForState(shipping.country || "US", shipping.state)}
                      placeholder="Enter or select city (e.g. Los Angeles)"
                    />
                  </div>

                  {/* 4. Postcode / ZIP */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      4. Postcode / ZIP
                    </label>
                    <input
                      type="text"
                      name="postcode"
                      placeholder="e.g. 90001"
                      value={shipping.postcode}
                      onChange={handleShippingChange}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 font-mono"
                    />
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Section 2: Line Items with Dynamic Variation Selector */}
          <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-3 space-y-3">
              <div>
                <CardTitle className="text-base font-extrabold text-[#18181b]">
                  2. Order Line Items
                </CardTitle>
                <CardDescription className="text-xs">
                  Search WooCommerce products or choose variants dynamically.
                </CardDescription>
              </div>

              {/* Action Buttons in a Clean Full-Width Row */}
              <div className="flex flex-row items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleOpenShowcase}
                  className="flex-1 sm:flex-none text-xs font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 active:scale-95 px-4 py-2.5 rounded-2xl transition-all border border-indigo-200 flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
                >
                  <span className="text-sm">📱</span>
                  <span>Visual Showcase</span>
                </button>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex-1 sm:flex-none text-xs font-black text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-95 px-4 py-2.5 rounded-2xl transition-all border border-slate-200/80 flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <span className="font-bold text-sm">+</span>
                  <span>Add Item</span>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {lineItems.map((item, index) => (
                <div key={index} className="p-4 rounded-3xl border border-slate-200/80 bg-slate-50/70 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      Item #{index + 1}
                    </span>
                    {lineItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Product Name & Search */}
                    <div className="sm:col-span-6 relative">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Product / Item Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          handleLineItemChange(index, "name", e.target.value);
                          handleSearchProduct(e.target.value, index);
                        }}
                        placeholder="Type to search live products..."
                        className="w-full h-[42px] bg-white border border-slate-200 rounded-2xl px-4 text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all shadow-2xs"
                      />

                      {/* Search Suggestions Dropdown */}
                      {searchingIndex === index && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in duration-150">
                          {searchLoading ? (
                            <div className="p-3 text-center text-xs text-slate-500 font-medium">
                              Searching WooCommerce catalog...
                            </div>
                          ) : searchResults.length > 0 ? (
                            searchResults.map((prod) => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => selectProduct(prod, index)}
                                className="w-full text-left p-3 hover:bg-slate-50 flex items-center justify-between text-xs text-slate-800 transition-colors group"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                  {prod.images?.[0]?.src && (
                                    <img
                                      src={prod.images[0].src}
                                      alt={prod.name}
                                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-slate-100"
                                    />
                                  )}
                                  <div className="truncate">
                                    <div className="font-bold text-slate-900 truncate group-hover:text-indigo-600">
                                      {prod.name}
                                    </div>
                                    <span className="text-[10px] text-slate-400 uppercase font-bold">
                                      {prod.type === "variable" ? "Variable (Select Pack Size)" : "Simple Product"}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono font-black text-slate-900 shrink-0 text-xs">
                                  {formatCurrency(prod.price || "0")}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-slate-500 font-medium">
                              No products found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity Stepper */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Quantity
                      </label>
                      <div className="w-full max-w-[170px] flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-1 shadow-2xs h-[42px]">
                        {/* Decrement Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              Math.max(1, (Number(item.quantity) || 1) - 1)
                            )
                          }
                          disabled={(Number(item.quantity) || 1) <= 1}
                          className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-sm flex items-center justify-center active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
                          title="Decrease Quantity (-1)"
                        >
                          <span className="leading-none select-none">−</span>
                        </button>

                        {/* Direct Number Input */}
                        <input
                          type="number"
                          min="1"
                          max="9999"
                          value={item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === "") {
                              handleLineItemChange(index, "quantity", 1);
                              return;
                            }
                            const val = parseInt(raw, 10);
                            handleLineItemChange(index, "quantity", isNaN(val) || val < 1 ? 1 : val);
                          }}
                          className="w-14 text-center bg-transparent py-1 text-xs sm:text-sm text-slate-900 font-mono font-black focus:outline-none"
                        />

                        {/* Increment Button */}
                        <button
                          type="button"
                          onClick={() =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              (Number(item.quantity) || 1) + 1
                            )
                          }
                          className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm flex items-center justify-center active:scale-95 transition-all shadow-xs shrink-0 cursor-pointer"
                          title="Increase Quantity (+1)"
                        >
                          <span className="leading-none select-none">+</span>
                        </button>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Unit Price ($ USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleLineItemChange(index, "price", e.target.value)}
                        placeholder="0.00"
                        className="w-full h-[42px] bg-white border border-slate-200 rounded-2xl px-4 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all shadow-2xs"
                      />
                    </div>
                  </div>

                  {/* DYNAMIC VARIATION SELECTOR (When product has variations) */}
                  {item.is_variable && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col gap-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-indigo-900 flex items-center gap-1.5">
                          <span>📦</span>
                          <span>Select Pack Size / Variation:</span>
                        </label>
                        {item.loading_variations && (
                          <span className="text-[10px] text-indigo-600 font-bold animate-pulse">
                            Loading variations...
                          </span>
                        )}
                      </div>

                      {item.variations && item.variations.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {item.variations.map((v: any) => {
                            const isSelected = item.selected_variation_id === v.id;
                            const optionTitle =
                              v.attributes?.map((a: any) => `${a.name || a.slug}: ${a.option}`).join(", ") ||
                              v.attributes?.map((a: any) => a.option).join(", ") ||
                              `Variation #${v.id}`;
                            const varPrice = v.price || v.sale_price || v.regular_price || "0";

                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => handleSelectVariation(index, v.id)}
                                className={`p-2.5 rounded-xl border text-left flex flex-col justify-between gap-1 transition-all ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                    : "bg-white text-slate-800 border-indigo-200/80 hover:bg-indigo-100/50"
                                }`}
                              >
                                <span className={`text-[11px] font-black truncate ${isSelected ? "text-white" : "text-slate-900"}`}>
                                  {optionTitle}
                                </span>
                                <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
                                  <span className={`font-black ${isSelected ? "text-indigo-100" : "text-indigo-700"}`}>
                                    {formatCurrency(varPrice)}
                                  </span>
                                  <span className={`font-bold text-[9px] uppercase ${v.stock_status === "instock" ? (isSelected ? "text-emerald-200" : "text-emerald-600") : "text-rose-500"}`}>
                                    {v.stock_status === "instock" ? "In Stock" : "Out of stock"}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : !item.loading_variations ? (
                        <p className="text-[11px] text-slate-500 italic">
                          No distinct variations found. You can set the price manually.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Summary & Dispatch */}
        <div className="space-y-6">
          <Card className="rounded-3xl border-slate-200/80 shadow-2xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-extrabold text-[#18181b]">
                Order Summary & Dispatch
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Order Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all cursor-pointer"
                >
                  <option value="pending">Pending Payment (Default)</option>
                  <option value="processing">Processing (Payment Received)</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed (Paid & Dispatched)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => {
                    const method = e.target.value;
                    setPaymentMethod(method);
                    if (method === "zelle") setPaymentMethodTitle("Zelle");
                    else if (method === "applecash") setPaymentMethodTitle("Apple Cash");
                    else if (method === "cashapp") setPaymentMethodTitle("Cash App");
                    else if (method === "online") setPaymentMethodTitle("Credit Card / Online");
                    else if (method === "cod") setPaymentMethodTitle("Cash on Delivery");
                    else if (method === "bacs") setPaymentMethodTitle("Direct Bank Transfer");
                    else setPaymentMethodTitle(method.toUpperCase());
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all cursor-pointer"
                >
                  <option value="zelle">Zelle</option>
                  <option value="applecash">Apple Cash</option>
                  <option value="cashapp">Cash App</option>
                  <option value="online">Credit Card / Online</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="bacs">Direct Bank Transfer (BACS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Customer Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Special instructions from customer..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all resize-none"
                />
              </div>

              {/* Total Calculation */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-500">Total Due:</span>
                <span className="text-xl font-black text-slate-900 font-mono">
                  {formatCurrency(subtotal.toFixed(2))}
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-4 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md active:scale-98 flex items-center justify-center gap-2.5 cursor-pointer ${
                  loading
                    ? "bg-slate-800 text-white opacity-90 cursor-not-allowed"
                    : "bg-[#18181B] hover:bg-black text-white hover:shadow-lg"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                    <span className="font-extrabold tracking-wide animate-pulse">Syncing Order to WooCommerce...</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">⚡</span>
                    <span>Create & Sync Order</span>
                  </>
                )}
              </button>

              <div className="text-center">
                <Link
                  href="/orders"
                  className="text-xs font-extrabold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  Cancel & Go Back
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>

      {/* ========================================================================= */}
      {/* VISUAL PRODUCT SHOWCASE & VARIANT BROWSER MODAL (For Sales Reps) */}
      {/* ========================================================================= */}
      {isCatalogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white z-10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0">
                  📱
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900">
                    Visual Product & Variant Showcase
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Show product imagery, dosage pack sizes, and prices to customer.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-black text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 space-y-3 shrink-0">
              <div className="relative w-full">
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  placeholder="Search products by peptide name, dosage..."
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300"
                />
                <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                    selectedCategoryTab === "all"
                      ? "bg-[#18181B] text-white shadow-2xs"
                      : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                  }`}
                >
                  All Products
                </button>
                {Array.isArray(catalogCategories) &&
                  catalogCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryTab(cat.slug)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 ${
                        selectedCategoryTab === cat.slug
                          ? "bg-[#18181B] text-white shadow-2xs"
                          : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-50/40">
              {catalogLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div key={n} className="h-64 rounded-3xl bg-slate-200 animate-pulse" />
                  ))}
                </div>
              ) : filteredCatalogProducts.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-3xl mb-2">🔍</div>
                  <p className="text-sm font-black text-slate-800">No products found matching query.</p>
                  <p className="text-xs text-slate-400 mt-1">Try clearing search filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCatalogProducts.map((prod) => {
                    const isExpanded = Boolean(expandedProductMap[prod.id]);
                    const variations = productVariationsCache[prod.id];
                    const isLoadingVars = Boolean(loadingVarsMap[prod.id]);
                    const isVariable = prod.type === "variable";

                    return (
                      <div
                        key={prod.id}
                        className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-all group"
                      >
                        {/* Product Image & Basic Info */}
                        <div className="space-y-3">
                          <Link
                            href={`/products/${prod.id}`}
                            className="block relative w-full h-40 rounded-2xl bg-slate-100 overflow-hidden border border-slate-100 group/img cursor-pointer"
                            title={`Open single product presentation page for ${prod.name}`}
                          >
                            {prod.images?.[0]?.src ? (
                              <img
                                src={prod.images[0].src}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 text-3xl">
                                💊
                              </div>
                            )}

                            {/* Badge */}
                            <div className="absolute top-2.5 left-2.5">
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white">
                                {isVariable ? "Variable (Pack Sizes)" : "Simple Item"}
                              </span>
                            </div>

                            {/* Single Page Hint Pill */}
                            <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1 opacity-90 group-hover/img:opacity-100 transition-opacity">
                              <span>Open Details →</span>
                            </div>
                          </Link>

                          <div>
                            <Link
                              href={`/products/${prod.id}`}
                              className="font-extrabold text-sm text-slate-900 hover:text-indigo-600 leading-snug line-clamp-2 transition-colors flex items-baseline justify-between gap-1 group/title cursor-pointer"
                              title={`View full details for ${prod.name}`}
                            >
                              <span>{prod.name}</span>
                              <span className="text-slate-400 group-hover/title:text-indigo-600 text-xs shrink-0 font-bold">→</span>
                            </Link>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-xs font-mono font-black text-slate-900">
                                {formatCurrency(prod.price || "0")}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-600">
                                {prod.stock_status === "instock" ? "✓ In Stock" : "Out of stock"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Variants Box or 1-Tap Add */}
                        <div className="pt-2 border-t border-slate-100">
                          {isVariable ? (
                            <div className="space-y-2">
                              <button
                                type="button"
                                onClick={() => toggleExpandProduct(prod.id)}
                                className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-extrabold text-xs transition-all flex items-center justify-between"
                              >
                                <span>{isExpanded ? "Hide Pack Sizes" : "✨ View Available Kits & Sizes"}</span>
                                <span>{isExpanded ? "▲" : "▼"}</span>
                              </button>

                              {/* Variations List */}
                              {isExpanded && (
                                <div className="space-y-1.5 pt-1 animate-in fade-in duration-150">
                                  {isLoadingVars ? (
                                    <div className="p-3 text-center text-xs text-slate-500 font-medium animate-pulse">
                                      Loading pack sizes...
                                    </div>
                                  ) : variations && variations.length > 0 ? (
                                    variations.map((v: any) => {
                                      const optionTitle =
                                        v.attributes?.map((a: any) => a.option).join(", ") ||
                                        `Variant #${v.id}`;
                                      const vPrice = v.price || v.sale_price || v.regular_price || prod.price || "0";

                                      return (
                                        <div
                                          key={v.id}
                                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2"
                                        >
                                          <div className="min-w-0">
                                            <div className="text-[11px] font-black text-slate-900 truncate">
                                              {optionTitle}
                                            </div>
                                            <div className="text-[10px] font-mono font-bold text-slate-600">
                                              {formatCurrency(vPrice)}
                                            </div>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => handleAddVariationFromShowcase(prod, v)}
                                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black shadow-xs active:scale-95 transition-all shrink-0"
                                          >
                                            + Add
                                          </button>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="p-2 text-center text-xs text-slate-400">
                                      No variants found.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddSimpleFromShowcase(prod)}
                              className="w-full py-2 px-3 rounded-xl bg-[#18181B] hover:bg-black text-white font-black text-xs transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <span>🛒</span>
                              <span>+ Add to Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-lg">
              <div>
                <span className="text-xs text-slate-500 font-bold">Current Order Subtotal:</span>
                <div className="text-base font-black text-slate-900 font-mono">
                  {formatCurrency(subtotal.toFixed(2))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(false)}
                className="px-6 py-2.5 rounded-2xl bg-[#18181B] hover:bg-black text-white font-black text-xs shadow-md active:scale-95 transition-all"
              >
                Done & Review Order ({lineItems.filter((i) => i.name.trim()).length} Items) →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
