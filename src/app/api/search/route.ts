import { NextRequest, NextResponse } from "next/server";
import { searchAllChains } from "../../../lib/scrapers";
import { groupByProduct } from "../../../lib/matcher";
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
    // Search all 4 chains in parallel
    const rawProducts = await searchAllChains(query);

    // Group by product (brand + size matching)
    const { comparable, singleChain } = groupByProduct(rawProducts);

    // Count unique chains that returned results
    const chainsWithResults = new Set(rawProducts.map((p) => p.chain));

    const response: SearchResponse = {
      query,
      comparable,
      singleChain,
      totalProducts: comparable.length + singleChain.length,
      totalChains: chainsWithResults.size,
      fetchedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
