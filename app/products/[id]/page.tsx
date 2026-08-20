"use client";

import React, { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Product,
  ProductCategory,
  ProductTag,
  ProductType,
  ProductStatus,
  StockStatus,
  TaxStatus,
  ProductAttribute,
  ProductVariation,
} from "@/types";
import { ProductStockBadge } from "@/components/products/product-stock-badge";
import { OrderConfirmModal } from "@/components/orders/order-confirm-modal";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

type ActiveTab = "general" | "inventory" | "shipping" | "linked" | "attributes" | "variations" | "advanced";

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

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const productId = parseInt(resolvedParams.id, 10);
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // File Input References
  const primaryFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>("general");

  // Basic Information
  const [name, setName] = useState("");
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

  // Categories & Tags
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // General Tab
  const [regularPrice, setRegularPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [taxStatus, setTaxStatus] = useState<TaxStatus>("taxable");
  const [taxClass, setTaxClass] = useState("standard");
  const [externalUrl, setExternalUrl] = useState("");
  const [buttonText, setButtonText] = useState("");

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

  // Attributes & Variations
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [variations, setVariations] = useState<
    Array<ProductVariation & { tempId?: string; expanded?: boolean }>
  >([]);

  // Advanced Tab
  const [purchaseNote, setPurchaseNote] = useState("");
  const [menuOrder, setMenuOrder] = useState<number>(0);
  const [reviewsAllowed, setReviewsAllowed] = useState(true);

  // Load product, categories, tags & variations
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionJson = await sessionRes.json();
        if (!sessionJson.data?.authenticated) {
          router.push(`/login?from=/products/${productId}`);
          return;
        }

        const role = sessionJson.data?.user?.role || "admin";
        setUserRole(role);

        const [prodRes, catRes, tagRes] = await Promise.all([
          fetch(`/api/products/${productId}`),
          fetch("/api/products/categories"),
          fetch("/api/products/tags"),
        ]);

        if (!ignore) {
          if (prodRes.status === 401) {
            router.push(`/login?from=/products/${productId}`);
            return;
          }

          const prodJson = await prodRes.json();
          if (!prodRes.ok || !prodJson.success) {
            throw new Error(prodJson.error?.message || "Failed to load product.");
          }

          const p: Product = prodJson.data;
          setProduct(p);
          setName(p.name || "");
          setProductType(p.type || "simple");
          setStatus(p.status || "publish");
          setFeatured(Boolean(p.featured));
          setCatalogVisibility(p.catalog_visibility || "visible");
          setVirtual(Boolean(p.virtual));
          setDownloadable(Boolean(p.downloadable));
          setSku(p.sku || "");
          setRegularPrice(p.regular_price || p.price || "");
          setSalePrice(p.sale_price || "");
          setDescription(p.description || "");
          setShortDescription(p.short_description || "");
          setTaxStatus(p.tax_status || "taxable");
          setTaxClass(p.tax_class || "standard");
          setExternalUrl(p.external_url || "");
          setButtonText(p.button_text || "");
          setManageStock(Boolean(p.manage_stock));
          setStockQuantity(p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : "");
          setStockStatus(p.stock_status || "instock");
          setBackorders(p.backorders || "no");
          setLowStockAmount(p.low_stock_amount !== null && p.low_stock_amount !== undefined ? p.low_stock_amount : "");
          setSoldIndividually(Boolean(p.sold_individually));
          setWeight(p.weight || "");
          setLength(p.dimensions?.length || "");
          setWidth(p.dimensions?.width || "");
          setHeight(p.dimensions?.height || "");
          setShippingClass(p.shipping_class || "");
          setPurchaseNote(p.purchase_note || "");
          setMenuOrder(p.menu_order || 0);
          setReviewsAllowed(p.reviews_allowed ?? true);

          // Images
          if (p.images && p.images.length > 0) {
            setFeaturedImageUrl(p.images[0]?.src || "");
            setGalleryUrls(p.images.slice(1).map((img) => img.src));
          }

          // Categories & Tags
          setSelectedCategoryIds(p.categories ? p.categories.map((c) => c.id) : []);
          setSelectedTags(p.tags ? p.tags.map((t) => t.name) : []);

          // Attributes
          setAttributes(p.attributes || []);

          // If Variable Product, load live variations
          if (p.type === "variable") {
            fetch(`/api/products/${productId}/variations`)
              .then((res) => res.json())
              .then((vJson) => {
                if (vJson.success && Array.isArray(vJson.data)) {
                  setVariations(vJson.data);
                }
              })
              .catch(() => {});
          }

          const catJson = await catRes.json();
          if (catJson.success && Array.isArray(catJson.data)) setCategories(catJson.data);

          const tagJson = await tagRes.json();
          if (tagJson.success && Array.isArray(tagJson.data)) setTags(tagJson.data);

          setLoading(false);
        }
      } catch (err: unknown) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load product.");
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [productId, router]);

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

  // Gallery handlers
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
      console.error(err);
    }
    if (primaryFileInputRef.current) primaryFileInputRef.current.value = "";
  };

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
      console.error(err);
    }
    if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
  };

  const handleAddGalleryImage = () => {
    if (!newGalleryInput.trim()) return;
    setGalleryUrls((prev) => [...prev, newGalleryInput.trim()]);
    setNewGalleryInput("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Attribute handlers
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

  const handleUpdateAttribute = (index: number, updates: Partial<ProductAttribute>) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  // Variation handlers
  const handleUpdateVariation = (
    variationId: number,
    updates: Partial<ProductVariation & { expanded?: boolean }>
  ) => {
    setVariations((prev) =>
      prev.map((v) => (v.id === variationId ? { ...v, ...updates } : v))
    );
  };

  const handleVariationFileSelect = async (variationId: number, file: File) => {
    try {
      const dataUrl = await readFileAsDataUrl(file);
      handleUpdateVariation(variationId, { image: { id: 0, src: dataUrl } as unknown as ProductVariation["image"] });
      const liveUrl = await uploadClientFile(file);
      handleUpdateVariation(variationId, { image: { id: 0, src: liveUrl } as unknown as ProductVariation["image"] });
    } catch (err) {
      console.error("Error setting variation image:", err);
    }
  };

  // Category Creation Handler
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreatingCategory(true);
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
    } catch (err) {
      console.error("Failed to create category", err);
    } finally {
      setCreatingCategory(false);
    }
  };

  // Tag Handlers
  const handleAddTag = (rawTag: string) => {
    const trimmed = rawTag.trim();
    if (!trimmed) return;
    if (!selectedTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedTags((prev) => [...prev, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Save changes
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product title is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const imagesPayload: Array<{ src: string }> = [];
    if (featuredImageUrl.trim()) {
      imagesPayload.push({ src: featuredImageUrl.trim() });
    }
    galleryUrls.forEach((url) => {
      if (url.trim() && url.trim() !== featuredImageUrl.trim()) {
        imagesPayload.push({ src: url.trim() });
      }
    });

    const payload = {
      name: name.trim(),
      type: productType,
      status,
      featured,
      catalog_visibility: catalogVisibility,
      description: description || undefined,
      short_description: shortDescription || undefined,
      sku: sku.trim() || undefined,
      regular_price: productType === "variable" ? undefined : regularPrice || undefined,
      sale_price: productType === "variable" ? undefined : salePrice || undefined,
      virtual,
      downloadable,
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
      dimensions:
        length || width || height
          ? { length: length.trim(), width: width.trim(), height: height.trim() }
          : undefined,
      shipping_class: shippingClass || undefined,
      reviews_allowed: reviewsAllowed,
      purchase_note: purchaseNote.trim() || undefined,
      menu_order: Number(menuOrder) || 0,
      categories: selectedCategoryIds.map((id) => ({ id })),
      tags: selectedTags.map((tName) => ({ name: tName })),
      images: imagesPayload.length > 0 ? imagesPayload : undefined,
      attributes: attributes.length > 0 ? attributes : undefined,
    };

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update product.");
      }

      // Sync variations updates if variable product
      if (productType === "variable" && variations.length > 0) {
        const variationUpdates = variations
          .filter((v) => v.id)
          .map((v) => ({
            id: v.id,
            regular_price: v.regular_price || v.price || undefined,
            sale_price: v.sale_price || undefined,
            sku: v.sku || undefined,
            stock_status: v.stock_status,
            manage_stock: v.manage_stock,
            stock_quantity: v.stock_quantity,
            image: v.image?.src ? { src: v.image.src } : undefined,
          }));

        if (variationUpdates.length > 0) {
          try {
            await fetch(`/api/products/${productId}/variations`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ update: variationUpdates }),
            });
          } catch (varErr) {
            console.error("Failed to update variations:", varErr);
          }
        }
      }

      setProduct(json.data);
      setSuccess("Product specifications & variations updated and synced with WooCommerce!");
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete product.");
      }

      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Loading product specifications...</p>
        </div>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="flex-1 max-w-xl mx-auto px-4 py-12">
        <Card className="border-rose-200 bg-rose-50 text-center p-8">
          <CardHeader>
            <CardTitle className="text-rose-900">Product Unavailable</CardTitle>
            <p className="text-xs text-rose-800 mt-1 max-w-md mx-auto">{error}</p>
          </CardHeader>
          <CardContent className="flex justify-center gap-3">
            <Link
              href="/products"
              className="px-4 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors"
            >
              Back to Catalog
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-full overflow-x-hidden px-4 sm:px-8 lg:px-10 py-5 sm:py-8 flex flex-col gap-6 font-sans">
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

      {/* Navigation & Header */}
      <div className="flex flex-col gap-3 pb-4 border-b border-[#eaedf2]">
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Product Catalog
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold tracking-tight text-[#18181b]">
                {product?.name}
              </h1>
              {product && (
                <>
                  <ProductStockBadge
                    stockStatus={product.stock_status}
                    stockQuantity={product.stock_quantity}
                  />
                  {product.date_created &&
                    Date.now() - new Date(product.date_created).getTime() <=
                      30 * 24 * 60 * 60 * 1000 && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold uppercase tracking-wider shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        New Arrived
                      </span>
                    )}
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              WooCommerce ID: <span className="font-mono text-slate-800 font-bold">#{productId}</span> • Current Price:{" "}
              <strong className="text-slate-900 font-mono font-extrabold">
                {formatCurrency(product?.price || product?.regular_price || "0")}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {userRole === "staff" && (
              <Link
                href="/orders/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95"
              >
                <span>🛒 Create Order with this Item</span>
              </Link>
            )}

            {product?.permalink && (
              <a
                href={product.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-sm"
              >
                <span>View in Live Store</span>
                <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-800">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-bold text-emerald-800">
          ✓ {success}
        </div>
      )}

      {/* SALES REP PRODUCT PRESENTATION SHOWCASE (READ-ONLY) */}
      {userRole === "staff" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Imagery & Fast Order Box */}
          <div className="space-y-6">
            <Card className="rounded-[28px] overflow-hidden border border-slate-200 shadow-2xs">
              <div className="relative aspect-square bg-slate-50 border-b border-slate-100 flex items-center justify-center p-4">
                {featuredImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={featuredImageUrl}
                    alt={product?.name || "Product Image"}
                    className="w-full h-full object-contain drop-shadow-md rounded-2xl"
                  />
                ) : (
                  <div className="text-slate-300 text-6xl">📦</div>
                )}

                {product?.on_sale && (
                  <div className="absolute top-3 left-3 bg-rose-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-xl shadow-xs">
                    On Sale
                  </div>
                )}
              </div>

              {/* Gallery Thumbnails */}
              {galleryUrls.length > 0 && (
                <CardContent className="p-4 flex gap-2 overflow-x-auto">
                  {galleryUrls.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setFeaturedImageUrl(url)}
                      className={`w-14 h-14 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${
                        featuredImageUrl === url ? "border-slate-900 shadow-xs" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </CardContent>
              )}
            </Card>

            {/* Quick Action Box */}
            <div className="p-6 rounded-[28px] bg-[#18181B] text-white space-y-4 shadow-md border border-slate-800">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-extrabold">
                  Product Pricing
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                    {formatCurrency(product?.price || product?.regular_price || "0")}
                  </span>
                  {product?.on_sale && product?.regular_price && (
                    <span className="text-sm font-mono text-slate-400 line-through">
                      {formatCurrency(product.regular_price)}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium">Availability:</span>
                <ProductStockBadge stockStatus={product?.stock_status || "instock"} stockQuantity={product?.stock_quantity} />
              </div>

              <Link
                href="/orders/new"
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 text-center"
              >
                <span>🛒 Create Order with this Item</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Right Column: Descriptions, Variants & Specifications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header & Short Description */}
            <Card className="p-6 rounded-[28px] border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {product?.categories?.map((cat) => (
                  <span key={cat.id} className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-extrabold border border-slate-200">
                    {cat.name}
                  </span>
                ))}
                {product?.sku && (
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-50 text-slate-600 text-xs font-mono font-bold border border-slate-200">
                    SKU: {product.sku}
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {product?.name}
              </h2>

              {product?.short_description && (
                <div
                  className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium bg-slate-50/80 p-4 rounded-2xl border border-slate-100 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.short_description }}
                />
              )}
            </Card>

            {/* Variable Pack Sizes & Dosage Kits */}
            {productType === "variable" && (
              <Card className="p-6 rounded-[28px] border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🧬</span>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Available Pack Sizes & Dosage Kits
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    {variations.length} Sizes Available
                  </span>
                </div>

                {variations.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">No variations configured for this product.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {variations.map((v) => {
                      const attrName = v.attributes?.map((a) => a.option).join(" • ") || `Kit #${v.id}`;
                      const price = v.price || v.sale_price || v.regular_price || "0";
                      return (
                        <div
                          key={v.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-3 group shadow-2xs"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-extrabold text-slate-900">
                                {attrName}
                              </span>
                              <ProductStockBadge stockStatus={v.stock_status} stockQuantity={v.stock_quantity} size="sm" />
                            </div>
                            {v.sku && (
                              <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                SKU: {v.sku}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                            <span className="text-sm font-mono font-black text-slate-950">
                              {formatCurrency(price)}
                            </span>
                            <Link
                              href="/orders/new"
                              className="px-3 py-1 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-xl shadow-2xs"
                            >
                              + Add in Order
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Full Product Specifications & Details */}
            {product?.description && (
              <Card className="p-6 rounded-[28px] border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="text-base">📄</span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Product Specifications & Details
                  </h3>
                </div>
                <div
                  className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </Card>
            )}
          </div>
        </div>
      ) : (
        /* Edit Form for Administrators */
        <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Product Data Tabs (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
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
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-semibold focus:outline-none focus:bg-white focus:ring-2 focus:ring-slate-900/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Full Description
                </label>
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 focus:outline-none focus:bg-white font-mono text-[11px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Dynamic Tabs Card */}
          <div className="rounded-[24px] border border-[#eaedf2] bg-white shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50/80 border-b border-[#eaedf2]">
              <div className="flex items-center gap-3">
                <span className="text-xs font-extrabold text-slate-700">Product data:</span>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as ProductType)}
                  className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900"
                >
                  <option value="simple">Simple product</option>
                  <option value="variable">Variable product</option>
                  <option value="grouped">Grouped product</option>
                  <option value="external">External/Affiliate product</option>
                </select>
              </div>

              {productType === "simple" && (
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={virtual}
                      onChange={(e) => setVirtual(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 w-3.5 h-3.5"
                    />
                    <span>Virtual</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={downloadable}
                      onChange={(e) => setDownloadable(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 w-3.5 h-3.5"
                    />
                    <span>Downloadable</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex flex-col md:flex-row min-h-[380px]">
              {/* Left Tab Nav */}
              <div className="w-full md:w-48 bg-slate-50/50 border-b md:border-b-0 md:border-r border-[#eaedf2] flex md:flex-col overflow-x-auto no-scrollbar shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "general"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
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
                      : "text-slate-500 hover:text-slate-800"
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
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <span>🚚</span> Shipping
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveTab("attributes")}
                  className={`px-4 py-3 text-left text-xs font-bold transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === "attributes"
                      ? "bg-white text-slate-900 border-l-2 border-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
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
                        : "text-slate-500 hover:text-slate-800"
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
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>⚙️</span> Advanced
                </button>
              </div>

              {/* Tab Panel */}
              <div className="flex-1 p-5 sm:p-6">
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900"
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
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900"
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
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
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
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs"
                        >
                          <option value="standard">Standard</option>
                          <option value="reduced-rate">Reduced rate</option>
                          <option value="zero-rate">Zero rate</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "inventory" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        SKU
                      </label>
                      <input
                        type="text"
                        value={sku}
                        onChange={(e) => setSku(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>

                    {productType !== "variable" && (
                      <>
                        <div className="flex items-center gap-2 pt-2">
                          <input
                            type="checkbox"
                            id="edit_manage_stock"
                            checked={manageStock}
                            onChange={(e) => setManageStock(e.target.checked)}
                            className="rounded border-slate-300 text-slate-900 w-4 h-4"
                          />
                          <label htmlFor="edit_manage_stock" className="text-xs font-bold text-slate-800">
                            Track stock quantity
                          </label>
                        </div>

                        {manageStock && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Stock Quantity
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                              />
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
                  </div>
                )}

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
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "attributes" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h4 className="text-xs font-bold text-slate-900">Product Attributes</h4>
                      <button
                        type="button"
                        onClick={handleAddAttribute}
                        className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 text-white"
                      >
                        + Add Attribute
                      </button>
                    </div>

                    <div className="space-y-3">
                      {attributes.map((attr, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <input
                              type="text"
                              value={attr.name}
                              onChange={(e) => handleUpdateAttribute(idx, { name: e.target.value })}
                              className="font-bold text-xs bg-white border border-slate-200 rounded-lg px-3 py-1 w-1/2"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveAttribute(idx)}
                              className="text-xs text-rose-600 font-semibold"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={attr.options.join(" | ")}
                            onChange={(e) => {
                              const parsed = e.target.value.split("|").map((s) => s.trim()).filter(Boolean);
                              handleUpdateAttribute(idx, { options: parsed });
                            }}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                      </div>
                    </div>

                    {variations.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl space-y-3">
                        <span className="text-4xl">🧬</span>
                        <h5 className="text-xs font-bold text-slate-800">No Variations Found</h5>
                        <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                          No variations are currently attached to this variable product on WooCommerce.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {variations.map((v, vIdx) => {
                          const title =
                            v.attributes?.map((a) => `${a.name}: ${a.option}`).join(", ") ||
                            `Variation #${v.id || vIdx + 1}`;

                          return (
                            <div
                              key={v.id || vIdx}
                              className="border border-slate-200 rounded-2xl bg-white shadow-xs overflow-hidden transition-all"
                            >
                              {/* Accordion Row Header Bar */}
                              <div
                                onClick={() => handleUpdateVariation(v.id, { expanded: !v.expanded })}
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
                                        {v.regular_price || v.price ? `$${v.regular_price || v.price}` : "Set Price"}
                                      </span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${v.stock_status === "instock" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                        {v.stock_status || "instock"}
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                                      SKU: {v.sku || "N/A"} • Click to {v.expanded ? "collapse" : "expand details"}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-slate-600 px-2.5 py-1 bg-white border border-slate-200 rounded-xl shadow-2xs hover:bg-slate-50">
                                    {v.expanded ? "▲ Close" : "▼ Expand"}
                                  </span>
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
                                              handleVariationFileSelect(v.id, e.target.files[0]);
                                            }
                                          }}
                                          className="hidden"
                                        />
                                      </label>

                                      <input
                                        type="url"
                                        value={v.image?.src || ""}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.id, {
                                            image: e.target.value.trim()
                                              ? ({ id: 0, src: e.target.value.trim() } as unknown as ProductVariation["image"])
                                              : undefined,
                                          })
                                        }
                                        placeholder="Or paste image URL..."
                                        className="flex-1 min-w-[200px] bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                                      />

                                      {v.image?.src && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateVariation(v.id, { image: undefined })}
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
                                        value={v.sku || ""}
                                        onChange={(e) => handleUpdateVariation(v.id, { sku: e.target.value })}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono"
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                        Regular price ($)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={v.regular_price || v.price || ""}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.id, { regular_price: e.target.value })
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
                                        value={v.sale_price || ""}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.id, { sale_price: e.target.value })
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
                                        value={v.stock_status || "instock"}
                                        onChange={(e) =>
                                          handleUpdateVariation(v.id, {
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
                                          handleUpdateVariation(v.id, {
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

                {activeTab === "advanced" && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Purchase note
                      </label>
                      <textarea
                        rows={3}
                        value={purchaseNote}
                        onChange={(e) => setPurchaseNote(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extrabold text-[#18181b]">
                Short Description (Excerpt)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                rows={3}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Media, Categories & Actions (1 col) */}
        <div className="space-y-6">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold"
                >
                  <option value="publish">Published (Live in Store)</option>
                  <option value="draft">Draft (Private)</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="edit_featured"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded border-slate-300 text-amber-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit_featured" className="text-xs font-bold text-slate-800 cursor-pointer">
                  ⭐ Featured Product
                </label>
              </div>

              {userRole === "staff" ? (
                <div className="space-y-3 pt-2">
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950">
                    <div className="font-extrabold flex items-center gap-1.5 mb-1">
                      <span>💼</span> Sales Rep Catalog View
                    </div>
                    <p className="text-[11px] text-amber-800">
                      You are presenting this product to customer. Pricing and store settings are read-only.
                    </p>
                  </div>
                  <Link
                    href="/orders/new"
                    className="w-full py-3 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-center"
                  >
                    <span>🛒 Create Order with this Item</span>
                  </Link>
                </div>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-3 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all disabled:opacity-50 shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <span>Update WooCommerce Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="w-full py-2 text-xs font-bold rounded-2xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors"
                  >
                    Delete Product
                  </button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Primary Image Card (Phone & PC Gallery Picker) */}
          <Card>
            <CardHeader className="pb-2 border-b border-slate-100">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Primary Product Image
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {featuredImageUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-square bg-slate-100 group">
                  <img src={featuredImageUrl} alt="Featured" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => primaryFileInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white text-slate-900 rounded-xl text-xs font-bold shadow"
                    >
                      Change Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeaturedImageUrl("")}
                      className="p-1.5 bg-rose-600 text-white rounded-xl text-xs"
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
                    Click to open your device photo gallery
                  </p>
                </div>
              )}

              <input
                type="url"
                value={featuredImageUrl}
                onChange={(e) => setFeaturedImageUrl(e.target.value)}
                placeholder="Or paste image URL..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs"
              />
            </CardContent>
          </Card>

          {/* Gallery Images Card (Only for Simple / Non-Variable Products) */}
          {productType !== "variable" && (
            <Card>
              <CardHeader className="pb-2 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                  Gallery Images ({galleryUrls.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {galleryUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {galleryUrls.map((url, gIdx) => (
                      <div key={gIdx} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                        <img src={url} alt={`Gallery ${gIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(gIdx)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-600 text-white text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => galleryFileInputRef.current?.click()}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <span>📸 Select Multiple Photos from Gallery</span>
                </button>

                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <input
                    type="url"
                    value={newGalleryInput}
                    onChange={(e) => setNewGalleryInput(e.target.value)}
                    placeholder="Or paste photo URL..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddGalleryImage}
                    className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
                  >
                    + Add
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateCategory();
                      }
                    }}
                    placeholder="New category name..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={creatingCategory}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg disabled:opacity-50"
                  >
                    {creatingCategory ? "..." : "Save"}
                  </button>
                </div>
              )}

              <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading categories...</p>
                ) : (
                  categories.map((c) => {
                    const isChecked = selectedCategoryIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        className={`flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-50 transition-colors group ${
                          isChecked ? "bg-slate-50/70" : ""
                        }`}
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
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
                          <span className={`text-xs truncate ${isChecked ? "text-slate-950 font-bold" : "text-slate-700 font-medium"}`}>
                            {c.name}
                          </span>
                          {c.parent && c.parent > 0 ? (
                            <span className="text-[10px] text-slate-400 font-normal">
                              (Sub)
                            </span>
                          ) : null}
                        </label>

                        <Link
                          href="/products/categories"
                          target="_blank"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-all"
                          title={`Edit "${c.name}" category in Taxonomy Manager`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </Link>
                      </div>
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
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900/10"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  Add
                </button>
              </div>

              {/* Selected Active Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {selectedTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200/90 shadow-2xs"
                    >
                      <span>#{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-rose-600 font-extrabold text-xs"
                        title="Remove Tag"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Tags from Store Catalog */}
              {tags.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                    Store Tags (Click to Add):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {tags
                      .filter((t) => !selectedTags.includes(t.name))
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleAddTag(t.name)}
                          className="text-[10px] font-semibold bg-slate-50 hover:bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200 transition-colors"
                        >
                          +{t.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <OrderConfirmModal
          isOpen={true}
          title="Delete Product?"
          description={`Are you sure you want to delete "${product?.name}"? It will be removed from your WooCommerce store.`}
          confirmLabel="Delete Product"
          variant="rose"
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
