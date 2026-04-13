import type { Deal, DealsResponse, ProductGroup, SearchResponse } from "./types";
import { CATEGORIES, CHAINS } from "./constants";
import { Redis } from "@upstash/redis";

const MAX_DEALS = 20;

/**
 * Aggregate deals from the pre-built catalog.
 * Two deal types:
 * 1. Chain discount — salePrice reported by chain (the -27% badges)
 * 2. Cross-chain spread — same product, cheapest vs most expensive
 *
 * Prioritizes products at 3-4 chains (most popular = most useful to users).
 */
export async function aggregateDeals(): Promise<DealsResponse> {
  // Load all catalog categories from Redis
  const allProducts = await loadCatalogProducts();

  const deals = new Map<string, Deal>();

  for (const group of allProducts) {
    if (group.chainCount < 2) continue;

    // Source 1: Chain-reported discounts within this product group
    for (const chain of group.chains) {
      if (
        chain.discountPercent &&
        chain.discountPercent >= 10 &&
        chain.salePrice &&
        chain.salePrice < chain.regularPrice
      ) {
        const key = `discount:${group.matchKey}:${chain.chain}`;
        const score = computeDiscountScore(chain.discountPercent, group.chainCount);

        if (!deals.has(key) || deals.get(key)!.savingsScore < score) {
          deals.set(key, {
            product: group.displayName,
            brand: group.brand,
            size: group.size,
            imageUrl: group.imageUrl,
            chain: chain.chain,
            chainName: chain.chainName,
            chainColor: chain.chainColor,
            effectivePrice: chain.salePrice,
            regularPrice: chain.regularPrice,
            discountPercent: chain.discountPercent,
            productUrl: chain.productUrl,
            savingsScore: score,
          });
        }
      }
    }

    // Source 2: Cross-chain price spread
    if (group.priceSpread >= 0.5 && group.savingsPercent >= 10) {
      const cheapest = group.chains[0];
      const key = `spread:${group.matchKey}`;
      const score = computeSpreadScore(group.savingsPercent, group.chainCount, group.priceSpread);

      if (!deals.has(key) || deals.get(key)!.savingsScore < score) {
        deals.set(key, {
          product: group.displayName,
          brand: group.brand,
          size: group.size,
          imageUrl: group.imageUrl,
          chain: cheapest.chain,
          chainName: cheapest.chainName,
          chainColor: cheapest.chainColor,
          effectivePrice: cheapest.effectivePrice,
          regularPrice: group.mostExpensivePrice,
          discountPercent: group.savingsPercent,
          productUrl: cheapest.productUrl,
          savingsScore: score,
        });
      }
    }
  }

  // Deduplicate: keep best deal per matchKey
  const bestPerProduct = new Map<string, Deal>();
  for (const deal of deals.values()) {
    const productKey = `${deal.brand}|${deal.size}`;
    const existing = bestPerProduct.get(productKey);
    if (!existing || deal.savingsScore > existing.savingsScore) {
      bestPerProduct.set(productKey, deal);
    }
  }

  const sorted = Array.from(bestPerProduct.values())
    .sort((a, b) => b.savingsScore - a.savingsScore)
    .slice(0, MAX_DEALS);

  return {
    deals: sorted,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Score formula — cross-chain spread is the LEADING indicator.
 *
 * Why: The biggest price spreads reveal loss leaders — products where
 * one chain dumps the price to attract foot traffic. That's the real
 * savings for the user. Chain-reported "discounts" can be inflated.
 *
 * spread deals:  spreadPercent * 2 + chainBonus + eurBonus
 * discount deals: discountPercent * 1 + chainBonus
 *
 * Products at 4 chains get +25 bonus (most popular = most useful).
 * Spreads over €5 get extra +10 (real money saved).
 */
function computeSpreadScore(
  spreadPercent: number,
  chainCount: number,
  spreadEur: number
): number {
  const chainBonus = chainCount >= 4 ? 25 : chainCount >= 3 ? 15 : 0;
  const eurBonus = spreadEur >= 10 ? 20 : spreadEur >= 5 ? 10 : 0;
  return spreadPercent * 2 + chainBonus + eurBonus;
}

function computeDiscountScore(
  discountPercent: number,
  chainCount: number
): number {
  const chainBonus = chainCount >= 4 ? 25 : chainCount >= 3 ? 15 : 0;
  return discountPercent + chainBonus;
}

async function loadCatalogProducts(): Promise<ProductGroup[]> {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  ) {
    return [];
  }

  const redis = Redis.fromEnv();
  const categoryIds = CATEGORIES.map((c) => c.id);
  const allProducts: ProductGroup[] = [];

  const results = await Promise.allSettled(
    categoryIds.map((id) => redis.get<SearchResponse>(`catalog:${id}`))
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.comparable) {
      allProducts.push(...result.value.comparable);
    }
  }

  return allProducts;
}
