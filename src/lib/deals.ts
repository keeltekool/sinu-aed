import type { Deal, DealsResponse, RawProduct } from "./types";
import { CATEGORIES, CHAINS } from "./constants";
import { searchAllChains } from "./scrapers";
import { groupByProduct, normalizeProduct } from "./matcher";

const MIN_DISCOUNT_PERCENT = 10;
const MIN_SPREAD_PERCENT = 15;
const MIN_SPREAD_EUR = 1.0;
const MAX_DEALS = 10;

/**
 * Aggregate deals from all categories across all chains.
 * Two sources:
 * 1. Allahindlus — chain-reported discounts (salePrice < regularPrice)
 * 2. Parim hind — cross-chain price spread (same product, big price difference)
 */
export async function aggregateDeals(): Promise<DealsResponse> {
  const seedQueries = CATEGORIES.map((c) => c.searchQuery);

  // Search all categories in parallel
  const allProducts: RawProduct[] = [];
  const searchResults = await Promise.allSettled(
    seedQueries.map((q) => searchAllChains(q))
  );

  for (const result of searchResults) {
    if (result.status === "fulfilled") {
      allProducts.push(...result.value);
    }
  }

  const deals = new Map<string, Deal>();

  // Source 1: Allahindlus — chain-reported discounts
  for (const p of allProducts) {
    if (!p.salePrice || p.salePrice >= p.regularPrice || p.regularPrice <= 0)
      continue;

    const discountPercent = Math.round(
      (1 - p.salePrice / p.regularPrice) * 100
    );
    if (discountPercent < MIN_DISCOUNT_PERCENT) continue;

    const normalized = normalizeProduct(p);
    if (!normalized.matchKey) continue;

    const key = normalized.matchKey;
    const existing = deals.get(key);

    // Keep the better deal if duplicate
    if (existing && existing.savingsScore >= discountPercent) continue;

    deals.set(key, {
      product: formatName(p.name),
      brand: normalized.normalizedBrand,
      size: normalized.normalizedSize,
      imageUrl: p.chain !== "bauhof" ? p.imageUrl : null, // skip Bauhof images (CDN blocks)
      chain: p.chain,
      chainName: CHAINS[p.chain].name,
      chainColor: CHAINS[p.chain].color,
      effectivePrice: p.salePrice,
      regularPrice: p.regularPrice,
      discountPercent,
      productUrl: p.productUrl,
      savingsScore: discountPercent,
    });
  }

  // Source 2: Parim hind — cross-chain price spread
  const { comparable } = groupByProduct(allProducts);

  for (const group of comparable) {
    if (group.chainCount < 2) continue;
    if (group.priceSpread < MIN_SPREAD_EUR) continue;
    if (group.savingsPercent < MIN_SPREAD_PERCENT) continue;

    const key = group.matchKey;
    const existing = deals.get(key);

    // Keep whichever source gives higher savings score
    if (existing && existing.savingsScore >= group.savingsPercent) continue;

    const cheapest = group.chains[0];

    // Find best image (non-Bauhof preferred)
    const imageUrl = group.imageUrl;

    deals.set(key, {
      product: group.displayName,
      brand: group.brand,
      size: group.size,
      imageUrl,
      chain: cheapest.chain,
      chainName: cheapest.chainName,
      chainColor: cheapest.chainColor,
      effectivePrice: cheapest.effectivePrice,
      regularPrice: group.mostExpensivePrice,
      discountPercent: group.savingsPercent,
      productUrl: cheapest.productUrl,
      savingsScore: group.savingsPercent,
    });
  }

  // Sort by savings score, take top N
  const sorted = Array.from(deals.values())
    .sort((a, b) => b.savingsScore - a.savingsScore)
    .slice(0, MAX_DEALS);

  return {
    deals: sorted,
    fetchedAt: new Date().toISOString(),
  };
}

function formatName(name: string): string {
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
      .replace(/\b(L|Kg|G|Ml|M3|Cm|Mm|Tk)\b/gi, (u) => u.toUpperCase());
  }
  return name;
}
