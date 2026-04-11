import type {
  RawProduct,
  NormalizedProduct,
  ProductGroup,
  ChainPrice,
} from "./types";
import { CHAINS, KNOWN_BRANDS } from "./constants";

/**
 * Normalize a product name into brand + type + size components.
 * This is the core matching logic — products with the same matchKey
 * across different chains are the SAME product.
 */
export function normalizeProduct(product: RawProduct): NormalizedProduct {
  const upper = product.name.toUpperCase().trim();

  // Extract brand (from known brand list or product.brand field)
  const brand = extractBrand(upper, product.brand);

  // Extract size (e.g., 60L, 50L, 4KG, 10L)
  const size = extractSize(upper);

  // Product type = name without brand and size
  let type = upper;
  if (brand) {
    type = type.replace(new RegExp(escapeRegex(brand), "g"), "").trim();
  }
  type = type
    .replace(/\d+[.,]?\d*\s*(L|KG|G|ML|M3|CM|MM|TK|M)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Match key: brand + size (e.g., "BIOLAN|60L")
  const matchKey = brand && size ? `${brand}|${size}` : "";

  return {
    ...product,
    normalizedBrand: brand,
    normalizedType: type,
    normalizedSize: size,
    matchKey,
  };
}

/**
 * Group products by matchKey (brand + size) and create comparison groups.
 * Returns comparable (2+ chains) and singleChain groups.
 */
export function groupByProduct(products: RawProduct[]): {
  comparable: ProductGroup[];
  singleChain: ProductGroup[];
} {
  // Normalize all products
  const normalized = products.map(normalizeProduct);

  // Group by matchKey
  const groups = new Map<string, NormalizedProduct[]>();
  for (const p of normalized) {
    if (!p.matchKey) continue; // skip products without brand or size
    const existing = groups.get(p.matchKey) || [];

    // Deduplicate: only one product per chain per matchKey
    if (!existing.find((e) => e.chain === p.chain)) {
      existing.push(p);
      groups.set(p.matchKey, existing);
    }
  }

  const comparable: ProductGroup[] = [];
  const singleChain: ProductGroup[] = [];

  for (const [matchKey, prods] of groups) {
    const group = buildProductGroup(matchKey, prods);
    if (group.chainCount >= 2) {
      comparable.push(group);
    } else {
      singleChain.push(group);
    }
  }

  // Sort comparable: chain count desc, then price spread desc
  comparable.sort((a, b) => {
    if (b.chainCount !== a.chainCount) return b.chainCount - a.chainCount;
    return b.priceSpread - a.priceSpread;
  });

  // Sort single chain by price
  singleChain.sort((a, b) => a.cheapestPrice - b.cheapestPrice);

  return { comparable, singleChain };
}

function buildProductGroup(
  matchKey: string,
  products: NormalizedProduct[]
): ProductGroup {
  const chains: ChainPrice[] = products
    .map((p) => {
      const effectivePrice = p.salePrice ?? p.regularPrice;
      const discountPercent =
        p.salePrice && p.regularPrice > 0
          ? Math.round((1 - p.salePrice / p.regularPrice) * 100)
          : null;

      return {
        chain: p.chain,
        chainName: CHAINS[p.chain].name,
        chainColor: CHAINS[p.chain].color,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice,
        effectivePrice,
        productUrl: p.productUrl,
        inStock: p.inStock,
        discountPercent,
      };
    })
    .sort((a, b) => a.effectivePrice - b.effectivePrice);

  const cheapest = chains[0];
  const mostExpensive = chains[chains.length - 1];
  const priceSpread = mostExpensive.effectivePrice - cheapest.effectivePrice;
  const savingsPercent =
    mostExpensive.effectivePrice > 0
      ? Math.round((priceSpread / mostExpensive.effectivePrice) * 100)
      : 0;

  // Best display name: use the longest/most descriptive name
  const displayName =
    products.sort((a, b) => b.name.length - a.name.length)[0]?.name || "";

  // Best image: prefer non-null
  const imageUrl = products.find((p) => p.imageUrl)?.imageUrl || null;

  return {
    matchKey,
    displayName: formatDisplayName(displayName),
    brand: products[0].normalizedBrand,
    size: products[0].normalizedSize,
    category: products[0].category,
    imageUrl,
    chains,
    cheapestChain: cheapest.chain,
    cheapestPrice: cheapest.effectivePrice,
    mostExpensivePrice: mostExpensive.effectivePrice,
    priceSpread,
    savingsPercent,
    chainCount: chains.length,
  };
}

// ─── Helpers ───────────────────────────────────────────────

function extractBrand(upperName: string, rawBrand: string): string {
  // First try the raw brand field
  if (rawBrand) {
    const cleanBrand = rawBrand
      .toUpperCase()
      .replace(/\s*(OÜ|AS|SIA|OY|SRL|SP)\s*$/i, "")
      .trim();
    if (cleanBrand.length > 1 && cleanBrand !== "-") {
      // Map brand variations to canonical names
      if (cleanBrand.includes("BIOLAN")) return "BIOLAN";
      if (cleanBrand.includes("BALTIC AGRO")) return "BALTIC AGRO";
      if (cleanBrand.includes("HORTICOM")) return "HORTICOM";
      if (cleanBrand.includes("MATOGARD")) return "MATOGARD";
      if (cleanBrand.includes("EVERGREEN") || cleanBrand.includes("SUBSTRAL"))
        return "SUBSTRAL";
      if (cleanBrand.includes("BECKY")) return "GREENWORLD";
      if (cleanBrand.includes("TAMMER") || cleanBrand.includes("FISKARS"))
        return "FISKARS";
      return cleanBrand;
    }
  }

  // Fall back to searching in product name
  // Sort brands by length desc to match longer brands first (e.g., "BALTIC AGRO" before "BALTIC")
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    if (upperName.includes(brand)) {
      return brand;
    }
  }

  return "";
}

function extractSize(upperName: string): string {
  // Match patterns: 60L, 50L, 4KG, 1.5L, 280L, 2,0M3, etc.
  const match = upperName.match(
    /(\d+[.,]?\d*)\s*(L|KG|G|ML|M3|CM|MM|TK|M)\b/i
  );
  if (!match) return "";
  const num = match[1].replace(",", ".");
  const unit = match[2].toUpperCase();
  return `${num}${unit}`;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDisplayName(name: string): string {
  // Convert ALL CAPS to Title Case
  if (name === name.toUpperCase()) {
    return name
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase())
      .replace(/\b(L|Kg|G|Ml|M3|Cm|Mm|Tk)\b/gi, (u) => u.toUpperCase());
  }
  return name;
}
