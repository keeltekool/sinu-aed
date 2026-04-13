/**
 * Catalog Builder — searches all top brands + category terms at all 4 chains,
 * runs the matcher, assigns products to categories, stores in Redis.
 *
 * Usage: npx tsx scripts/build-catalog.ts
 * Reads Redis credentials from .env.local
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { Redis } from "@upstash/redis";
import { searchAllChains } from "../src/lib/scrapers/index.js";
import { groupByProduct } from "../src/lib/matcher.js";
import type { RawProduct, ProductGroup, SearchResponse } from "../src/lib/types.js";
import { CATEGORIES } from "../src/lib/constants.js";

// ─── Configuration ──────────────────────────────────────────

// TIER 1: 3/3+ chains, 100+ products
const TIER1_BRANDS = [
  "biolan", "baltic agro", "fiskars", "makita",
  "eskaro", "tikkurila", "horticom", "substral",
];

// TIER 2: 2-3/3 chains, 20+ products
const TIER2_BRANDS = [
  "gardena", "sadolin", "vivacolor", "kekkilä", "ryobi",
  "bosch", "pinotex", "scheppach", "prosperplast", "matogard",
  "dewalt", "baltic bark", "cellfast", "husqvarna", "stiga",
  "compo", "biopon", "greenworld", "truper", "caparol", "alpina",
];

// TIER 3: Niche but present
const TIER3_BRANDS = [
  "kärcher", "dlf", "okko", "eesti murud", "ecofertis", "agrozone",
  "mustang", "stoveman", "grillep", "dreamfire", "proflame",
];

const ALL_BRANDS = [...TIER1_BRANDS, ...TIER2_BRANDS, ...TIER3_BRANDS];

// Category terms — catch unbranded products and broaden the net
const CATEGORY_TERMS = [
  "muld", "turvas", "kompost", "aiamaa",
  "väetis", "muruväetis", "aiaväetis",
  "muruseeme",
  "värv", "seinavärv", "puiduvärv", "lakk", "krunt", "peitsi",
  "labidas", "reha", "käärid", "kirves",
  "muruniiduk", "trimmer",
  "kastekann", "voolik",
  "grillsüsi", "grillbrikett", "grillrest", "grill",
];

const ALL_SEARCH_TERMS = [...ALL_BRANDS, ...CATEGORY_TERMS];

// Category assignment: keyword → category ID
// Order matters: most specific first to avoid mis-assignment
const CATEGORY_RULES: { id: string; keywords: string[] }[] = [
  { id: "grill", keywords: ["grill", "süsi", "brikett", "söegrill", "gaasigrill", "grillrest", "süütevedelik", "grillvõre"] },
  { id: "muruhooldus", keywords: ["muruniiduk", "trimmer", "robotniiduk", "murutrimmer", "niiduk"] },
  { id: "muru", keywords: ["muruseeme", "murusegu", "murumaa", "murukasvatus", "seemne", "muruväetis", "murumuld", "muru seeme"] },
  { id: "kastmine", keywords: ["kastekann", "voolik", "pihust", "sprinkler", "kastmissüsteem", "tilkkastmine"] },
  { id: "tooristad", keywords: ["labidas", "reha", "käärid", "kirves", "oksalõikur", "hark", "saag", "aiakäärid", "oksakäärid"] },
  { id: "varvid", keywords: ["värv", "lakk", "krunt", "peitsi", "immutus", "viimistlus", "emailvärv", "lateksvärv"] },
  { id: "vaetised", keywords: ["väetis", "sõnnik", "kanakaka", "lupja", "taimtoit", "biostimulaator", "aiaväetis"] },
  { id: "mullad", keywords: ["muld", "turvas", "kompost", "kasvusegu", "koorekate", "istutussegu", "lillemuld"] },
];

// Batch size: how many search terms to fire in parallel
const BATCH_SIZE = 4;
const BATCH_DELAY_MS = 500;
const CATALOG_TTL = 604800; // 7 days

// ─── Main ───────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Sinu Aed — Catalog Builder");
  console.log("═══════════════════════════════════════\n");

  // Verify Redis connection
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  try {
    await redis.ping();
    console.log("✓ Redis connected\n");
  } catch (e) {
    console.error("✗ Redis connection failed:", e);
    process.exit(1);
  }

  // Phase 1: Search all terms at all chains
  console.log(`Phase 1: Searching ${ALL_SEARCH_TERMS.length} terms at 4 chains...\n`);

  const allRaw: RawProduct[] = [];
  let searchCount = 0;
  let failCount = 0;

  for (let i = 0; i < ALL_SEARCH_TERMS.length; i += BATCH_SIZE) {
    const batch = ALL_SEARCH_TERMS.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(ALL_SEARCH_TERMS.length / BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((term) => searchAllChains(term))
    );

    for (let j = 0; j < results.length; j++) {
      searchCount++;
      const result = results[j];
      const term = batch[j];
      if (result.status === "fulfilled") {
        allRaw.push(...result.value);
        if (result.value.length > 0) {
          process.stdout.write(`  [${batchNum}/${totalBatches}] "${term}" → ${result.value.length} products\n`);
        }
      } else {
        failCount++;
        console.log(`  [${batchNum}/${totalBatches}] "${term}" → FAILED`);
      }
    }

    // Small delay between batches to avoid hammering APIs
    if (i + BATCH_SIZE < ALL_SEARCH_TERMS.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  console.log(`\n✓ Phase 1 complete: ${allRaw.length} raw products from ${searchCount} searches (${failCount} failed)\n`);

  // Phase 2: Deduplicate
  console.log("Phase 2: Deduplicating...");
  const seen = new Set<string>();
  const deduped = allRaw.filter((p) => {
    const key = `${p.chain}:${p.sku || p.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`✓ ${allRaw.length} → ${deduped.length} unique products\n`);

  // Phase 3: Run matcher
  console.log("Phase 3: Running matcher (exact + fuzzy)...");
  const { comparable, singleChain } = groupByProduct(deduped);
  console.log(`✓ ${comparable.length} comparable (2+ chains), ${singleChain.length} single-chain\n`);

  // Phase 4: Assign products to categories
  console.log("Phase 4: Assigning to categories...\n");

  const catalogByCategory = new Map<string, ProductGroup[]>();
  const uncategorized: ProductGroup[] = [];

  // Initialize all categories
  for (const cat of CATEGORIES) {
    catalogByCategory.set(cat.id, []);
  }

  for (const group of comparable) {
    const catId = assignCategory(group);
    if (catId) {
      catalogByCategory.get(catId)!.push(group);
    } else {
      uncategorized.push(group);
    }
  }

  // Report
  let totalCategorized = 0;
  for (const [catId, groups] of catalogByCategory) {
    const label = CATEGORIES.find((c) => c.id === catId)?.label || catId;
    const chainCounts = countByChains(groups);
    console.log(`  ${label.padEnd(22)} ${groups.length} comparable  ${chainCounts}`);
    totalCategorized += groups.length;
  }
  console.log(`  ${"(uncategorized)".padEnd(22)} ${uncategorized.length}`);
  console.log(`\n  TOTAL CATEGORIZED: ${totalCategorized}`);
  console.log(`  TOTAL COMPARABLE:  ${comparable.length}\n`);

  // Phase 5: Store in Redis
  console.log("Phase 5: Storing in Redis...\n");

  const buildTimestamp = new Date().toISOString();

  for (const [catId, groups] of catalogByCategory) {
    // Sort: most chains first, then by price spread
    groups.sort((a, b) => {
      if (b.chainCount !== a.chainCount) return b.chainCount - a.chainCount;
      return b.priceSpread - a.priceSpread;
    });

    const response: SearchResponse = {
      query: CATEGORIES.find((c) => c.id === catId)?.searchQuery || catId,
      comparable: groups,
      singleChain: [], // Don't store singles in catalog — too much data
      totalProducts: groups.length,
      totalChains: 4,
      fetchedAt: buildTimestamp,
    };

    const key = `catalog:${catId}`;
    await redis.set(key, response, { ex: CATALOG_TTL });
    console.log(`  ✓ ${key}: ${groups.length} products`);
  }

  // Store metadata
  const meta = {
    builtAt: buildTimestamp,
    totalComparable: comparable.length,
    totalCategorized,
    uncategorized: uncategorized.length,
    byCategory: Object.fromEntries(
      [...catalogByCategory].map(([k, v]) => [k, v.length])
    ),
    searchTerms: ALL_SEARCH_TERMS.length,
    rawProducts: allRaw.length,
    uniqueProducts: deduped.length,
  };
  await redis.set("catalog:meta", meta, { ex: CATALOG_TTL });
  console.log(`  ✓ catalog:meta`);

  console.log("\n═══════════════════════════════════════");
  console.log(`  BUILD COMPLETE`);
  console.log(`  ${totalCategorized} categorized comparable products`);
  console.log(`  ${comparable.length} total comparable`);
  console.log(`  Built at: ${buildTimestamp}`);
  console.log("═══════════════════════════════════════\n");
}

// ─── Helpers ────────────────────────────────────────────────

function assignCategory(group: ProductGroup): string | null {
  const name = group.displayName.toUpperCase();
  const brand = group.brand.toUpperCase();

  // Check each category rule in priority order
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (name.includes(keyword.toUpperCase())) {
        return rule.id;
      }
    }
  }

  // Fallback: use brand → typical category mapping
  const brandCategoryMap: Record<string, string> = {
    BIOLAN: "mullad",
    "KEKKILÄ": "mullad",
    KEKKILA: "mullad",
    MATOGARD: "mullad",
    GREENWORLD: "mullad",
    "BALTIC BARK": "mullad",
    "BALTIC AGRO": "vaetised",
    SUBSTRAL: "vaetised",
    BIOPON: "vaetised",
    ECOFERTIS: "vaetised",
    TIKKURILA: "varvid",
    ESKARO: "varvid",
    VIVACOLOR: "varvid",
    SADOLIN: "varvid",
    PINOTEX: "varvid",
    CAPAROL: "varvid",
    ALPINA: "varvid",
    FISKARS: "tooristad",
    TRUPER: "tooristad",
    MAKITA: "muruhooldus",
    RYOBI: "muruhooldus",
    HUSQVARNA: "muruhooldus",
    SCHEPPACH: "muruhooldus",
    STIGA: "muruhooldus",
    BOSCH: "muruhooldus",
    GARDENA: "kastmine",
    CELLFAST: "kastmine",
    "KÄRCHER": "kastmine",
    KARCHER: "kastmine",
    PROSPERPLAST: "kastmine",
    MUSTANG: "grill",
    STOVEMAN: "grill",
    GRILLEP: "grill",
    DREAMFIRE: "grill",
    PROFLAME: "grill",
  };

  const mapped = brandCategoryMap[brand];
  if (mapped) return mapped;

  return null;
}

function countByChains(groups: ProductGroup[]): string {
  let c2 = 0, c3 = 0, c4 = 0;
  for (const g of groups) {
    if (g.chainCount === 2) c2++;
    else if (g.chainCount === 3) c3++;
    else if (g.chainCount >= 4) c4++;
  }
  const parts: string[] = [];
  if (c4 > 0) parts.push(`${c4}×4chains`);
  if (c3 > 0) parts.push(`${c3}×3chains`);
  if (c2 > 0) parts.push(`${c2}×2chains`);
  return parts.join(", ");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Run ────────────────────────────────────────────────────

main().catch((e) => {
  console.error("BUILD FAILED:", e);
  process.exit(1);
});
