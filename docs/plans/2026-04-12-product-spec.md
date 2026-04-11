# Sinu Aed — Product Spec

> Locked in: 2026-04-12
> Status: APPROVED — ready for implementation plan

## One-Liner

"Same bag, different price, we show you where."

## Core Principle

The app compares prices for the **exact same product** (same brand, same size) across 4 Estonian home improvement chains. If it's not the same product, there's nothing to compare.

## Target User

Estonian home gardener. Spring season. Knows WHAT they need (soil, paint, garden shears) but NOT which brand. Definitely not thinking in brand names like "Biolan" — they think "muld." The app discovers the brands for them and shows where each is cheapest.

## Chains (all confirmed working)

1. **Bauhof** — `#F7941D` — __NUXT__ IIFE decode
2. **Espak** — `#01285F` — Algolia API (has EAN codes)
3. **Decora** — `#E2001A` — Klevu v2 API
4. **Ehituse ABC** — `#009639` — Klevu v2 API

## Jobs To Be Done

| Priority | Job | Trigger | Flow |
|----------|-----|---------|------|
| **#1 (80%)** | "Where is this cheapest?" | User needs a product | Search → see all chains → go buy |
| **#2 (15%)** | "What's on sale?" | Browsing before a trip | Browse category → see deals |
| **#3 (5%)** | "Which store should I go to?" | Comparing stores | See chain-level deal counts |

## User Flow

```
1. User opens app
2. Sees big search bar: "Otsi toodet... nt muld, värv, Fiskars"
3. Types "muld"
4. App searches all 4 chains in parallel
5. App normalizes product names → extracts brand + type + size
6. App groups by SAME brand + SAME size = SAME product
7. Results shown grouped by brand:
   - Biolan section: Aiamaa 60L (4 chains), Mustikamuld 50L (4 chains), etc.
   - Grass section: Must Muld 50L (2 chains), etc.
   - Kekkilä section: Kasvuturvas 300L (2 chains), etc.
8. Each product shows all chains sorted cheapest first
9. Cheapest chain highlighted
10. Tap chain row → opens product on chain's website
```

## Search = Category Browse

Typing "muld" and tapping "Mullad" category lead to the SAME result view. The entry point differs, the destination is identical.

## Result Grouping Logic

### What gets shown (main view):
- Products matched across **2+ chains** by brand + size
- Grouped by brand (Biolan, Grass, Kekkilä, etc.)
- Within brand: sorted by chain count (4/4 first), then price spread
- Each product: all chains listed, sorted cheapest first
- Cheapest chain gets visual emphasis
- Discount shown when sale price exists (e.g., "was €5.20, -37%")
- "Säästad kuni €X.XX" savings indicator on each product

### What goes to bottom ("Muud tooted"):
- Products found in only 1 chain — no comparison possible
- Shown as simple list, not comparison cards
- Still useful for discovery

### What gets excluded:
- Products that don't match any search term
- Out-of-stock items (configurable)

## Screens

### 1. Home (Search-First)
- Hero: big search bar with placeholder
- Below: recent searches (after first use)
- Below: category pills (Mullad, Väetised, Seemned, Värvid, Tööriistad, Lillepotid, Muruniidukid, Kastekannud)
- Below: "Parimad pakkumised" — biggest discounts across chains right now
- Categories and deals are secondary to search

### 2. Search Results / Category View (SAME template)
- Search bar at top (filled with query or category name)
- Result count + chain filter chips
- Products grouped by brand
- Each product: comparison card with all chains
- Bottom: "Muud tooted" single-chain items

### 3. Product Detail (tap a result)
- Product image (best available from any chain)
- Product name + brand + size
- Full price comparison table (all chains)
- Each chain row tappable → opens store product page
- Price history chart (v2 — placeholder for now)
- Related products: same category, different brand/size

### 4. Category Browse
- Grid of 8 categories on home screen
- Tap → same result template as search, filtered by category

## Product Matching Engine

The heart of the app. When user searches:

1. **Search**: Fire query to all 4 chain APIs in parallel
2. **Normalize**: Extract `{ brand, productType, size }` from each product name
   - "AIAMAA MUST MULD BIOLAN 60L" → `{ brand: "Biolan", type: "aiamaa muld", size: "60L" }`
   - "Muld must aia Biolan 60L" → `{ brand: "Biolan", type: "aiamaa muld", size: "60L" }`
3. **Match**: Group by `brand + size` key
4. **Rank**: Sort groups by chain count desc, then price spread desc
5. **Cache**: Store the normalized mapping for reuse

Normalization approach:
- Pattern matching for known brands (Biolan, Grass, Kekkilä, Fiskars, etc.)
- Size extraction via regex: `(\d+[.,]?\d*)\s*(L|KG|G|ML|M3|CM|MM)`
- Estonian product type keywords normalized (muld, turvas, väetis, etc.)
- For edge cases: Claude Haiku API call for AI normalization (cached)

## Design System (from Stitch)

- **Name**: Sinu Aed ("Your Garden")
- **North Star**: "The Verdant Curator" — editorial organic, not sterile tech
- **Primary**: `#154212` (Lush Garden green)
- **Surface**: `#f7faf6` (warm off-white)
- **Text**: `#181c1a` (never pure black)
- **Fonts**: Plus Jakarta Sans (headlines) + Inter (body)
- **No borders** — tonal layering only
- **Card rounding**: 1rem (16px)
- **Chain colors**: Bauhof orange, Espak blue, Decora red, Ehituse ABC green

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js | SSR for SEO, API routes for scrapers, proven in our stack |
| Language | TypeScript | Type safety for product matching logic |
| Styling | Tailwind CSS | Convention, speed |
| Cache | Upstash Redis | 6h TTL, graceful fallback (proven in HindRadar) |
| Database | Neon | Golden products list, price history |
| Hosting | Vercel | Proven, free tier sufficient for MVP |
| Fonts | Plus Jakarta Sans + Inter | Google Fonts |

## Scraper Architecture

```
src/lib/scrapers/
  klevu.ts      — shared adapter for Decora + Ehituse ABC
  algolia.ts    — Espak adapter
  bauhof.ts     — __NUXT__ IIFE decoder
src/lib/
  cache.ts      — Upstash Redis (3-tier: cache → scrape → stale)
  matcher.ts    — product normalization + cross-chain matching
  types.ts      — Product, GoldenProduct, ChainMatch interfaces
```

## Proven Price Data (April 2026)

| Product | Bauhof | Ehituse ABC | Espak | Decora |
|---------|--------|-------------|-------|--------|
| Biolan Aiamaa Must Muld 60L | **€2.95** | €3.20 | €3.29 (-39%) | €3.29 (-37%) |
| Biolan Mustikamuld 50L | €9.99 | **€3.50** | €3.96 (-24%) | €3.99 (-29%) |
| Biolan Kurgiturvas 50L | €3.99 | — | **€3.19** (-26%) | €3.39 (-29%) |
| Fiskars PowerGear UPX82 | — | €195.00 | **€76.00** (-43%) | €129.00 (-30%) |
| Eskaro Akrit 7 seinavärv | — | €68.20 | **€52.73** (-25%) | €69.79 (-34%) |

## What This App Is NOT

- Not a full e-commerce store (no cart, no checkout)
- Not a product review site (no ratings)
- Not for professional builders (no bulk pricing)
- Not a general comparison engine (spring gardening focus)
- No user accounts needed (anonymous, instant)
