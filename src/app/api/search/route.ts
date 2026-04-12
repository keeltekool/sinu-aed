import { NextRequest, NextResponse } from "next/server";
import { searchAllChains } from "../../../lib/scrapers";
import { groupByProduct } from "../../../lib/matcher";
import { getCached } from "../../../lib/cache";
import { CATEGORIES } from "../../../lib/constants";
import type { SearchResponse, RawProduct } from "../../../lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    const response = await getCached<SearchResponse>(
      `search:${query.toLowerCase()}`,
      async () => {
        // Check if query matches a category — if so, search ALL its terms
        const category = CATEGORIES.find(
          (c) => c.searchQuery.toLowerCase() === query.toLowerCase()
        );
        const searchTerms = category ? category.searchTerms : [query];

        const allRaw: RawProduct[] = [];

        // Search terms in batches of 3 to avoid overwhelming APIs
        for (let i = 0; i < searchTerms.length; i += 3) {
          const batch = searchTerms.slice(i, i + 3);
          const batchResults = await Promise.allSettled(
            batch.map((term) => searchAllChains(term))
          );
          for (const r of batchResults) {
            if (r.status === "fulfilled") allRaw.push(...r.value);
          }
        }

        // Deduplicate by chain + sku (or chain + name if no sku)
        const seen = new Set<string>();
        const deduped = allRaw.filter((p) => {
          const key = `${p.chain}:${p.sku || p.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const { comparable, singleChain } = groupByProduct(deduped);
        const chainsWithResults = new Set(deduped.map((p) => p.chain));

        return {
          query,
          comparable,
          singleChain,
          totalProducts: comparable.length + singleChain.length,
          totalChains: chainsWithResults.size,
          fetchedAt: new Date().toISOString(),
        };
      }
    );

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Search failed:", msg, error);
    return NextResponse.json(
      { error: "Search failed", detail: msg },
      { status: 500 }
    );
  }
}
