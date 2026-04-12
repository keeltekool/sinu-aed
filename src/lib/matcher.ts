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
// Tool/equipment brands that should match by MODEL NUMBER, not size
const TOOL_BRANDS = new Set([
  "FISKARS", "MAKITA", "GARDENA", "BOSCH", "RYOBI", "DEWALT",
  "HUSQVARNA", "SCHEPPACH", "EINHELL", "HYUNDAI", "CLINT", "GUDNORD",
  "SUNSEEKER", "ECOVACS",
]);

export function normalizeProduct(product: RawProduct): NormalizedProduct {
  const upper = product.name.toUpperCase().trim();

  // Extract brand (from known brand list or product.brand field)
  const brand = extractBrand(upper, product.brand);

  // For tool brands: extract model number as the match identifier
  // For garden/supply brands: extract size (volume/weight)
  const isTool = TOOL_BRANDS.has(brand);
  let size: string;
  let matchKey: string;

  if (isTool) {
    const model = extractModelNumber(upper);
    size = model || extractSize(upper);
    matchKey = brand && (model || size) ? `${brand}|${model || size}` : "";
  } else {
    size = extractSize(upper);
    matchKey = brand && size ? `${brand}|${size}` : "";
  }

  // Product type = name without brand and size
  let type = upper;
  if (brand) {
    type = type.replace(new RegExp(escapeRegex(brand), "g"), "").trim();
  }
  type = type
    .replace(/\d+[.,]?\d*\s*(L|KG|G|ML|M3|CM|MM|TK|M)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

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

  // Best image: prefer Espak/Ehituse ABC/Decora (accessible), avoid Bauhof (CDN blocks)
  const imageUrl =
    products.find((p) => p.imageUrl && p.chain !== "bauhof")?.imageUrl ||
    products.find((p) => p.imageUrl)?.imageUrl ||
    null;

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

function extractModelNumber(upperName: string): string {
  // Tool model numbers: UPX86, DUR189Z, SW73, ARM 34, AFS 23-37, etc.
  // Pattern: alphanumeric codes that are NOT pure numbers and NOT sizes
  const patterns = [
    // Fiskars models: UPX86, UP69, SW73, P541, P341, P121, L86, L31
    /\b([A-Z]{1,3}\d{2,4}[A-Z]?)\b/,
    // Makita models: DUR189Z, DUR368AZ, UR3000, DUR194RTX1
    /\b(D?[A-Z]{2,3}\d{3,4}[A-Z]{0,4}\d?)\b/,
    // Gardena models: POWERMAX 32/18V, COMFORTCUT 23/18V — use the product line name
    /\b(POWERMAX|COMFORTCUT|EASYCUT|SMALLCUT|EASYTRIM|POWERTRIM|HANDYMOWER|POWERCUT)\s+(\d+)/,
    // Bosch models: ARM 34, ART 27, AFS 23-37, CITYMOWER, EASYMOWER, UNIVERSALROTAK
    /\b(ARM|ART|AFS|CITYMOWER|EASYMOWER|UNIVERSALROTAK|ADVANCEDROTAK|EASYGRASSCUT)\s*(\d*)/,
    // Generic: CLINT CL-560CJ, GUDNORD 464
    /\b(CL-\w+|ZERO|[A-Z]{2,}-\w+)\b/,
  ];

  for (const re of patterns) {
    const m = upperName.match(re);
    if (m) {
      // Return the full match, cleaned up
      return m[0].replace(/\s+/g, "").toUpperCase();
    }
  }

  return "";
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
