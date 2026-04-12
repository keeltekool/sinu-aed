import { Redis } from "@upstash/redis";
import type { SearchResponse } from "./types";

const SEARCH_TTL = 3600; // 1 hour for search results

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
 * Cache-through search: check Redis first, fallback to live fetch, serve stale on error.
 * Same 3-tier pattern as HindRadar.
 */
export async function getCachedSearch(
  query: string,
  fetcher: () => Promise<SearchResponse>
): Promise<SearchResponse> {
  const r = getRedis();
  const key = `search:${query.toLowerCase().trim()}`;

  // No Redis configured → direct fetch
  if (!r) {
    return fetcher();
  }

  // Tier 1: Try cache
  try {
    const cached = await r.get<SearchResponse>(key);
    if (cached) {
      return cached;
    }
  } catch {
    // Redis error — fall through to live fetch
  }

  // Tier 2: Live fetch → cache result
  try {
    const result = await fetcher();
    // Cache in background, don't block response
    r.set(key, result, { ex: SEARCH_TTL }).catch(() => {});
    return result;
  } catch (fetchError) {
    // Tier 3: Fetch failed → try stale cache (no TTL check)
    try {
      const stale = await r.get<SearchResponse>(key);
      if (stale) return stale;
    } catch {
      // Redis also failed
    }
    throw fetchError;
  }
}
