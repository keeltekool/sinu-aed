"use client";

import { useState } from "react";
import type { ProductGroup } from "../lib/types";
import ChainPriceRow from "./ChainPriceRow";

function proxyImg(url: string | null): string | null {
  if (!url) return null;
  return `/api/img?url=${encodeURIComponent(url)}`;
}

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="w-16 h-16 rounded-md bg-surface-container-low flex-shrink-0 flex items-center justify-center">
        <span className="material-symbols-outlined text-outline text-2xl">
          eco
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className="w-16 h-16 object-contain rounded-md bg-surface-container-low flex-shrink-0"
    />
  );
}

export default function ProductCard({ group }: { group: ProductGroup }) {
  const imgSrc = proxyImg(group.imageUrl);

  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        {imgSrc ? (
          <ProductImage src={imgSrc} alt={group.displayName} />
        ) : (
          <div className="w-16 h-16 rounded-md bg-surface-container-low flex-shrink-0 flex items-center justify-center">
            <span className="material-symbols-outlined text-outline text-2xl">
              eco
            </span>
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wider text-on-surface-variant">
            {group.brand}
          </p>
          <h4 className="font-semibold text-on-surface leading-tight">
            {group.displayName}
          </h4>
          {group.size && (
            <span className="text-xs text-outline">{group.size}</span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        {group.chains.map((chain, i) => (
          <ChainPriceRow
            key={chain.chain}
            chain={chain}
            isCheapest={i === 0}
          />
        ))}
      </div>

      {group.priceSpread > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <span className="material-symbols-outlined text-primary text-sm">
            savings
          </span>
          <span className="text-xs font-medium text-primary">
            Säästad kuni €{group.priceSpread.toFixed(2)}
            {group.savingsPercent > 0 && ` (${group.savingsPercent}%)`}
          </span>
        </div>
      )}
    </div>
  );
}
