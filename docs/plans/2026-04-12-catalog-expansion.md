# Catalog Expansion: 58 → 200+ Comparable Products

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand from 58 to 200+ comparable cross-chain products by switching to brand-first multi-term search, increasing API limits, and adding fuzzy matching for tools/equipment.

**Architecture:** Three workstreams in sequence. (1) Data layer: new Category type with `searchTerms[]`, final 7 categories with brand names per category, expanded KNOWN_BRANDS list. (2) Scrapers: increase limits from 30→80. (3) Matching + search: two-pass matcher (exact → fuzzy word overlap), search API detects category queries and searches ALL terms. No new files — all changes in existing modules.

**Tech Stack:** Existing Next.js 16 codebase, no new dependencies.

**Baseline (measured 2026-04-12):** 58 unique comparable products across 8 categories.

---

## Task 1: Update types.ts — add `searchTerms` to Category

**Files:**
- Modify: `src/lib/types.ts:68-73`

**Change:** Add `searchTerms: string[]` to Category interface:

```typescript
export interface Category {
  id: string;
  label: string;
  icon: string;
  searchQuery: string;        // primary term (URL routing, deals, free search)
  searchTerms: string[];      // ALL terms to search when browsing this category
}
```

**Why both fields:** `searchQuery` stays for lightweight uses (deals aggregation, URL params). `searchTerms` is the deep list used when a user taps a category tile — searches ALL brand names + synonyms to maximize cross-chain hits.

---

## Task 2: Update constants.ts — 7 categories + searchTerms + missing brands

**Files:**
- Modify: `src/lib/constants.ts:51-80` (CATEGORIES array)
- Modify: `src/lib/constants.ts:82-139` (KNOWN_BRANDS array)

### Step 1: Replace CATEGORIES with final 7

