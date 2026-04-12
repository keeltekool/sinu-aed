import { NextRequest, NextResponse } from "next/server";
import { searchAllChains } from "../../../lib/scrapers";
import { groupByProduct } from "../../../lib/matcher";
import { getCachedSearch } from "../../../lib/cache";
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
    const response = await getCachedSearch(query, async () => {
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
    });

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
