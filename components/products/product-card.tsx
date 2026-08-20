import React, { useMemo } from "react";
import Link from "next/link";
import { Product } from "@/types";
import { ProductStockBadge } from "./product-stock-badge";
import { formatCurrency } from "@/lib/utils";

export interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const imageUrl = product.images?.[0]?.src;
  const categoryName = product.categories?.[0]?.name || "Uncategorized";

  // Check if product was created within the last 30 days
  const isNewArrival = useMemo(() => {
    if (!product.date_created) return false;
    const createdTime = new Date(product.date_created).getTime();
    if (isNaN(createdTime)) return false;
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - createdTime <= thirtyDaysInMs;
  }, [product.date_created]);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group relative block rounded-[28px] border border-slate-200/80 bg-white p-4.5 hover:border-slate-300 hover:shadow-md transition-all duration-200 shadow-2xs hover:-translate-y-0.5 font-sans"
    >
      <div className="flex gap-4 items-center">
        {/* Product Thumbnail */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          ) : (
            <div className="text-slate-400">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}

          {/* Thumbnail Badges */}
          <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10 pointer-events-none">
            {product.on_sale && (
              <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs">
                Sale
              </span>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="text-[11px] font-extrabold tracking-wider text-slate-500 uppercase truncate max-w-[120px]">
                {categoryName}
              </span>
              {isNewArrival && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200/90 text-emerald-700 text-[10px] font-black uppercase tracking-wider shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  New Arrived
                </span>
              )}
            </div>

            <ProductStockBadge
              stockStatus={product.stock_status}
              stockQuantity={product.stock_quantity}
              size="sm"
            />
          </div>

          <h3 className="text-sm sm:text-base font-black text-slate-950 group-hover:text-black transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>

          {product.sku && (
            <p className="text-xs text-slate-500 font-mono font-bold">
              SKU: {product.sku}
            </p>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-base sm:text-lg font-black text-slate-950">
                {formatCurrency(product.price || product.regular_price || "0")}
              </span>
              {product.on_sale && product.regular_price && (
                <span className="font-mono text-xs text-slate-400 line-through font-bold">
                  {formatCurrency(product.regular_price)}
                </span>
              )}
            </div>

            <span className="inline-flex items-center gap-1 text-slate-800 bg-slate-100 hover:bg-[#18181B] hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs group-hover:scale-105">
              View Details
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
