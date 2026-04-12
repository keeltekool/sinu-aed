# Catalog Expansion: 74 → 200 Comparable Products

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand from 74 to 200+ comparable products by updating categories, adding brand-based searches, increasing API limits, and improving the product matcher.

**Architecture:** Three workstreams executed in sequence. (1) Update constants.ts with final 7 categories, each with multiple search terms including brand names. (2) Increase scraper API limits from 30→80. (3) Add two-pass matching — pass 1: brand+size (existing), pass 2: brand+shared-significant-words for products that fail pass 1. Update deals.ts and home page to use new categories. Verify with real comparable count before and after.

**Tech Stack:** Existing Next.js codebase, no new dependencies.

---

## Baseline Measurement (run BEFORE any changes)

```bash
# Save this output — it's our "before" number
cd C:\Users\Kasutaja\Claude_Projects\hind-compare
node -e "..." # (test script from below)
```

Use the self-contained test script at the bottom of this plan to count comparable products with current code. Expected: ~74.

---

### Task 1: Update categories + search terms in constants.ts

**Files:**
- Modify: `src/lib/constants.ts:51-80` (CATEGORIES array)
- Modify: `src/lib/types.ts` (Category interface — add `searchTerms` field)

**Step 1:** Add `searchTerms: string[]` to `Category` interface in types.ts:

```typescript
export interface Category {
  id: string;
  label: string;
  icon: string;
  searchQuery: string;        // primary term (used for URL routing)
  searchTerms: string[];      // ALL terms to search (categories + brands)
}
```

**Step 2:** Replace CATEGORIES array in constants.ts with final 7:

```typescript
export const CATEGORIES: Category[] = [
  {
    id: "mullad",
    label: "Mullad ja turbad",
    icon: "potted_plant",
    searchQuery: "muld",
    searchTerms: ["muld", "turvas", "kompost", "kasvusegu", "koorekate", "biolan muld", "kekkilä", "grass muld", "matogard", "compo muld", "horticom muld", "greenworld"],
  },
  {
    id: "vaetised",
    label: "Väetised",
    icon: "grass",
    searchQuery: "väetis",
    searchTerms: ["väetis", "sõnnik", "kanakaka", "lupja", "merevetikas", "baltic agro väetis", "biolan väetis", "substral", "biopon", "compo väetis", "ecofertis"],
  },
  {
    id: "muru",
    label: "Muru",
    icon: "yard",
    searchQuery: "muru",
    searchTerms: ["muruseeme", "muruväetis", "murumuld", "murusegu", "muru", "baltic agro muru"],
  },
  {
    id: "varvid",
    label: "Värvid ja lakid",
    icon: "format_paint",
    searchQuery: "värv",
    searchTerms: ["värv", "lakk", "peitsi", "krunt", "immutus", "tikkurila", "eskaro", "vivacolor", "sadolin", "pinotex", "caparol"],
  },
  {
    id: "tooristad",
    label: "Aiatööriistad",
    icon: "carpenter",
    searchQuery: "aiatööriist",
    searchTerms: ["fiskars", "gardena tööriist", "labidas", "reha", "käärid", "kirves", "saag aia", "cellfast"],
  },
  {
    id: "muruhooldus",
    label: "Muruhooldus",
    icon: "agriculture",
    searchQuery: "muruniiduk",
    searchTerms: ["muruniiduk", "trimmer", "multš", "murutrimmer", "makita trimmer", "gardena niiduk", "bosch niiduk", "ryobi", "husqvarna"],
  },
  {
    id: "kastmine",
    label: "Kastmistarvikud",
    icon: "water_drop",
    searchQuery: "kastmine",
    searchTerms: ["kastekann", "voolik", "pihust", "kastmis", "gardena kastmine", "cellfast voolik", "sprinkler"],
  },
];
```

**Step 3:** Commit: `feat: update to final 7 garden categories with multi-term search`

---

### Task 2: Increase API limits in all scrapers

**Files:**
- Modify: `src/lib/scrapers/klevu.ts:28` — change `limit = 30` to `limit = 80`
- Modify: `src/lib/scrapers/algolia.ts:23` — change `limit = 30` to `limit = 80`
- Modify: `src/lib/scrapers/bauhof.ts:15` — change `limit = 32` to `limit = 80`

