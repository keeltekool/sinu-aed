"use client";

import { useState, useCallback } from "react";
import type { ProductGroup } from "../lib/types";
import { useWatchlist } from "../lib/watchlist";
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
  const { isWatched, add, remove } = useWatchlist();
  const watched = isWatched(group.matchKey);
  const [toast, setToast] = useState<string | null>(null);

  const toggleHeart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (watched) {
        remove(group.matchKey);
        setToast("Eemaldatud lemmikutest");
      } else {
        add(group.matchKey, group.displayName);
        setToast("Lisatud lemmikutesse");
      }
      setTimeout(() => setToast(null), 2000);
    },
    [watched, group.matchKey, group.displayName, add, remove]
  );

  return (
    <div className="bg-surface-container-lowest rounded-lg p-4 space-y-3 relative">
      {/* Toast notification */}
      {toast && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-xs font-medium px-3 py-1.5 rounded-full z-10 animate-fade-in whitespace-nowrap">
          {toast}
        </div>
      )}

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
        <div className="min-w-0 flex-1">
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

        {/* Heart button */}
        <button
          onClick={toggleHeart}
          className="flex-shrink-0 p-1 -mr-1 -mt-1 transition-transform active:scale-125"
          aria-label={watched ? "Eemalda lemmikutest" : "Lisa lemmikutesse"}
        >
          <span
            className={`material-symbols-outlined text-xl transition-colors ${
              watched ? "text-primary" : "text-outline"
            }`}
            style={watched ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            favorite
          </span>
        </button>
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
