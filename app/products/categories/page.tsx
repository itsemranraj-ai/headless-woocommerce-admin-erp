"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { ProductCategory, ProductTag } from "@/types";

export default function CategoriesAndTagsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "tags">("categories");

  // Data state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modals & Form state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catParent, setCatParent] = useState<number>(0);
  const [catDescription, setCatDescription] = useState("");
  const [catImageUrl, setCatImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagSlug, setTagSlug] = useState("");
  const [tagDescription, setTagDescription] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "tag";
    id: number;
    name: string;
  } | null>(null);

  // Status feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Load Categories & Tags
  const loadData = async () => {
    setLoading(true);
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionJson = await sessionRes.json();
      if (sessionJson.data?.user?.role === "staff") {
        window.location.href = "/orders";
        return;
      }

      const [catsRes, tagsRes] = await Promise.allSettled([
        fetch("/api/products/categories").then((r) => r.json()),
        fetch("/api/products/tags").then((r) => r.json()),
      ]);

      if (catsRes.status === "fulfilled" && catsRes.value.success && Array.isArray(catsRes.value.data)) {
        setCategories(catsRes.value.data);
      }
      if (tagsRes.status === "fulfilled" && tagsRes.value.success && Array.isArray(tagsRes.value.data)) {
        setTags(tagsRes.value.data);
      }
    } catch {
      showToast("Failed to load categories and tags.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(
      (t) => t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, searchQuery]);

  // Open Category Create/Edit Modal
  const openCategoryModal = (cat?: ProductCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
      setCatSlug(cat.slug || "");
      setCatParent(cat.parent || 0);
      setCatDescription(cat.description || "");
      setCatImageUrl(cat.image?.src || "");
    } else {
      setEditingCategory(null);
      setCatName("");
      setCatSlug("");
      setCatParent(0);
      setCatDescription("");
      setCatImageUrl("");
    }
    setIsCategoryModalOpen(true);
  };

  // Open Tag Create/Edit Modal
  const openTagModal = (tag?: ProductTag) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagSlug(tag.slug || "");
      setTagDescription("");
    } else {
      setEditingTag(null);
      setTagName("");
      setTagSlug("");
      setTagDescription("");
    }
    setIsTagModalOpen(true);
  };

  // Handle Category Image Upload via /api/products/upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Image upload failed.");
      }

      setCatImageUrl(json.data.url);
      showToast("Category image uploaded successfully!");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload image.", "error");
    } finally {
      setUploadingImage(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    }
  };

  // Save Category (Create or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      showToast("Category name is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: catName.trim(),
        slug: catSlug.trim() || undefined,
        parent: catParent || 0,
        description: catDescription.trim() || undefined,
        image: catImageUrl.trim() ? { src: catImageUrl.trim() } : null,
      };

      if (editingCategory) {
        // Update
        const res = await fetch(`/api/products/categories/${editingCategory.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to update category.");

        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? json.data : c)));
        showToast(`Category "${catName}" updated successfully!`);
      } else {
        // Create
        const res = await fetch("/api/products/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to create category.");

        setCategories((prev) => [json.data, ...prev]);
        showToast(`Category "${catName}" created successfully!`);
      }

      setIsCategoryModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving category.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Save Tag (Create or Update)
  const handleSaveTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagName.trim()) {
      showToast("Tag name is required.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: tagName.trim(),
        slug: tagSlug.trim() || undefined,
        description: tagDescription.trim() || undefined,
      };

      if (editingTag) {
        // Update
        const res = await fetch(`/api/products/tags/${editingTag.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to update tag.");

        setTags((prev) => prev.map((t) => (t.id === editingTag.id ? json.data : t)));
        showToast(`Tag "${tagName}" updated successfully!`);
      } else {
        // Create
        const res = await fetch("/api/products/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to create tag.");

        setTags((prev) => [json.data, ...prev]);
        showToast(`Tag "${tagName}" created successfully!`);
      }

      setIsTagModalOpen(false);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Error saving tag.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Deletion
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "category") {
        const res = await fetch(`/api/products/categories/${deleteTarget.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to delete category.");

        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        showToast(`Category "${deleteTarget.name}" deleted.`);
      } else {
        const res = await fetch(`/api/products/tags/${deleteTarget.id}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || "Failed to delete tag.");

        setTags((prev) => prev.filter((t) => t.id !== deleteTarget.id));
        showToast(`Tag "${deleteTarget.name}" deleted.`);
      }
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Delete operation failed.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 w-full px-4 sm:px-8 lg:px-10 py-6 sm:py-8 flex flex-col gap-6 font-sans">
      {/* Toast Feedback Banner */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in slide-in-from-top duration-200 flex items-center gap-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-800"
              : "bg-rose-950 text-rose-100 border-rose-800"
          }`}
        >
          <span>{toastMessage.type === "success" ? "✅" : "⚠️"}</span>
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Categories & Tags
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
              Taxonomy Manager
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize and manage WooCommerce product categories, parent hierarchies, and catalog tags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 text-xs font-semibold rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-sm active:scale-95"
            title="Refresh Taxonomies"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin text-slate-900" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {activeTab === "categories" ? (
            <button
              onClick={() => openCategoryModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Category</span>
            </button>
          ) : (
            <button
              onClick={() => openTagModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold rounded-2xl bg-[#18181B] hover:bg-black text-white transition-all shadow-md active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Tag</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 w-fit">
          <button
            onClick={() => setActiveTab("categories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === "categories"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📁 Categories</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === "categories" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {categories.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("tags")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold transition-all ${
              activeTab === "tags"
                ? "bg-white text-slate-950 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>🏷️ Tags</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
                activeTab === "tags" ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-700"
              }`}
            >
              {tags.length}
            </span>
          </button>
        </div>

        {/* Live Filter Search */}
        <div className="relative max-w-md w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Filter ${activeTab} by name or slug...`}
            className="w-full bg-white border border-slate-200/80 rounded-2xl pl-10 pr-10 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 transition-all shadow-xs"
          />
          <div className="pointer-events-none absolute left-3.5 top-3 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse border border-slate-200/60" />
          ))}
        </div>
      )}

      {/* CATEGORIES VIEW */}
      {!loading && activeTab === "categories" && (
        <>
          {filteredCategories.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">
                📁
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">No categories found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery ? "No categories match your search query." : "No categories created yet."}
              </p>
              <button
                onClick={() => openCategoryModal()}
                className="mt-2 px-4 py-2 bg-[#18181B] text-white text-xs font-black rounded-xl hover:bg-black transition-all"
              >
                + Add First Category
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="group relative rounded-3xl border border-slate-200/80 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Category Thumbnail */}
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center">
                      {cat.image?.src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cat.image.src} alt={cat.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl opacity-60">📁</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-black line-clamp-1">
                          {cat.name}
                        </h3>
                        {cat.parent && cat.parent > 0 && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                            Sub-Category
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-mono font-medium text-slate-400 mt-0.5 truncate">
                        slug: {cat.slug}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Stats & Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                      📦 {cat.count || 0} Products
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openCategoryModal(cat)}
                        className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-[#18181B] hover:text-white text-slate-700 transition-all shadow-2xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: "category", id: cat.id, name: cat.name })}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Category"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* TAGS VIEW */}
      {!loading && activeTab === "tags" && (
        <>
          {filteredTags.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-xl">
                🏷️
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">No tags found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery ? "No tags match your search query." : "No tags created yet."}
              </p>
              <button
                onClick={() => openTagModal()}
                className="mt-2 px-4 py-2 bg-[#18181B] text-white text-xs font-black rounded-xl hover:bg-black transition-all"
              >
                + Add First Tag
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTags.map((tag) => (
                <div
                  key={tag.id}
                  className="group rounded-3xl border border-slate-200/80 bg-white p-5 hover:border-slate-300 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/70 flex items-center justify-center text-xs font-black">
                        #
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 line-clamp-1">
                        {tag.name}
                      </h3>
                    </div>
                    <p className="text-xs font-mono font-medium text-slate-400 mt-1 pl-10 truncate">
                      slug: {tag.slug}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold">
                      🏷️ {tag.count || 0} Products
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openTagModal(tag)}
                        className="px-3 py-1 text-xs font-bold rounded-xl bg-slate-100 hover:bg-[#18181B] hover:text-white text-slate-700 transition-all shadow-2xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ type: "tag", id: tag.id, name: tag.name })}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Tag"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* CATEGORY CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {editingCategory ? `Edit Category #${editingCategory.id}` : "Create New Category"}
              </h2>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. Hoodies & Sweatshirts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="e.g. hoodies-sweatshirts"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Parent Category
                </label>
                <select
                  value={catParent}
                  onChange={(e) => setCatParent(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                >
                  <option value={0}>None (Top-Level Category)</option>
                  {categories
                    .filter((c) => !editingCategory || c.id !== editingCategory.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="Brief description for category..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
                />
              </div>

              {/* Category Image */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Category Image
                </label>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {catImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={catImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-400 text-xs">No image</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      type="url"
                      value={catImageUrl}
                      onChange={(e) => setCatImageUrl(e.target.value)}
                      placeholder="Image URL or upload..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => imageFileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-50"
                      >
                        {uploadingImage ? "Uploading..." : "Upload Image"}
                      </button>
                      {catImageUrl && (
                        <button
                          type="button"
                          onClick={() => setCatImageUrl("")}
                          className="px-2 py-1 text-xs text-rose-600 font-semibold hover:underline"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAG CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      {isTagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {editingTag ? `Edit Tag #${editingTag.id}` : "Create New Tag"}
              </h2>
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTag} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="e.g. Winter Collection"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Slug (Optional)
                </label>
                <input
                  type="text"
                  value={tagSlug}
                  onChange={(e) => setTagSlug(e.target.value)}
                  placeholder="e.g. winter-collection"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={tagDescription}
                  onChange={(e) => setTagDescription(e.target.value)}
                  placeholder="Brief tag description..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-2">
                <button
                  type="button"
                  onClick={() => setIsTagModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-[#18181B] hover:bg-black text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingTag ? "Update Tag" : "Create Tag"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Delete {deleteTarget.type === "category" ? "Category" : "Tag"}?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to permanently delete{" "}
                <strong className="text-slate-900 font-bold">"{deleteTarget.name}"</strong> from WooCommerce?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl shadow-md disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
