import { NextRequest, NextResponse } from "next/server";
import { searchAllChains } from "../../../lib/scrapers";
import { groupByProduct } from "../../../lib/matcher";
import { getCached, getCatalog } from "../../../lib/cache";
import { CATEGORIES } from "../../../lib/constants";
import type { SearchResponse } from "../../../lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    // Check if query matches a category — if so, try pre-built catalog first
    const category = CATEGORIES.find(
      (c) => c.searchQuery.toLowerCase() === query.toLowerCase()
    );

    if (category) {
      const catalogData = await getCatalog(category.id);
      if (catalogData) {
        return NextResponse.json(catalogData, {
          headers: {
            "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
          },
        });
      }
    }

    // Fallback: live search (for free-text queries or when catalog is empty)
    const response = await getCached<SearchResponse>(
      `search:${query.toLowerCase()}`,
      async () => {
        const rawProducts = await searchAllChains(query);
        const { comparable, singleChain } = groupByProduct(rawProducts);
        const chainsWithResults = new Set(rawProducts.map((p) => p.chain));

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
