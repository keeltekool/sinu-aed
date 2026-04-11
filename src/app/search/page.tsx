"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import SearchBar from "../../components/SearchBar";
import ProductCard from "../../components/ProductCard";
import type { SearchResponse, ProductGroup } from "../../lib/types";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query || query.length < 2) return;

    setLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Search failed");
        return res.json();
      })
      .then((json: SearchResponse) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setError("Otsing ebaõnnestus. Proovi uuesti.");
        setLoading(false);
      });
  }, [query]);

  // Group comparable products by brand
  const brandGroups = new Map<string, ProductGroup[]>();
  if (data?.comparable) {
    for (const group of data.comparable) {
      const brand = group.brand || "Muu";
      const existing = brandGroups.get(brand) || [];
      existing.push(group);
      brandGroups.set(brand, existing);
    }
  }

  return (
    <div className="pt-6 space-y-6">
      <SearchBar initialQuery={query} />

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-surface-container-lowest rounded-lg p-4 animate-pulse"
            >
              <div className="h-4 bg-surface-container-high rounded w-1/3 mb-3" />
              <div className="h-5 bg-surface-container-high rounded w-2/3 mb-4" />
              <div className="space-y-2">
                <div className="h-10 bg-surface-container-low rounded" />
                <div className="h-10 bg-surface-container-low rounded" />
                <div className="h-10 bg-surface-container-low rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-error-container text-on-error-container p-4 rounded-lg text-center">
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="font-medium">
              {data.comparable.length} võrreldavat toodet
            </span>
            <span>·</span>
            <span>{data.totalChains} poodi</span>
          </div>

          {data.comparable.length === 0 && data.singleChain.length === 0 && (
            <div className="text-center py-12 space-y-3">
              <span className="material-symbols-outlined text-5xl text-outline">
                search_off
              </span>
              <p className="text-on-surface-variant">
                Võrreldavaid tooteid ei leitud.
              </p>
              <p className="text-sm text-outline">
                Proovi teistsugust otsingut, nt &quot;muld&quot; või
                &quot;Fiskars&quot;.
              </p>
            </div>
          )}

          {/* Comparable products grouped by brand */}
          {Array.from(brandGroups.entries()).map(([brand, groups]) => (
            <section key={brand} className="space-y-3">
              <h3 className="headline font-semibold text-lg text-primary flex items-center gap-2">
                {brand}
                <span className="text-xs font-normal text-outline bg-surface-container-low px-2 py-0.5 rounded-full">
                  {groups.length}
                </span>
              </h3>
              <div className="space-y-3">
                {groups.map((group) => (
                  <ProductCard key={group.matchKey} group={group} />
                ))}
              </div>
            </section>
          ))}

          {/* Single-chain products */}
          {data.singleChain.length > 0 && (
            <section className="space-y-3 pt-4">
              <h3 className="text-sm font-medium text-outline uppercase tracking-wider">
                Muud tooted
              </h3>
              <div className="space-y-2">
                {data.singleChain.slice(0, 10).map((group) => (
                  <div
                    key={group.matchKey}
                    className="flex items-center justify-between py-2 px-3 bg-surface-container-lowest rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{group.displayName}</p>
                      <p className="text-xs text-outline">
                        {group.chains[0]?.chainName}
                      </p>
                    </div>
                    <span className="font-semibold text-primary">
                      €{group.cheapestPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-6">
          <div className="h-16 bg-surface-container-high rounded-xl animate-pulse" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
