import { Redis } from "@upstash/redis";
import type { SearchResponse, ProductGroup } from "./types";

const DEFAULT_TTL = 3600; // 1 hour

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return null;
  }
  redis = Redis.fromEnv();
  return redis;
}

/**
 * Generic cache-through: check Redis first, fallback to live fetch, serve stale on error.
 * Same 3-tier pattern as HindRadar.
 */
export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const r = getRedis();

  // No Redis configured → direct fetch
  if (!r) {
    return fetcher();
  }

  // Tier 1: Try cache
  try {
    const cached = await r.get<T>(key);
    if (cached) {
      return cached;
    }
  } catch {
    // Redis error — fall through to live fetch
  }

  // Tier 2: Live fetch → cache result
  try {
    const result = await fetcher();
    r.set(key, result, { ex: ttl }).catch(() => {});
    return result;
  } catch (fetchError) {
    // Tier 3: Fetch failed → try stale cache
    try {
      const stale = await r.get<T>(key);
      if (stale) return stale;
    } catch {
      // Redis also failed
    }
    throw fetchError;
  }
}

/**
 * Get pre-built catalog data for a category.
 * Returns null if catalog doesn't exist or Redis is unavailable.
 */
export async function getCatalog(categoryId: string): Promise<SearchResponse | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    return await r.get<SearchResponse>(`catalog:${categoryId}`);
  } catch {
    return null;
  }
}

/**
 * Search ALL catalog categories for products matching a keyword.
 * Scans brand + displayName for the query string.
 */
export async function searchCatalog(
  query: string,
  categoryIds: string[]
): Promise<ProductGroup[]> {
  const r = getRedis();
  if (!r) return [];

  const upper = query.toUpperCase();

  try {
    const results = await Promise.allSettled(
      categoryIds.map((id) => r.get<SearchResponse>(`catalog:${id}`))
    );

    const matches: ProductGroup[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value?.comparable) continue;
      for (const product of result.value.comparable) {
        if (
          product.brand.toUpperCase().includes(upper) ||
          product.displayName.toUpperCase().includes(upper) ||
          product.matchKey.toUpperCase().includes(upper)
        ) {
          matches.push(product);
        }
      }
    }

    return matches;
  } catch {
    return [];
  }
}
