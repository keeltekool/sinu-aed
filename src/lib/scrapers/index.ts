import type { RawProduct } from "../types";
import { KLEVU_CONFIGS } from "../constants";
import { searchKlevu } from "./klevu";
import { searchAlgolia } from "./algolia";
import { searchBauhof } from "./bauhof";

/**
 * Search all 4 chains in parallel. Returns merged results.
 * Graceful degradation: if a chain fails, others still return.
 */
export async function searchAllChains(query: string): Promise<RawProduct[]> {
  const results = await Promise.allSettled([
    searchKlevu(KLEVU_CONFIGS.decora, query),
    searchKlevu(KLEVU_CONFIGS["ehituse-abc"], query),
    searchAlgolia(query),
    searchBauhof(query),
  ]);

  const products: RawProduct[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      products.push(...result.value);
    }
  }

  return products;
}
