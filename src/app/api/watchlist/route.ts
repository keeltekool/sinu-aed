import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import type { SearchResponse, ProductGroup } from "../../../lib/types";
import { CATEGORIES } from "../../../lib/constants";

export async function GET(request: NextRequest) {
  const keysParam = request.nextUrl.searchParams.get("keys");

  if (!keysParam) {
    return NextResponse.json(
      { error: "Missing keys parameter" },
      { status: 400 }
    );
  }

  const requestedKeys = keysParam
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 30); // Max 30

  if (requestedKeys.length === 0) {
    return NextResponse.json({ products: [], missing: [], fetchedAt: new Date().toISOString() });
  }

  try {
    // Read all catalog categories from Redis
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const catalogKeys = CATEGORIES.map((c) => `catalog:${c.id}`);
    const allProducts: ProductGroup[] = [];

    // Fetch all catalogs in parallel
    const results = await Promise.allSettled(
      catalogKeys.map((key) => redis.get<SearchResponse>(key))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value?.comparable) {
        allProducts.push(...result.value.comparable);
      }
    }

    // Find requested products — supports both old (BRAND|SIZE) and new (BRAND|TYPE|SIZE) matchKeys
    const found: ProductGroup[] = [];
    const missing: string[] = [];

    for (const key of requestedKeys) {
      // Exact match first
      let product = allProducts.find((p) => p.matchKey === key);

      // Fallback: old-format key (BRAND|SIZE) matches new-format (BRAND|...|SIZE)
      if (!product) {
        const parts = key.split("|");
        if (parts.length === 2) {
          const [brand, size] = parts;
          product = allProducts.find(
            (p) => p.matchKey.startsWith(brand + "|") && p.matchKey.endsWith("|" + size)
          );
        }
      }

      if (product) {
        found.push(product);
      } else {
        missing.push(key);
      }
    }

    return NextResponse.json(
      {
        products: found,
        missing,
        fetchedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Watchlist fetch failed:", msg);
    return NextResponse.json(
      { error: "Watchlist fetch failed", detail: msg },
      { status: 500 }
    );
  }
}
