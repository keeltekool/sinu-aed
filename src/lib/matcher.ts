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
    // Include first product-type keyword in matchKey to prevent false matches
    // e.g. KEKKILÄ|MURUVÄETIS|10L vs KEKKILÄ|KASVUTURVAS|10L
    const typeWord = extractProductType(upper, brand);
    matchKey = brand && size ? `${brand}|${typeWord ? typeWord + "|" : ""}${size}` : "";
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

  // Pass 2: fuzzy merge — try to add single-chain products to multi-chain groups
  fuzzyMerge(groups);

  const comparable: ProductGroup[] = [];
  const singleChain: ProductGroup[] = [];

  for (const [matchKey, prods] of groups) {
    const group = buildProductGroup(matchKey, prods);
    if (group.chainCount >= 2) {
      // Price sanity filter: if most expensive is >3x cheapest, it's a false match
      const ratio = group.mostExpensivePrice / group.cheapestPrice;
      if (ratio > 3) continue; // skip false matches
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

// ─── Fuzzy Matching (Pass 2) ──────────────────────────────

// Words too generic for fuzzy matching — would cause false positives
const STOP_WORDS = new Set([
  "SOLID", "CLASSIC", "PRO", "PLUS", "PREMIUM", "STANDARD",
  "SET", "KOMPLEKT", "UUS", "NEW", "MINI", "MAXI", "GARDEN",
  "AIA", "AIAMAA", "MUST", "MULD", "TURVAS",
]);

function fuzzyMerge(groups: Map<string, NormalizedProduct[]>): void {
  // Find multi-chain groups and single-chain products
  const multiChainKeys: string[] = [];
  const singleProducts: { key: string; product: NormalizedProduct }[] = [];

  for (const [key, prods] of groups) {
    const chains = new Set(prods.map(p => p.chain));
    if (chains.size >= 2) {
      multiChainKeys.push(key);
    } else if (prods.length === 1) {
      singleProducts.push({ key, product: prods[0] });
    }
  }

  const merged = new Set<string>();

  for (const { key: singleKey, product } of singleProducts) {
    if (!product.normalizedBrand) continue;

    const words = getSignificantWords(product.name, product.normalizedBrand);
    if (words.length < 2) continue;

    for (const multiKey of multiChainKeys) {
      // Must be same brand
      if (!multiKey.startsWith(product.normalizedBrand + "|")) continue;

      const group = groups.get(multiKey)!;
      // Must not already have this chain
      if (group.find(p => p.chain === product.chain)) continue;

      // Check word overlap with any product in the group
      let matched = false;
      for (const existing of group) {
        const existingWords = getSignificantWords(existing.name, existing.normalizedBrand);
        const shared = words.filter(w => existingWords.includes(w));
        if (shared.length >= 2) {
          group.push(product);
          merged.add(singleKey);
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  // Remove merged single-product groups
  for (const key of merged) {
    groups.delete(key);
  }
}

function getSignificantWords(name: string, brand: string): string[] {
  return name
    .toUpperCase()
    .replace(new RegExp(escapeRegex(brand), "g"), "")
    .split(/[^A-ZÄÖÜÕŠŽ0-9]+/)
    .filter(w => w.length >= 3 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));
}

// ─── Helpers ───────────────────────────────────────────────

// Product-type keywords that distinguish different products from the same brand+size
// e.g. "Biolan AIAMAA must muld 60L" vs "Biolan MUSTIKAMULD 50L"
const TYPE_KEYWORDS = [
  // Mullad
  "AIAMAA", "MUSTIKA", "KURGI", "TOMATI", "KASVUTURVAS", "LILLEMULD", "MURUMULD",
  "PIKEERIMIS", "KÜLVI", "KÖÖGIVILJA", "ROOSI", "RODO", "TURVAS",
  // Väetised
  "MURUVÄETIS", "AIAVÄETIS", "KEVADVÄETIS", "SÜGISVÄETIS", "UNIVERSAAL",
  "KANAKAKA", "LUBI", "LUPJA",
  // Värvid
  "SEINAVÄRV", "FASSAADIVÄRV", "PUIDUVÄRV", "EMAILVÄRV", "LAKK",
  "KRUNT", "PEITSI", "IMMUTUS", "AKRIT", "HARMONY", "BINDO", "ULTRA",
  // Grill
  "GRILLSÜSI", "BRIKETT", "GRILLREST",
  // Generic product types
  "KOMPOST", "KOOREKATE", "MULTŠ",
];

function extractProductType(upperName: string, brand: string): string {
  // Remove brand from name to avoid matching brand name as type
  let name = upperName;
  if (brand) {
    name = name.replace(new RegExp(escapeRegex(brand), "g"), "").trim();
  }

  // Find first matching type keyword
  for (const keyword of TYPE_KEYWORDS) {
    if (name.includes(keyword)) {
      return keyword;
    }
  }

  // Fallback: extract first word (3+ chars, not a number) as the type identifier
  const words = name
    .split(/[^A-ZÄÖÜÕŠŽ]+/)
    .filter((w) => w.length >= 4 && !/^\d+$/.test(w));

  return words[0] || "";
}

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
