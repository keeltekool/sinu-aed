import { NextRequest, NextResponse } from "next/server";
import { searchAllChains } from "../../../lib/scrapers";
import { groupByProduct } from "../../../lib/matcher";
import { getCached, getCatalog, searchCatalog } from "../../../lib/cache";
import { CATEGORIES } from "../../../lib/constants";
import type { SearchResponse, ProductGroup } from "../../../lib/types";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 }
    );
  }

  try {
    // 1. Check if query matches a category — serve full catalog
    const category = CATEGORIES.find(
      (c) => c.searchQuery.toLowerCase() === query.toLowerCase()
    );

    if (category) {
      const catalogData = await getCatalog(category.id);
      if (catalogData) {
        return jsonResponse(catalogData);
      }
    }

    // 2. Search the catalog by keyword (brand, product name)
    const categoryIds = CATEGORIES.map((c) => c.id);
    const catalogMatches = await searchCatalog(query, categoryIds);

    if (catalogMatches.length > 0) {
      // Sort: most chains first, then by price spread
      catalogMatches.sort((a, b) => {
        if (b.chainCount !== a.chainCount) return b.chainCount - a.chainCount;
        return b.priceSpread - a.priceSpread;
      });

      const response: SearchResponse = {
        query,
        comparable: catalogMatches,
        singleChain: [],
        totalProducts: catalogMatches.length,
        totalChains: 4,
        fetchedAt: new Date().toISOString(),
      };

      return jsonResponse(response);
    }

    // 3. Fallback: live search for queries not in catalog
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

    return jsonResponse(response);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Search failed:", msg, error);
    return NextResponse.json(
      { error: "Search failed", detail: msg },
      { status: 500 }
    );
  }
}

function jsonResponse(data: SearchResponse) {
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
