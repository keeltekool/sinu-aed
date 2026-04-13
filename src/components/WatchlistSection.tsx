"use client";

import { useEffect, useState } from "react";
import { useWatchlist } from "../lib/watchlist";
import ProductCard from "./ProductCard";
import type { ProductGroup } from "../lib/types";

export default function WatchlistSection() {
  const { watchlist, count } = useWatchlist();
  const [products, setProducts] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (count === 0) {
      setProducts([]);
      return;
    }

    const keys = watchlist.map((item) => item.matchKey).join(",");
    setLoading(true);

    fetch(`/api/watchlist?keys=${encodeURIComponent(keys)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Fetch failed");
        return res.json();
      })
      .then((data) => {
        // Preserve user's order (most recently added first)
        const productMap = new Map<string, ProductGroup>();
        for (const p of data.products || []) {
          productMap.set(p.matchKey, p);
        }

        const ordered: ProductGroup[] = [];
        for (const item of watchlist) {
          const product = productMap.get(item.matchKey);
          if (product) {
            ordered.push(product);
          }
        }
        setProducts(ordered);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [watchlist, count]);

  // Don't render anything if user has no watchlist items
  if (count === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <span
          className="material-symbols-outlined text-primary text-xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          favorite
        </span>
        <h3 className="headline font-semibold text-xl text-primary">
          Minu lemmikud
        </h3>
        <span className="text-xs font-normal text-outline bg-surface-container-low px-2 py-0.5 rounded-full">
          {count}
        </span>
      </div>

      {loading && products.length === 0 && (
        <div className="space-y-3">
          {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-surface-container-high rounded w-1/3 mb-3" />
              <div className="h-5 bg-surface-container-high rounded w-2/3 mb-4" />
              <div className="space-y-2">
                <div className="h-10 bg-surface-container-low rounded" />
                <div className="h-10 bg-surface-container-low rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {products.length > 0 && (
        <div className="space-y-3">
          {products.map((group) => (
            <ProductCard key={group.matchKey} group={group} />
          ))}
        </div>
      )}
    </section>
  );
}
