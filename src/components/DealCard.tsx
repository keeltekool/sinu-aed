"use client";

import { useState } from "react";
import Link from "next/link";
import type { Deal } from "../lib/types";

function proxyImg(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

export default function DealCard({ deal }: { deal: Deal }) {
  const [imgFailed, setImgFailed] = useState(false);
  const imgSrc = proxyImg(deal.imageUrl);

  // Link to search results showing cross-chain comparison for this product
  const searchQuery = deal.brand
    ? `${deal.brand.toLowerCase()} ${deal.size?.toLowerCase() || ""}`.trim()
    : deal.product;

  return (
    <Link
      href={`/search?q=${encodeURIComponent(searchQuery)}`}
      className="flex-none w-64 bg-surface-container-lowest rounded-lg overflow-hidden group"
    >
      {/* Image */}
      <div className="h-36 bg-surface-container-low relative overflow-hidden">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={deal.product}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="material-symbols-outlined text-outline text-4xl">
              eco
            </span>
          </div>
        )}

        {/* Discount badge */}
        <div className="absolute top-2 left-2 bg-error text-on-error text-[11px] font-bold px-2 py-1 rounded">
          -{deal.discountPercent}%
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: deal.chainColor }}
          />
          <span className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            {deal.chainName}
          </span>
        </div>

        <h4 className="font-semibold text-on-surface text-sm leading-tight line-clamp-1">
          {deal.product}
        </h4>

        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold text-primary">
            {deal.effectivePrice.toFixed(2)} €
          </span>
          <span className="text-sm text-outline line-through">
            {deal.regularPrice.toFixed(2)} €
          </span>
        </div>
      </div>
    </Link>
  );
}