```typescript
export const CATEGORIES: Category[] = [
  {
    id: "mullad",
    label: "Mullad ja turbad",
    icon: "potted_plant",
    searchQuery: "muld",
    searchTerms: ["muld", "turvas", "kompost", "kasvusegu", "koorekate", "biolan muld", "kekkilä", "grass muld", "matogard", "compo muld", "horticom muld", "greenworld", "baltic bark"],
  },
  {
    id: "vaetised",
    label: "Väetised",
    icon: "grass",
    searchQuery: "väetis",
    searchTerms: ["väetis", "sõnnik", "kanakaka", "lupja", "baltic agro väetis", "biolan väetis", "substral", "biopon", "compo väetis", "ecofertis", "horticom väetis"],
  },
  {
    id: "muru",
    label: "Muru",
    icon: "yard",
    searchQuery: "muru",
    searchTerms: ["muruseeme", "muruväetis", "murumuld", "murusegu", "muru", "baltic agro muru", "dlf muru", "substral muru"],
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
    searchTerms: ["fiskars", "gardena", "labidas", "reha", "käärid", "kirves", "saag", "cellfast", "oksalõikur"],
  },
  {
    id: "muruhooldus",
    label: "Muruhooldus",
    icon: "agriculture",
    searchQuery: "muruniiduk",
    searchTerms: ["muruniiduk", "trimmer", "murutrimmer", "makita trimmer", "gardena niiduk", "bosch niiduk", "ryobi", "husqvarna", "scheppach", "stiga"],
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

**Dropped from old 8:** Seemned (low comparable: 2), Lillepotid (0 comparable).
**Added:** Muru (was missing — grass seed/lawn care is distinct from väetised).

### Step 2: Add missing brands to KNOWN_BRANDS

Brands from the confidence report NOT already in the list:

```typescript
// Add these to KNOWN_BRANDS array:
"CELLFAST",     // CELL-FAST already there, but chains may use "CELLFAST"
"DLF",          // lawn seeds
"OKKO",         // lawn seeds
"EESTI MURUD",  // Estonian lawn seed brand
"STIGA",        // lawn mowers
"ALPINA",       // paints
"TRUPER",       // tools
"AGROZONE",     // lawn care
"KÄRCHER",      // watering/pressure washers
"KARCHER",      // ASCII variant
```

---

## Task 3: Increase API limits 30→80 in all scrapers

**Files:**
- Modify: `src/lib/scrapers/klevu.ts:28` — `limit = 30` → `limit = 80`
- Modify: `src/lib/scrapers/algolia.ts:23` — `limit = 30` → `limit = 80`
- Modify: `src/lib/scrapers/bauhof.ts:15` — `limit = 32` → `limit = 80`

Three one-line changes. Bauhof's __NUXT__ may still cap lower (HTML pagination), but setting higher doesn't hurt — it just won't return more than the page contains.

---

## Task 4: Add fuzzyMerge two-pass matcher

**Files:**
- Modify: `src/lib/matcher.ts`

**Problem:** Current matcher only groups by exact `brand|size` or `brand|model`. Products like "Fiskars Solid Ümbersetuslabidas" at Bauhof and "Fiskars Solid spade" at Espak don't match because size/model extraction fails.

**Solution:** After exact matching, run a second pass on single-chain products. For each single, find an existing multi-chain group with:
1. Same brand
2. 2+ shared significant words (4+ chars, not brand name, not pure numbers)
3. Group doesn't already have this chain

Add these functions to matcher.ts:

```typescript
function fuzzyMerge(
  groups: Map<string, NormalizedProduct[]>
): void {
  // Separate multi-chain groups from singles
  const multiChain = new Map<string, NormalizedProduct[]>();
  const singles: NormalizedProduct[] = [];

  for (const [key, prods] of groups) {
    const chains = new Set(prods.map(p => p.chain));
    if (chains.size >= 2) {
      multiChain.set(key, prods);
    } else {
      singles.push(...prods);
    }
  }

  for (const product of singles) {
    if (!product.normalizedBrand) continue;

    const words = getSignificantWords(product.name, product.normalizedBrand);
    if (words.length < 2) continue;

    let merged = false;
    for (const [key, group] of multiChain) {
      if (!key.startsWith(product.normalizedBrand + "|")) continue;
      if (group.find(p => p.chain === product.chain)) continue;

      for (const existing of group) {
        const existingWords = getSignificantWords(existing.name, existing.normalizedBrand);
        const shared = words.filter(w => existingWords.includes(w));
        if (shared.length >= 2) {
          group.push(product);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }

    // Also try to form NEW multi-chain groups from singles
    if (!merged) {
      // Check other singles for brand + word overlap
      // (handled by the existing exact-match grouping — singles that share
      //  a matchKey are already grouped. Fuzzy is only for cross-key merging.)
    }
  }
}

// Words that are common product descriptors — exclude from fuzzy matching
const STOP_WORDS = new Set([
  "SOLID", "CLASSIC", "PRO", "PLUS", "PREMIUM", "STANDARD",
  "SET", "KOMPLEKT", "UUS", "NEW", "MINI", "MAXI", "GARDEN",
]);

function getSignificantWords(name: string, brand: string): string[] {
  return name
    .toUpperCase()
    .replace(new RegExp(escapeRegex(brand), "g"), "")
    .split(/[^A-ZÄÖÜÕŠŽ0-9]+/)
    .filter(w => w.length >= 3 && !/^\d+$/.test(w) && !STOP_WORDS.has(w));
}
```

**Integration:** Call `fuzzyMerge(groups)` in `groupByProduct()` AFTER the exact matchKey grouping loop, BEFORE splitting into comparable/singleChain.

---

## Task 5: Update search API — category-aware multi-term search

**Files:**
- Modify: `src/app/api/search/route.ts`

**Current flow:** `searchAllChains(query)` → one search term → 4 chains → ~120 raw products.

**New flow for category queries:**
1. Check if `query.toLowerCase()` matches any category's `searchQuery`
2. If yes → search ALL that category's `searchTerms` (7-13 terms × 4 chains)
3. Deduplicate raw products by `chain + sku` (or `chain + name` if no sku)
4. Run through matcher as before

**If no category match** (free text like "biolan" or "fiskars labidas") → single term search as before.

**Cache key:** `search:${query.toLowerCase()}` — same as now. Category results get cached as one blob per primary term.

```typescript
import { CATEGORIES } from "../../../lib/constants";

// Inside the getCached callback:
const category = CATEGORIES.find(
  c => c.searchQuery.toLowerCase() === query.toLowerCase()
);
const searchTerms = category ? category.searchTerms : [query];

const allRaw: RawProduct[] = [];
// Search terms in batches of 3 to avoid overwhelming APIs
for (let i = 0; i < searchTerms.length; i += 3) {
  const batch = searchTerms.slice(i, i + 3);
  const batchResults = await Promise.allSettled(
    batch.map(term => searchAllChains(term))
  );
  for (const r of batchResults) {
    if (r.status === "fulfilled") allRaw.push(...r.value);
  }
}

// Deduplicate by chain + sku (or chain + name)
const seen = new Set<string>();
const deduped = allRaw.filter(p => {
  const key = `${p.chain}:${p.sku || p.name}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

const { comparable, singleChain } = groupByProduct(deduped);
```

**Deals stays untouched.** `deals.ts` uses `CATEGORIES.map(c => c.searchQuery)` — now 7 primary terms instead of 8. Lightweight, auto-updates.

**CategoryGrid stays untouched.** Reads from CATEGORIES constant, auto-renders 7 tiles instead of 8.

---

## Task 6: npm run build — must pass clean

Zero TypeScript errors, zero warnings. Fix anything that breaks.

---

## Task 7: Deploy + E2E verify comparable count

### Step 1: Run comparable count test against local dev

```bash
# Start dev server, then hit local API
node -e "
const queries = ['muld','väetis','muru','värv','aiatööriist','muruniiduk','kastmine'];
async function run() {
  let total = 0;
  const seen = new Set();
  for (const q of queries) {
    const res = await fetch('http://localhost:3000/api/search?q=' + encodeURIComponent(q));
    const data = await res.json();
    const newComps = (data.comparable || []).filter(p => !seen.has(p.matchKey));
    newComps.forEach(p => seen.add(p.matchKey));
    total += newComps.length;
    console.log(q + ': ' + (data.comparable||[]).length + ' comparable, ' + newComps.length + ' new unique');
  }
  console.log('TOTAL UNIQUE COMPARABLE: ' + total);
  console.log('TARGET: 200+');
  console.log(total >= 150 ? 'PASS' : 'NEEDS MORE WORK');
}
run().catch(console.error);
"
```

**Expected:** 150-200+ comparable. If below 150, investigate which categories underperform and add more search terms.

### Step 2: Deploy

```bash
npx vercel --yes --prod
```

### Step 3: Verify on live site

```bash
git push origin master
```

### Step 4: E2E smoke tests on live URL

- Search "muld" → more comparable products than before (was 15)
- Search "tikkurila" → cross-chain paint matches
- Search "fiskars" → more than 3 comparable (was 3)
- Tap "Mullad ja turbad" category → deep results with multiple brands
- Check deals section → populated with deals from 7 categories
- Every chain price row links to correct store page

---

## Task 8: Update STACK.md + docs

- Update STACK.md: change "50-60 comparable" to actual count, update category count 8→7, note Upstash Redis IS integrated, remove "placeholder" notes for deals
- Update continuation-prompt.md with new state
- Update memory file if needed

---

## Files Summary

| Action | File | Change |
|--------|------|--------|
| Modify | `src/lib/types.ts:68-73` | Add `searchTerms: string[]` to Category |
| Modify | `src/lib/constants.ts:51-80` | 8→7 categories with multi-term search + brand names |
| Modify | `src/lib/constants.ts:82-139` | Add 10 missing brands to KNOWN_BRANDS |
| Modify | `src/lib/scrapers/klevu.ts:28` | limit 30→80 |
| Modify | `src/lib/scrapers/algolia.ts:23` | limit 30→80 |
| Modify | `src/lib/scrapers/bauhof.ts:15` | limit 32→80 |
| Modify | `src/lib/matcher.ts` | Add fuzzyMerge + getSignificantWords + STOP_WORDS |
| Modify | `src/app/api/search/route.ts` | Category-aware multi-term search with dedup |

**No new files.** All changes in existing modules.

## Risk Flags

| Risk | Mitigation |
|------|------------|
| API rate limiting (70+ terms × 4 chains) | Batch in groups of 3, sequential batches |
| Bauhof caps at ~32 per search | Multiple search terms compensate |
| Fuzzy false positives ("Fiskars labidas Solid" ↔ "Fiskars käärid Solid") | STOP_WORDS filter, require 2+ significant shared words |
| Category search slow (~10s first hit) | Redis 1h TTL cache, subsequent requests instant |
| searchTerms growing unbounded | Cap at ~13 terms per category, reviewed against brand report |