**Step 1:** In klevu.ts line 28: `limit = 30` → `limit = 80`
**Step 2:** In algolia.ts, change `hitsPerPage=30` default to `hitsPerPage=80`
**Step 3:** In bauhof.ts line 15: `limit = 32` → `limit = 80` (note: Bauhof may still cap at 32 due to __NUXT__ pagination, but setting higher doesn't hurt)

**Step 4:** Commit: `feat: increase API limits from 30 to 80 per chain per search`

---

### Task 3: Add two-pass matcher — significant words overlap

**Files:**
- Modify: `src/lib/matcher.ts` — add `fuzzyMatchPass()` after primary grouping

**Step 1:** After the primary `groupByProduct` loop (which creates groups by exact matchKey), add a second pass that tries to merge single-chain products with existing groups based on word overlap.

Add new function `fuzzyMerge`:

```typescript
function fuzzyMerge(
  comparable: Map<string, NormalizedProduct[]>,
  singles: NormalizedProduct[]
): void {
  for (const product of singles) {
    if (!product.normalizedBrand) continue;

    // Extract significant words (4+ chars, not numbers, not brand)
    const words = getSignificantWords(product.name, product.normalizedBrand);
    if (words.length < 2) continue;

    // Try to find a matching group
    for (const [key, group] of comparable) {
      // Must be same brand
      if (!key.startsWith(product.normalizedBrand + "|")) continue;
      // Must not already have this chain
      if (group.find(p => p.chain === product.chain)) continue;

      // Check word overlap with any product in the group
      for (const existing of group) {
        const existingWords = getSignificantWords(existing.name, existing.normalizedBrand);
        const shared = words.filter(w => existingWords.includes(w));
        if (shared.length >= 2) {
          group.push(product);
          break;  // merged, move to next single
        }
      }
    }
  }
}

function getSignificantWords(name: string, brand: string): string[] {
  return name
    .toUpperCase()
    .replace(new RegExp(escapeRegex(brand), "g"), "")
    .split(/[^A-ZÄÖÜÕŠŽ0-9]+/)
    .filter(w => w.length >= 3 && !/^\d+$/.test(w));
}
```

**Step 2:** Integrate into `groupByProduct`:
- After building `groups` Map from exact matchKey
- Collect single-chain products (groups with 1 chain)
- Run `fuzzyMerge(multiChainGroups, singleChainProducts)`
- Re-evaluate groups: some singles may now be in multi-chain groups

**Step 3:** Commit: `feat: add two-pass matcher with word-overlap fuzzy matching`

---

### Task 4: Build catalog builder with brand-based searching

**Files:**
- Create: `src/lib/catalog.ts`

**Step 1:** Create `buildCatalog()` function that:

```typescript
import { CATEGORIES } from "./constants";
import { searchAllChains } from "./scrapers";
import { groupByProduct } from "./matcher";
import type { RawProduct, ProductGroup } from "./types";

export async function buildCatalog(): Promise<{
  comparable: ProductGroup[];
  singleChain: ProductGroup[];
  totalRaw: number;
}> {
  const allRaw: RawProduct[] = [];

  // Search ALL terms from ALL categories
  const allTerms = CATEGORIES.flatMap(c => c.searchTerms);
  // Deduplicate
  const uniqueTerms = [...new Set(allTerms)];

  // Search in batches of 4 to avoid overwhelming APIs
  for (let i = 0; i < uniqueTerms.length; i += 4) {
    const batch = uniqueTerms.slice(i, i + 4);
    const results = await Promise.allSettled(
      batch.map(term => searchAllChains(term))
    );
    for (const r of results) {
      if (r.status === "fulfilled") allRaw.push(...r.value);
    }
  }

  // Deduplicate raw products by chain+sku
  const seen = new Set<string>();
  const deduped = allRaw.filter(p => {
    const key = `${p.chain}:${p.sku || p.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const { comparable, singleChain } = groupByProduct(deduped);

  return { comparable, singleChain, totalRaw: deduped.length };
}
```

**Step 2:** Commit: `feat: add catalog builder with brand-based multi-term search`

---

### Task 5: Update deals.ts to use catalog builder

**Files:**
- Modify: `src/lib/deals.ts`

**Step 1:** Replace the manual seed query loop with `buildCatalog()`:

```typescript
import { buildCatalog } from "./catalog";

export async function aggregateDeals(): Promise<DealsResponse> {
  const { comparable } = await buildCatalog();
  // ... rest of deal extraction from comparable groups
}
```

Wait — this would make deals too slow (searches ALL terms). Instead, keep deals using `CATEGORIES.map(c => c.searchQuery)` (just the primary terms, 7 queries). The catalog builder is for the full index.

**Actually: no change needed to deals.ts.** It already uses `CATEGORIES.map(c => c.searchQuery)` which will automatically pick up the new 7 categories. Keep deals lightweight.

**Step 2:** Commit: (skip — no changes needed)

---

### Task 6: Update home page CategoryGrid

**Files:**
- Modify: `src/components/CategoryGrid.tsx` — already reads from CATEGORIES, should auto-update

**Step 1:** Verify CategoryGrid still works with new categories. The `searchQuery` field is used for the link — user taps "Mullad ja turbad" → navigates to `/search?q=muld`. This still works.

**Step 2:** The search results page fetches `/api/search?q=muld` which calls `searchAllChains("muld")`. This gives 30-80 products per chain for that ONE term. For the full catalog depth, we'd need to search ALL `searchTerms` for the category.

**Important change:** Update `/api/search` to detect when query matches a category's primary `searchQuery`, and if so, search ALL that category's `searchTerms` instead of just the one query.

**Modify:** `src/app/api/search/route.ts`:

```typescript
import { CATEGORIES } from "../../../lib/constants";

// Check if query matches a category — if so, use all search terms
const category = CATEGORIES.find(c => c.searchQuery === query.toLowerCase());
const searchTerms = category ? category.searchTerms : [query];

// Search all terms
const allRaw: RawProduct[] = [];
for (const term of searchTerms) {
  const results = await searchAllChains(term);
  allRaw.push(...results);
}
// Deduplicate + group
```

**Step 3:** Commit: `feat: category searches use all search terms for deeper results`

---

### Task 7: Build + deploy + E2E verify comparable count

**Step 1:** `npm run build` — must pass clean

**Step 2:** Run the comparable count test script BEFORE deploying to measure improvement:

```bash
cd C:\Users\Kasutaja\Claude_Projects\hind-compare
node test-catalog.mjs
```

Test script (create as `test-catalog.mjs` — delete after):

```javascript
// Self-contained test — hits live APIs, counts comparable products
// Run AFTER code changes, BEFORE deploy
// Uses the same search terms as the new CATEGORIES
const categories = [
  ["muld", "turvas", "kompost", "biolan muld", "kekkilä", "grass muld", "matogard", "compo muld"],
  ["väetis", "sõnnik", "baltic agro väetis", "biolan väetis", "substral", "biopon"],
  ["muruseeme", "muruväetis", "murumuld"],
  ["värv", "lakk", "peitsi", "tikkurila", "eskaro", "vivacolor", "sadolin", "pinotex"],
  ["fiskars", "gardena", "labidas", "reha", "käärid"],
  ["muruniiduk", "trimmer", "makita trimmer", "gardena niiduk", "bosch niiduk"],
  ["kastekann", "voolik", "gardena kastmine", "cellfast"],
];
// ... (search + match + count logic)
// Expected output: "TOTAL COMPARABLE: XXX"
```

**Step 3:** Expected results:
- Before: 74 comparable
- After: 150-200+ comparable
- If below 150: investigate which categories underperform, add more brand terms

**Step 4:** Commit all: `feat: catalog expansion — 7 categories, brand search, fuzzy matcher`

**Step 5:** `npx vercel --yes --prod`

**Step 6:** `git push origin master`

**Step 7:** E2E verification on live site:
- Search "muld" → should show more comparable products than before
- Search "tikkurila" → should match across chains
- Search "fiskars" → should now show more than 3 comparable
- Check deals section → should have more deals from broader catalog

---

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `src/lib/types.ts` | Add `searchTerms: string[]` to Category |
| Modify | `src/lib/constants.ts` | New 7 categories with multi-term search + brand names |
| Modify | `src/lib/scrapers/klevu.ts:28` | limit 30→80 |
| Modify | `src/lib/scrapers/algolia.ts` | hitsPerPage 30→80 |
| Modify | `src/lib/scrapers/bauhof.ts:15` | limit 32→80 |
| Modify | `src/lib/matcher.ts` | Add fuzzyMerge two-pass matching |
| Modify | `src/app/api/search/route.ts` | Category-aware multi-term search |
| Create | `src/lib/catalog.ts` | Full catalog builder (for future use) |

## Risk Flags

- **API rate limiting:** 7 categories × ~10 terms × 4 chains = ~280 API calls for full catalog build. Batch in groups of 4 to avoid hammering.
- **Bauhof max 32 per search:** Can't increase beyond what __NUXT__ returns. Multiple search terms compensate.
- **Fuzzy matching false positives:** "Fiskars labidas Solid" matching "Fiskars käärid Solid" because they share brand + "Solid". Mitigate by requiring 2+ shared significant words AND excluding common words like "SOLID", "CLASSIC", "PRO".
- **Search response time:** Category searches with 10 terms × 4 chains = 40 API calls. Cache aggressively (1h TTL). First hit slow (~10s), subsequent instant.
