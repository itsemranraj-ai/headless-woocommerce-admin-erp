"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  ProductCategory,
  ProductTag,
  ProductType,
  ProductStatus,
  StockStatus,
  TaxStatus,
  ProductAttribute,
  ProductVariationAttribute,
  CreateVariationPayload,
  ProductDownload,
} from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";

type ActiveTab = "general" | "inventory" | "shipping" | "linked" | "attributes" | "variations" | "advanced";

// Helper to convert selected file into base64 data URL with automatic canvas optimization
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        } else {
          resolve(result);
        }
      };
      img.onerror = () => resolve(result);
      img.src = result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function NewProductPage() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdProductId, setCreatedProductId] = useState<number | null>(null);

  // File Input References
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");

  // Basic Information
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [productType, setProductType] = useState<ProductType>("simple");
  const [status, setStatus] = useState<ProductStatus>("publish");
  const [featured, setFeatured] = useState(false);
  const [catalogVisibility, setCatalogVisibility] = useState<"visible" | "catalog" | "search" | "hidden">("visible");
  const [virtual, setVirtual] = useState(false);
  const [downloadable, setDownloadable] = useState(false);

  // Descriptions
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  // Media
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [newGalleryInput, setNewGalleryInput] = useState("");
  const [imageInputMode, setImageInputMode] = useState<"gallery" | "url">("gallery");

  // Categories & Tags
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // General Tab
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [dateOnSaleFrom, setDateOnSaleFrom] = useState("");
  const [dateOnSaleTo, setDateOnSaleTo] = useState("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("taxable");
  const [taxClass, setTaxClass] = useState("standard");
  const [externalUrl, setExternalUrl] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [downloads, setDownloads] = useState<ProductDownload[]>([]);

  // Inventory Tab
  const [sku, setSku] = useState("");
  const [manageStock, setManageStock] = useState(false);
  const [stockQuantity, setStockQuantity] = useState<number | string>("");
  const [stockStatus, setStockStatus] = useState<StockStatus>("instock");
  const [backorders, setBackorders] = useState<"no" | "notify" | "yes">("no");
  const [lowStockAmount, setLowStockAmount] = useState<number | string>("");
  const [soldIndividually, setSoldIndividually] = useState(false);

  // Shipping Tab
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [shippingClass, setShippingClass] = useState("");

  // Linked Products
  const [upsellIds, setUpsellIds] = useState<number[]>([]);
  const [crossSellIds, setCrossSellIds] = useState<number[]>([]);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Array<{ id: number; name: string; price: string }>>([]);

  // Attributes Tab
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { name: "SIZE", options: ["SINGLE", "1/2 KITS (5 VIALS)", "FULL KITS (10 VIALS)"], visible: true, variation: true },
  ]);
  const [attributePresets, setAttributePresets] = useState<Array<{ name: string; options: string[]; productCount?: number }>>([
    { name: "SIZE (FixionFuel Standard)", options: ["SINGLE", "1/2 KITS (5 VIALS)", "FULL KITS (10 VIALS)"], productCount: 30 },
    { name: "SIZE (Kits)", options: ["SINGLE", "1/2 KITS", "FULL KITS"], productCount: 10 },
    { name: "DOSAGE / MG", options: ["5MG", "10MG", "20MG", "50MG", "60MG"], productCount: 8 },
    { name: "VIALS / PACK", options: ["1 Vial", "5 Vials", "10 Vials"], productCount: 5 },
  ]);

  // Variations Tab (for Variable Products)
  const [variations, setVariations] = useState<
    Array<CreateVariationPayload & { id?: number; tempId: string; expanded?: boolean }>
  >([]);

  // Advanced Tab
  const [purchaseNote, setPurchaseNote] = useState("");
  const [menuOrder, setMenuOrder] = useState<number>(0);
  const [reviewsAllowed, setReviewsAllowed] = useState(true);

  // Load Categories & Tags
  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (json.data?.user?.role === "staff") {
          window.location.href = "/orders";
        }
      })
      .catch(() => {});

    fetch("/api/products/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setCategories(json.data);
      })
      .catch(() => {});

    fetch("/api/products/tags")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setTags(json.data);
      })
      .catch(() => {});

    fetch("/api/products/attributes")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setAttributePresets(json.data);
      })
      .catch(() => {});
  }, []);

  // When switching to variable product, automatically load the 3 standard variations
  useEffect(() => {
    if (productType === "variable" && variations.length === 0) {
      setVariations([
        {
          tempId: "var_init_1",
          sku: "",
          regular_price: "",
          sale_price: "",
          stock_status: "instock",
          manage_stock: false,
          stock_quantity: null,
          virtual: false,
          downloadable: false,
          attributes: [{ name: "SIZE", option: "SINGLE" }],
          expanded: false,
        },
        {
          tempId: "var_init_2",
          sku: "",
          regular_price: "",
          sale_price: "",
          stock_status: "instock",
          manage_stock: false,
          stock_quantity: null,
          virtual: false,
          downloadable: false,
          attributes: [{ name: "SIZE", option: "1/2 KITS (5 VIALS)" }],
          expanded: false,
        },
        {
          tempId: "var_init_3",
          sku: "",
          regular_price: "",
          sale_price: "",
          stock_status: "instock",
          manage_stock: false,
          stock_quantity: null,
          virtual: false,
          downloadable: false,
          attributes: [{ name: "SIZE", option: "FULL KITS (10 VIALS)" }],
          expanded: false,
        },
      ]);
    }
    if (productType !== "variable" && activeTab === "variations") {
      setActiveTab("general");
    }
  }, [productType, activeTab, variations.length]);

  // Search products for upsells / cross-sells
  useEffect(() => {
    if (!searchProductQuery.trim()) {
      setSearchedProducts([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/products?search=${encodeURIComponent(searchProductQuery.trim())}&per_page=5`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.items) {
            setSearchedProducts(json.data.items);
          }
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [searchProductQuery]);

  // Helper to upload a file to server and get back a live CDN URL
  const uploadClientFile = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.url) {
        return json.url;
      }
    } catch (e) {
      console.warn("Client direct upload fallback to base64:", e);
    }
    return await readFileAsDataUrl(file);
  };

  // Handle Primary Image File Upload from Phone / PC Gallery
  const handlePrimaryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFeaturedImageUrl(dataUrl);
      const liveUrl = await uploadClientFile(file);
      setFeaturedImageUrl(liveUrl);
    } catch (err) {
      console.error("Error reading image:", err);
    }
    if (primaryFileInputRef.current) primaryFileInputRef.current.value = "";
  };

  // Handle Gallery Images File Upload (Multiple Files) from Phone / PC Gallery
  const handleGalleryFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      for (const f of Array.from(files)) {
        const dataUrl = await readFileAsDataUrl(f);
        setGalleryUrls((prev) => [...prev, dataUrl]);
        uploadClientFile(f)
          .then((liveUrl) => {
            setGalleryUrls((prev) => prev.map((u) => (u === dataUrl ? liveUrl : u)));
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Error reading gallery files:", err);
    }
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  };

  // Handle Single Variation Image Upload from Phone / PC Gallery
  const handleVariationFileSelect = async (tempId: string, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      handleUpdateVariation(tempId, { image: { src: dataUrl } });
      const liveUrl = await uploadClientFile(file);
      handleUpdateVariation(tempId, { image: { src: liveUrl } });
    } catch (err) {
      console.error("Error reading variation image:", err);
    }
  };

  // Add Gallery Image URL manually
  const handleAddGalleryImage = () => {
    if (!newGalleryInput.trim()) return;
    setGalleryUrls((prev) => [...prev, newGalleryInput.trim()]);
    setNewGalleryInput("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Add Tag
  const handleAddTag = (tag: string) => {
    const clean = tag.trim();
    if (clean && !selectedTags.includes(clean)) {
      setSelectedTags((prev) => [...prev, clean]);
    }
    setTagInput("");
  };

  // Inline Category Creator
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setCategories((prev) => [...prev, json.data]);
        setSelectedCategoryIds((prev) => [...prev, json.data.id]);
        setNewCategoryName("");
        setShowAddCategory(false);
      }
    } catch {}
  };

  // Attribute Operations
  const handleAddAttribute = () => {
    setAttributes((prev) => [
      ...prev,
      {
        name: `Attribute ${prev.length + 1}`,
        options: [],
        visible: true,
        variation: productType === "variable",
      },
    ]);
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateAttribute = (index: number, updates: Partial<ProductAttribute>) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  // Auto-generate variations matrix from attributes
  const handleGenerateVariations = () => {
    const variationAttributes = attributes.filter((a) => a.variation && a.options.length > 0);
    if (variationAttributes.length === 0) {
      setError("Please add at least one attribute marked 'Used for variations' with options.");
      return;
    }

    const cartesian = (arrays: string[][]): string[][] => {
      return arrays.reduce<string[][]>(
        (acc, curr) => acc.flatMap((x) => curr.map((y) => [...x, y])),
        [[]]
      );
    };

    const optionsLists = variationAttributes.map((a) => a.options);
    const combinations = cartesian(optionsLists);

    const newVariations = combinations.map((combo, idx) => {
      const varAttrs: ProductVariationAttribute[] = combo.map((opt, i) => ({
        name: variationAttributes[i].name,
        option: opt,
      }));

      const comboName = combo.join(" - ");
      const autoSku = sku ? `${sku}-${combo.map((c) => c.replace(/\s+/g, "").toUpperCase()).join("-")}` : "";

      return {
        tempId: `var_${Date.now()}_${idx}`,
        sku: autoSku,
        regular_price: regularPrice || "0",
        sale_price: salePrice || "",
        stock_status: "instock" as StockStatus,
        manage_stock: manageStock,
        stock_quantity: manageStock ? 50 : null,
        virtual,
        downloadable,
        image: featuredImageUrl ? { src: featuredImageUrl } : undefined,
        attributes: varAttrs,
        description: `${name} (${comboName})`,
        expanded: false,
      };
    });

    setVariations(newVariations);
    setActiveTab("variations");
  };

  const handleAddSingleVariation = () => {
    const defaultAttrs: ProductVariationAttribute[] = attributes
      .filter((a) => a.variation && a.options.length > 0)
      .map((a) => ({ name: a.name, option: a.options[0] }));

    setVariations((prev) => [
      ...prev,
      {
        tempId: `var_${Date.now()}_${prev.length}`,
        sku: sku ? `${sku}-VAR${prev.length + 1}` : "",
        regular_price: regularPrice || "0",
        sale_price: "",
        stock_status: "instock",
        manage_stock: false,
        stock_quantity: null,
        virtual: false,
        downloadable: false,
        image: featuredImageUrl ? { src: featuredImageUrl } : undefined,
        attributes: defaultAttrs,
        expanded: true,
      },
    ]);
  };

  const handleRemoveVariation = (tempId: string) => {
    setVariations((prev) => prev.filter((v) => v.tempId !== tempId));
  };

  const handleUpdateVariation = (
    tempId: string,
    updates: Partial<CreateVariationPayload & { expanded?: boolean }>
  ) => {
    setVariations((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, ...updates } : v))
    );
  };

  // Submit Product Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product title is required.");
      return;
    }

    setLoading(true);
    setError(null);

    // Build Images Array
    const imagesPayload: Array<{ src: string }> = [];
    if (featuredImageUrl.trim()) {
      imagesPayload.push({ src: featuredImageUrl.trim() });
    }
    galleryUrls.forEach((url) => {
      if (url.trim() && url.trim() !== featuredImageUrl.trim()) {
        imagesPayload.push({ src: url.trim() });
      }
    });

    const dimensionsPayload =
      length || width || height
        ? {
            length: length.trim(),
            width: width.trim(),
            height: height.trim(),
          }
        : undefined;

    const payload = {
      name: name.trim(),
      slug: slug.trim() || undefined,
      type: productType,
      status,
      featured,
      catalog_visibility: catalogVisibility,
      description: description || undefined,
      short_description: shortDescription || undefined,
      sku: sku.trim() || undefined,
      regular_price: productType === "variable" ? undefined : regularPrice || undefined,
      sale_price: productType === "variable" ? undefined : salePrice || undefined,
      date_on_sale_from: dateOnSaleFrom || null,
      date_on_sale_to: dateOnSaleTo || null,
      virtual,
      downloadable,
      downloads: downloadable && downloads.length > 0 ? downloads : undefined,
      external_url: productType === "external" ? externalUrl : undefined,
      button_text: productType === "external" ? buttonText : undefined,
      tax_status: taxStatus,
      tax_class: taxClass,
      manage_stock: productType === "variable" ? false : manageStock,
      stock_quantity:
        !manageStock || stockQuantity === "" ? null : parseInt(String(stockQuantity), 10),
      stock_status: stockStatus,
      backorders,
      low_stock_amount: lowStockAmount !== "" ? parseInt(String(lowStockAmount), 10) : null,
      sold_individually: soldIndividually,
      weight: weight.trim() || undefined,
      dimensions: dimensionsPayload,
      shipping_class: shippingClass || undefined,
      reviews_allowed: reviewsAllowed,
      upsell_ids: upsellIds.length > 0 ? upsellIds : undefined,
      cross_sell_ids: crossSellIds.length > 0 ? crossSellIds : undefined,
      purchase_note: purchaseNote.trim() || undefined,
      menu_order: Number(menuOrder) || 0,
      categories: selectedCategoryIds.map((id) => ({ id })),
      tags: selectedTags.map((tName) => ({ name: tName })),
      images: imagesPayload.length > 0 ? imagesPayload : undefined,
      attributes: attributes.length > 0 ? attributes : undefined,
      variations_data:
        productType === "variable" && variations.length > 0
          ? variations.map(({ tempId, expanded, ...rest }) => rest)
          : undefined,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create product.");
      }

      setCreatedProductId(json.data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product creation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (createdProductId) {
    return (
      <div className="flex-1 w-full max-w-xl mx-auto px-4 py-16">
        <Card className="border-emerald-200 bg-emerald-50 text-center p-8">
          <div className="flex flex-col items-center">
            <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <StatusBadge status="Product Published" variant="emerald" />
            <h2 className="mt-4 text-xl font-extrabold text-[#18181b] font-mono">
              Product #{createdProductId} Published Successfully
            </h2>
            <p className="text-xs text-emerald-800 mt-1">
              The product is now live on your WooCommerce store at fixionfuel.shop.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-6">
            <Link
              href={`/products/${createdProductId}`}
              className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-[#18181b] hover:bg-black text-white transition-colors shadow-sm"
            >
              View & Edit Product
            </Link>
            <button
              onClick={() => {
                setCreatedProductId(null);
                setName("");
                setSku("");
                setRegularPrice("");
                setSalePrice("");
                setDescription("");
                setShortDescription("");
                setFeaturedImageUrl("");
                setGalleryUrls([]);
                setVariations([]);
              }}
              className="px-5 py-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-sm"
            >
              Add Another Product
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden px-4 sm:px-8 lg:px-10 py-5 sm:py-8 flex flex-col gap-6 font-sans">
      {/* Hidden File Inputs for Phone/PC Gallery Triggering */}
      <input
        ref={primaryFileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePrimaryFileSelect}
        className="hidden"
      />
      <input
        ref={galleryFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleGalleryFilesSelect}
        className="hidden"
      />

      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col gap-2 pb-4 border-b border-[#eaedf2]">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Catalog
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#18181b]">
              Add New Product
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Create and publish simple or variable products directly to WooCommerce.
            </p>
          </div>
          <StatusBadge status="WooCommerce REST Sync" variant="blue" />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-800">
            ✕
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ============================================================== */}
        {/* LEFT COLUMN: Main Product Details & Dynamic Tab Panels (2 Cols)*/}
        {/* ============================================================== */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Title & Basic Overview */}
          <Card>
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Product Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. EPITHALON 10MG Peptide Vial"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 font-semibold transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Product Full Description
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed product information, benefits, dosage specifications, purity, and clinical research data..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-y font-mono text-[11px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* ============================================================== */}
          {/* DYNAMIC PRODUCT DATA ENGINE (WooCommerce Tabs Architecture) */}
          {/* ============================================================== */}
          <div className="rounded-[24px] border border-[#eaedf2] bg-white shadow-sm overflow-hidden">
            {/* Product Type Header Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/80 border-b border-[#eaedf2]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-700">Product data:</span>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                >
                  <option value="simple">Simple product</option>
                  <option value="variable">Variable product</option>
                  <option value="grouped">Grouped product</option>
                  <option value="external">External/Affiliate product</option>
                </select>
              </div>

              {/* Virtual / Downloadable check switches */}
              {productType === "simple" && (
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={virtual}
                      onChange={(e) => setVirtual(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                    />
                    <span>Virtual</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={downloadable}
                      onChange={(e) => setDownloadable(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-3.5 h-3.5"
                    />
                    <span>Downloadable</span>
                  </label>
                </div>
              )}
            </div>

            {/* Tabs Container */}
            <div className="flex flex-col md:flex-row min-h-[380px]">
              {/* Left Tab Buttons */}
              <div className="w-full md:w-48 bg-slate-50/50 border-b md:border-b-0 md:border-r border-[#eaedf2] flex md:flex-col overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "general"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <span>🏷️</span> General
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("inventory")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "inventory"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <span>📊</span> Inventory
                </button>

                {!virtual && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("shipping")}
                    className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                      activeTab === "shipping"
                        ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                    }`}
                  >
                    <span>🚚</span> Shipping
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("linked")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "linked"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <span>🔗</span> Linked Products
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("attributes")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "attributes"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <span>🎨</span> Attributes
                </button>

                {productType === "variable" && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("variations")}
                    className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center justify-between gap-2 whitespace-nowrap ${
                      activeTab === "variations"
                        ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>🧬</span> Variations
                    </div>
                    {variations.length > 0 && (
                      <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                        {variations.length}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("advanced")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "advanced"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/60"
                  }`}
                >
                  <span>⚙️</span> Advanced
                </button>
              </div>

              {/* Right Tab Content Panel */}
              <div className="flex-1 p-5 sm:p-6">
                {/* 1. GENERAL TAB */}
                {activeTab === "general" && (
                  <div className="space-y-4">
                    {productType !== "variable" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Regular price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={regularPrice}
                            onChange={(e) => setRegularPrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Sale price ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={salePrice}
                            onChange={(e) => setSalePrice(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                          />
                        </div>
                      </div>
                    )}

                    {productType === "variable" && (
                      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-blue-800">
                        <p className="font-bold">Variable Product Pricing</p>
                        <p className="mt-1 text-[11px]">
                          Prices for variable products are managed individually inside the <strong>Variations</strong> tab for each size, dose, or bundle.
                        </p>
                      </div>
                    )}

                    {productType === "external" && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Product URL
                          </label>
                          <input
                            type="url"
                            value={externalUrl}
                            onChange={(e) => setExternalUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">
                            Button Text
                          </label>
                          <input
                            type="text"
                            value={buttonText}
                            onChange={(e) => setButtonText(e.target.value)}
                            placeholder="Buy product"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Tax status
                        </label>
                        <select
                          value={taxStatus}
                          onChange={(e) => setTaxStatus(e.target.value as TaxStatus)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                        >
                          <option value="taxable">Taxable</option>
                          <option value="shipping">Shipping only</option>
                          <option value="none">None</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Tax class
                        </label>
                        <select
                          value={taxClass}
                          onChange={(e) => setTaxClass(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white"
                        >
                          <option value="standard">Standard</option>
                          <option value="reduced-rate">Reduced rate</option>
                          <option value="zero-rate">Zero rate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. INVENTORY TAB */}
                {activeTab === "inventory" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        SKU (Stock Keeping Unit)
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        placeholder="e.g. EP10SIN"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:bg-white"
                      />
                    </div>

                    {productType !== "variable" && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id="manage_stock_check"
                            checked={manageStock}
                            onChange={(e) => setManageStock(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                          />
                          <label htmlFor="manage_stock_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                            Track stock quantity for this product
                          </label>
                        </div>

                        {manageStock && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(e.target.value)}
                                placeholder="100"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Allow Backorders
                              </label>
                              <select
                                value={backorders}
                                onChange={(e) => setBackorders(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                              >
                                <option value="no">Do not allow</option>
                                <option value="notify">Allow, but notify</option>
                                <option value="yes">Allow</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Low Stock Alert
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={lowStockAmount}
                                onChange={(e) => setLowStockAmount(e.target.value)}
                                placeholder="5"
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                              />
                            </div>
                          </div>
                        )}

                        {!manageStock && (
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                              Stock status
                            </label>
                            <select
                              value={stockStatus}
                              onChange={(e) => setStockStatus(e.target.value as StockStatus)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                            >
                              <option value="instock">In stock</option>
                              <option value="outofstock">Out of stock</option>
                              <option value="onbackorder">On backorder</option>
                            </select>
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <input
                        type="checkbox"
                        id="sold_individually_check"
                        checked={soldIndividually}
                        onChange={(e) => setSoldIndividually(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 w-4 h-4 cursor-pointer"
                      />
                      <label htmlFor="sold_individually_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                        Sold individually (Limit purchases to 1 item per order)
                      </label>
                    </div>
                  </div>
                )}

                {/* 3. SHIPPING TAB */}
                {activeTab === "shipping" && !virtual && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Weight (kg / lbs)
                      </label>
                      <input
                        type="text"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        placeholder="0.25"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Dimensions (L × W × H) (cm / in)
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={length}
                          onChange={(e) => setLength(e.target.value)}
                          placeholder="Length"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={width}
                          onChange={(e) => setWidth(e.target.value)}
                          placeholder="Width"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                        <input
                          type="text"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          placeholder="Height"
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Shipping class
                      </label>
                      <select
                        value={shippingClass}
                        onChange={(e) => setShippingClass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                      >
                        <option value="">No shipping class</option>
                        <option value="standard">Standard Shipping</option>
                        <option value="express">Express Courier</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* 4. LINKED PRODUCTS TAB */}
                {activeTab === "linked" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Search store products to link:
                      </label>
                      <input
                        type="text"
                        value={searchProductQuery}
                        onChange={(e) => setSearchProductQuery(e.target.value)}
                        placeholder="Type product name to search..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                      />
                      {searchedProducts.length > 0 && (
                        <div className="mt-2 border border-slate-200 rounded-xl p-2 bg-white space-y-1 shadow-sm">
                          {searchedProducts.map((p) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-xs"
                            >
                              <span className="font-semibold">{p.name} (#{p.id})</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!upsellIds.includes(p.id)) setUpsellIds([...upsellIds, p.id]);
                                    setSearchProductQuery("");
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px]"
                                >
                                  + Upsell
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!crossSellIds.includes(p.id)) setCrossSellIds([...crossSellIds, p.id]);
                                    setSearchProductQuery("");
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-bold text-[10px]"
                                >
                                  + Cross-sell
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-800">Upsells ({upsellIds.length})</span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {upsellIds.map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs">
                              Product #{id}
                              <button
                                type="button"
                                onClick={() => setUpsellIds(upsellIds.filter((x) => x !== id))}
                                className="text-rose-500 font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-800">Cross-sells ({crossSellIds.length})</span>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {crossSellIds.map((id) => (
                            <span key={id} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-xs">
                              Product #{id}
                              <button
                                type="button"
                                onClick={() => setCrossSellIds(crossSellIds.filter((x) => x !== id))}
                                className="text-rose-500 font-bold"
                              >
                                ✕
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. ATTRIBUTES TAB */}
                {activeTab === "attributes" && (
                  <div className="space-y-4">
                    {/* STORE PRESETS QUICK SELECTOR */}
                    <div className="p-3.5 bg-indigo-50/80 border border-indigo-100 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                          <span>⚡</span> Store Attribute Presets (One-Click Apply)
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                          Live Store Attributes
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-900/80">
                        Click any preset below to instantly load standard attributes used on FixionFuel:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {attributePresets.map((preset, pIdx) => (
                          <button
                            key={pIdx}
                            type="button"
                            onClick={() => {
                              const cleanName = preset.name.split("(")[0].trim() || preset.name;
                              setAttributes([
                                {
                                  name: cleanName,
                                  options: preset.options,
                                  visible: true,
                                  variation: true,
                                },
                              ]);
                            }}
                            className="px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-950 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <span>✨</span>
                            <span>{preset.name}</span>
                            <span className="opacity-60 text-[10px] font-mono">({preset.options.length} options)</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">Custom & Global Attributes</h4>
                        <p className="text-[11px] text-slate-500">
                          Add or customize attributes for this product.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAttribute}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-black text-white transition-colors"
                      >
                        + Add Attribute
                      </button>
                    </div>

                    <div className="space-y-3">
                      {attributes.map((attr, idx) => (
                        <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={attr.name}
                              onChange={(e) => handleUpdateAttribute(idx, { name: e.target.value })}
                              placeholder="Attribute Name (e.g. Size, Dose)"
                              className="font-bold text-xs bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-1/2"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAttribute(idx)}
                              className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                            >
                              Remove
                            </button>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Values (Separate options with &quot; | &quot; pipe symbol)
                            </label>
                            <input
                              type="text"
                              value={attr.options.join(" | ")}
                              onChange={(e) => {
                                const raw = e.target.value;
                                const parsed = raw.split("|").map((s) => s.trim()).filter(Boolean);
                                handleUpdateAttribute(idx, { options: parsed });
                              }}
                              placeholder="SINGLE | 1/2 KITS (5 VIALS) | FULL KITS (10 VIALS)"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-6 pt-1">
                            <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={attr.visible ?? true}
                                onChange={(e) => handleUpdateAttribute(idx, { visible: e.target.checked })}
                                className="rounded border-slate-300 text-slate-900 w-3.5 h-3.5"
                              />
                              <span>Visible on product page</span>
                            </label>

                            {productType === "variable" && (
                              <label className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={attr.variation ?? true}
                                  onChange={(e) => handleUpdateAttribute(idx, { variation: e.target.checked })}
                                  className="rounded border-indigo-400 text-indigo-600 w-3.5 h-3.5"
                                />
                                <span>Used for variations</span>
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {productType === "variable" && (
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleGenerateVariations}
                          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                        >
                          ⚡ Generate Variations Matrix from Attributes
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. VARIATIONS TAB (Variable Product Engine with Accordion & Gallery Pickers) */}
                {activeTab === "variations" && productType === "variable" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Product Variations ({variations.length})
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Click any variation row to expand and edit photos, price, SKU, or stock.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {variations.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setVariations((prev) => prev.map((v) => ({ ...v, expanded: true })))}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                            >
                              ▼ Expand All
                            </button>
                            <button
                              type="button"
                              onClick={() => setVariations((prev) => prev.map((v) => ({ ...v, expanded: false })))}
                              className="px-2.5 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer"
                            >
                              ▲ Collapse All
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleAddSingleVariation}
                          className="px-3 py-1.5 text-[11px] font-bold rounded-xl bg-slate-900 hover:bg-black text-white cursor-pointer"
                        >
                          + Add Variation
                        </button>
                      </div>
                    </div>

                    {variations.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                        <span className="text-4xl">🧬</span>
                        <h5 className="text-xs font-bold text-slate-800">No Variations Generated Yet</h5>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          FixionFuel standard attribute <strong>SIZE (SINGLE, 1/2 KITS, FULL KITS)</strong> is ready.
                        </p>
                        <button
                          type="button"
                          onClick={handleGenerateVariations}
                          className="mt-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all cursor-pointer"
                        >
                          ⚡ Load Standard Variations (3)
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {variations.map((v, vIdx) => {
                          const title =
                            v.attributes.map((a) => `${a.name}: ${a.option}`).join(", ") ||
                            `Variation #${vIdx + 1}`;

                          return (
                            <div
                              key={v.tempId}
                              className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden transition-all"
                            >
                              {/* Accordion Row Header Bar (Click to Expand / Collapse) */}
                              <div
                                onClick={() => handleUpdateVariation(v.tempId, { expanded: !v.expanded })}
                                className="p-3 bg-slate-50/90 hover:bg-slate-100/90 flex items-center justify-between gap-3 cursor-pointer transition-colors select-none"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Small Thumbnail */}
                                  <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden border border-slate-300 shrink-0 flex items-center justify-center relative">
                                    {v.image?.src ? (
                                      <img
                                        src={v.image.src}
                                        alt={title}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-xs text-slate-400">🖼️</span>
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-xs font-extrabold text-slate-900">{title}</span>
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                                        {v.regular_price ? `$${v.regular_price}` : "Set Price"}
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${v.stock_status === "instock" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                        {v.stock_status || "instock"}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                      SKU: {v.sku || "Auto"} • Click to {v.expanded ? "collapse" : "expand details"}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-600 px-2.5 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50">
                                    {v.expanded ? "▲ Close" : "▼ Expand"}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemoveVariation(v.tempId);
                                    }}
                                    className="text-xs text-rose-500 hover:text-rose-700 font-bold p-1 hover:bg-rose-50 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>

                              {/* Accordion Expanded Body */}
                              {v.expanded && (
                                <div className="p-4 space-y-4 border-t border-slate-100 bg-white">
                                  {/* Variation Individual Image Picker (Phone / PC Gallery) */}
                                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                    <label className="block text-xs font-bold text-slate-800 mb-1.5">
                                      📸 Variation Photo (Upload from Phone/PC Gallery)
                                    </label>
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl cursor-pointer shadow-sm active:scale-95 transition-all">
                                        <span>🖼️ Choose Photo from Gallery</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                              handleVariationFileSelect(v.tempId, e.target.files[0]);
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>

                                      <input
                                        type="url"
                                        value={v.image?.src || ""}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.tempId, {
                                            image: e.target.value.trim() ? { src: e.target.value.trim() } : undefined,
                                          })
                                        }
                                        placeholder="Or paste image URL..."
                                        className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                                      />

                                      {v.image?.src && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateVariation(v.tempId, { image: undefined })}
                                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold"
                                        >
                                          Remove Photo
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Variation Pricing & SKU */}
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Variation SKU
                                      </label>
                                      <input
                                        type="text"
                                        value={v.sku}
                                        onChange={(e) => handleUpdateVariation(v.tempId, { sku: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Regular price ($) <span className="text-rose-500">*</span>
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={v.regular_price}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.tempId, { regular_price: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Sale price ($)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={v.sale_price}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.tempId, { sale_price: e.target.value })
                                        }
                                        placeholder="0.00"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                                      />
                                    </div>
                                  </div>

                                  {/* Variation Stock */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Stock status
                                      </label>
                                      <select
                                        value={v.stock_status}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.tempId, {
                                            stock_status: e.target.value as StockStatus,
                                          })
                                        }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs"
                                      >
                                        <option value="instock">In stock</option>
                                        <option value="outofstock">Out of stock</option>
                                        <option value="onbackorder">On backorder</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Stock quantity
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        value={v.stock_quantity ?? ""}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.tempId, {
                                            manage_stock: Boolean(e.target.value),
                                            stock_quantity: e.target.value !== "" ? parseInt(e.target.value, 10) : null,
                                          })
                                        }
                                        placeholder="Leave empty if not tracked"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 7. ADVANCED TAB */}
                {activeTab === "advanced" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Purchase note (sent to customer after order)
                      </label>
                      <textarea
                        rows={3}
                        value={purchaseNote}
                        onChange={(e) => setPurchaseNote(e.target.value)}
                        placeholder="Special storage guidelines, research instructions..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5">
                          Menu order (listing position)
                        </label>
                        <input
                          type="number"
                          value={menuOrder}
                          onChange={(e) => setMenuOrder(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="enable_reviews_check"
                          checked={reviewsAllowed}
                          onChange={(e) => setReviewsAllowed(e.target.checked)}
                          className="rounded border-slate-300 text-slate-900 w-4 h-4 cursor-pointer"
                        />
                        <label htmlFor="enable_reviews_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                          Enable customer product reviews
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Short Description Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extrabold text-[#18181b]">
                Product Short Description (Excerpt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={3}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Brief summary shown on catalog cards and quick views..."
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:bg-white resize-none"
              />
            </CardContent>
          </Card>
        </div>

        {/* ============================================================== */}
        {/* RIGHT COLUMN: Media Gallery, Taxonomy & Publish (1 Col) */}
        {/* ============================================================== */}
        <div className="space-y-6">
          {/* Publish Action Card */}
          <Card className="border-slate-300 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Publishing Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProductStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                >
                  <option value="publish">Published (Live in Store)</option>
                  <option value="draft">Draft (Private)</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Catalog visibility
                </label>
                <select
                  value={catalogVisibility}
                  onChange={(e) => setCatalogVisibility(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
                >
                  <option value="visible">Shop and search results</option>
                  <option value="catalog">Shop only</option>
                  <option value="search">Search only</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="featured_product_check"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="featured_product_check" className="text-xs font-bold text-slate-800 cursor-pointer">
                  ⭐ Mark as Featured Product
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Publish Product to Store</span>
              </button>
            </CardContent>
          </Card>

          {/* Featured Primary Image Card (Phone & PC Gallery Picker) */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Primary Product Image
              </CardTitle>
              <div className="flex gap-1 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setImageInputMode("gallery")}
                  className={`px-2 py-0.5 rounded ${imageInputMode === "gallery" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  Gallery
                </button>
                <button
                  type="button"
                  onClick={() => setImageInputMode("url")}
                  className={`px-2 py-0.5 rounded ${imageInputMode === "url" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  URL
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {featuredImageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 group">
                  <img
                    src={featuredImageUrl}
                    alt="Featured preview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => primaryFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-bold shadow"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeaturedImageUrl("")}
                      className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => primaryFileInputRef.current?.click()}
                  className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-slate-400 p-6 text-center bg-slate-50/60 hover:bg-slate-100/60 cursor-pointer transition-colors"
                >
                  <span className="text-3xl">📸</span>
                  <p className="text-xs font-bold text-slate-800 mt-2">
                    Choose from Phone / PC Gallery
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Click to open your device photo gallery or file explorer
                  </p>
                  <button
                    type="button"
                    className="mt-3 px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 pointer-events-none"
                  >
                    <span>Browse Device Photos</span>
                  </button>
                </div>
              )}

              {imageInputMode === "url" && (
                <div>
                  <input
                    type="url"
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    placeholder="https://fixionfuel.shop/wp-content/uploads/..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Multi-Image Gallery Card (Only for Simple / Non-Variable Products) */}
          {productType !== "variable" && (
            <Card>
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Product Image Gallery ({galleryUrls.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {galleryUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryUrls.map((url, gIdx) => (
                      <div
                        key={gIdx}
                        className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 group"
                      >
                        <img
                          src={url}
                          alt={`Gallery ${gIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(gIdx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white text-[10px] transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Multiple Photos Button */}
                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                >
                  <span>📸 Select Multiple Photos from Gallery</span>
                </button>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <input
                    type="url"
                    value={newGalleryInput}
                    onChange={(e) => setNewGalleryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddGalleryImage();
                      }
                    }}
                    placeholder="Or paste extra photo URL..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl"
                  >
                    + Add URL
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Product Categories Card */}
          <Card>
            <CardHeader className="pb-2.5 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>📁</span>
                <span>Categories</span>
              </CardTitle>

              <div className="flex items-center gap-2">
                <Link
                  href="/products/categories"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all shadow-2xs group"
                  title="Open Taxonomy Manager to Edit, Update, or Delete Categories"
                >
                  <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-black transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  <span>Edit Categories</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-slate-900 hover:bg-black text-white transition-all shadow-2xs"
                >
                  + Add
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              {showAddCategory && (
                <div className="flex gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="New category name..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="px-2.5 py-1 bg-slate-900 text-white text-[11px] font-bold rounded-lg"
                  >
                    Save
                  </button>
                </div>
              )}

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading categories...</p>
                ) : (
                  categories.map((c) => {
                    const isChecked = selectedCategoryIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategoryIds((prev) => [...prev, c.id]);
                            } else {
                              setSelectedCategoryIds((prev) => prev.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded border-slate-300 text-slate-900 w-3.5 h-3.5"
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Product Tags Card */}
          <Card>
            <CardHeader className="pb-2.5 border-b border-slate-100 flex flex-row items-center justify-between gap-2">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span>🏷️</span>
                <span>Product Tags</span>
              </CardTitle>

              <Link
                href="/products/categories"
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 rounded-xl transition-all shadow-2xs group"
                title="Open Taxonomy Manager to Edit, Update, or Delete Tags"
              >
                <svg className="w-3.5 h-3.5 text-slate-700 group-hover:text-black transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>Edit Tags</span>
              </Link>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddTag(tagInput);
                    }
                  }}
                  placeholder="e.g. anti-aging, peptide"
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                >
                  Add
                </button>
              </div>

              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                        className="text-slate-400 hover:text-rose-600 font-extrabold"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
