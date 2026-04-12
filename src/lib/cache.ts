import { Redis } from "@upstash/redis";

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
