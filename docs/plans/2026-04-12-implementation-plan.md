# Sinu Aed — Implementation Plan

> **For Claude:** Execute this plan task-by-task in main context. NO subagents for builds.

**Goal:** Build a mobile-first price comparison app for spring gardening products across 4 Estonian home improvement chains (Bauhof, Espak, Decora, Ehituse ABC).

**Architecture:** Next.js App Router with API routes for chain scrapers. Search queries all 4 chains in parallel, normalizes product names, groups by brand+size, returns sorted price comparison. Upstash Redis cache with 6h TTL and 3-tier fallback. Mobile-first Tailwind UI from Stitch design system.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS v4, Upstash Redis, Vercel

---

## Phase 1: Foundation (Tasks 1-3)

### Task 1: Scaffold Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Steps:**
1. `cd C:\Users\Kasutaja\Claude_Projects\hind-compare`
2. `npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-import-alias --yes`
3. Configure Tailwind with Stitch design tokens (colors, fonts, borderRadius)
4. Add Google Fonts (Plus Jakarta Sans + Inter) in layout.tsx
5. Add Material Symbols Outlined icon font
6. Set Estonian lang attribute
7. Verify: `npm run dev` loads on localhost
8. Commit: "feat: scaffold Next.js project with Sinu Aed design tokens"

### Task 2: Types and constants

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/constants.ts`

**Steps:**
1. Define core types: `ChainId`, `ChainConfig`, `RawProduct`, `NormalizedProduct`, `ProductGroup`, `ChainPrice`
2. Define chain configs with names, colors, API endpoints, keys
3. Define category list with Estonian labels and Material Symbols icons
4. Commit: "feat: add core types and chain/category constants"

### Task 3: Cache layer

**Files:**
- Create: `src/lib/cache.ts`

**Steps:**
1. Install: `npm install @upstash/redis`
2. Implement `getCached<T>(key, fetcher, ttl)` with 3-tier fallback (cache → fetch → stale)
3. Same pattern as HindRadar: Redis down → direct fetch, fetch down → serve stale
4. Default TTL: 6 hours
5. Commit: "feat: add Upstash Redis cache with 3-tier fallback"

---

## Phase 2: Scrapers (Tasks 4-7)

### Task 4: Klevu scraper (Decora + Ehituse ABC)

**Files:**
- Create: `src/lib/scrapers/klevu.ts`

**Steps:**
1. Implement `searchKlevu(config: KlevuConfig, query: string): Promise<RawProduct[]>`
2. POST to `{host}/cs/v2/search` with `context.apiKeys` array
3. Map response records to RawProduct: name, brand, price, salePrice, sku, imageUrl, productUrl, inStock, category
4. Parameterized by host + apiKey — one function serves both Decora and Ehituse ABC
5. Handle errors gracefully (empty array on failure)
6. Commit: "feat: add Klevu v2 scraper for Decora and Ehituse ABC"

### Task 5: Algolia scraper (Espak)

**Files:**
- Create: `src/lib/scrapers/algolia.ts`

**Steps:**
1. Implement `searchAlgolia(query: string): Promise<RawProduct[]>`
2. POST to `UTKUHA7JT0-dsn.algolia.net/1/indexes/*/queries`
3. Index: `vwwm_posts_product`, headers with App-Id and API-Key
4. Map hits to RawProduct including EAN codes (Espak has them)
5. Handle `regular_price` vs `sale_price` correctly
6. Commit: "feat: add Algolia scraper for Espak"

### Task 6: Bauhof scraper (__NUXT__ decoder)

**Files:**
- Create: `src/lib/scrapers/bauhof.ts`

**Steps:**
1. Implement `searchBauhof(query: string): Promise<RawProduct[]>`
2. Fetch `https://www.bauhof.ee/et/search?term={query}` with browser User-Agent
3. Extract `window.__NUXT__` from HTML
4. Find IIFE function params and argument values
5. Parse argument values into variable map
6. Match products via regex: `title:"...",sku:"..."...price:VAR,old_price:VAR`
7. Resolve price variables from the map
8. Handle pagination (max 32 results per page)
9. Commit: "feat: add Bauhof __NUXT__ IIFE price decoder"

### Task 7: Unified search function

**Files:**
- Create: `src/lib/scrapers/index.ts`

**Steps:**
1. Implement `searchAllChains(query: string): Promise<RawProduct[]>`
2. Fire all 4 chain scrapers in parallel with `Promise.allSettled`
3. Tag each result with `chainId`
4. Merge results into single array
5. Return even if some chains fail (graceful degradation)
6. Commit: "feat: add unified parallel search across all 4 chains"

---

## Phase 3: Product Matching Engine (Tasks 8-9)

### Task 8: Product normalizer

**Files:**
- Create: `src/lib/matcher.ts`

**Steps:**
1. Implement `normalizeProduct(product: RawProduct): NormalizedProduct`
2. Extract brand from product name (known brand list: Biolan, Grass, Kekkilä, Fiskars, Baltic Agro, Makita, Gardena, Bosch, Ryobi, Eskaro, Vivacolor, Tikkurila, Sadolin, Substral, Horticom, Compo, Prosperplast, Elho, etc.)
3. Extract size via regex: `(\d+[.,]?\d*)\s*(L|KG|G|ML|M3|CM|MM|TK|M)`
4. Generate match key: `brand|size` (e.g., "BIOLAN|60L")
5. Clean product type: remove brand, size, chain-specific noise from name
6. Handle edge cases: "MULD MUST AIA BIOLAN 60L" and "Aiamaa must muld Biolan 60L" should normalize to same key
7. Commit: "feat: add product name normalizer with brand and size extraction"

### Task 9: Cross-chain grouper

**Files:**
- Modify: `src/lib/matcher.ts`

**Steps:**
1. Implement `groupByProduct(products: RawProduct[]): ProductGroup[]`
2. Normalize all products → generate match keys
3. Group by match key
4. For each group: sort chains by effective price (salePrice ?? regularPrice) ascending
5. Calculate: cheapestChain, priceSpread, savingsAmount, savingsPercent
6. Sort groups by: chain count desc → price spread desc
7. Split into: `comparable` (2+ chains) and `singleChain` (1 chain only)
8. Commit: "feat: add cross-chain product grouper with price ranking"

---

## Phase 4: API Route (Task 10)

### Task 10: Search API endpoint

**Files:**
- Create: `src/app/api/search/route.ts`

**Steps:**
1. GET `/api/search?q={query}`
2. Check Redis cache first (key: `search:{query}`, TTL: 1h for search results)
3. Cache miss: call `searchAllChains(query)` → `groupByProduct(results)`
4. Return JSON: `{ query, comparable: ProductGroup[], singleChain: ProductGroup[], totalProducts, totalChains, fetchedAt }`
5. Handle errors: return partial results if some chains fail
6. Commit: "feat: add /api/search endpoint with caching"

---

## Phase 5: UI Components (Tasks 11-16)

### Task 11: Layout, header, bottom nav

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/components/Header.tsx`
- Create: `src/components/BottomNav.tsx`

**Steps:**
1. Implement layout from Stitch: header with eco icon + "Sinu Aed" branding
2. Bottom nav (mobile only): Otsi (search), Kategooriad, Info
3. Background: `#f7faf6`, text: `#181c1a`
4. "Frosted Greenhouse" bottom nav: `bg-white/80 backdrop-blur-xl`
5. `pb-24` on body for bottom nav clearance
6. Commit: "feat: add header and bottom navigation"

### Task 12: Search bar component

**Files:**
- Create: `src/components/SearchBar.tsx`

**Steps:**
1. Large input with search icon, `h-16`, `rounded-xl`
2. Background: `surface-container-high`, focus: `surface-container-lowest` with primary ring
3. Placeholder: "Otsi toodet... nt muld, värv, Fiskars"
4. Debounced onChange (300ms)
5. Clear button (X) when text present
6. On submit: navigate to `/search?q={query}`
7. Commit: "feat: add search bar component with debounce"

### Task 13: Category grid component

**Files:**
- Create: `src/components/CategoryGrid.tsx`

**Steps:**
1. 2x4 grid of category tiles from Stitch
2. Each tile: Material Symbols icon + Estonian label
3. Hover: `bg-primary-container text-white` transition
4. Tap: navigate to `/search?q={categoryQuery}`
5. Categories: Mullad, Väetised, Seemned, Värvid, Aiatööriistad, Lillepotid, Muruniidukid, Kastekannud
6. Commit: "feat: add category grid component"

### Task 14: Chain price row component

**Files:**
- Create: `src/components/ChainPriceRow.tsx`

**Steps:**
1. Single row: chain color dot + chain name + price + discount badge
2. Cheapest row: highlighted background (`surface-container-low`)
3. Discount shown: "was €5.20" strikethrough + "-37%" badge in error color
4. Tappable: opens product URL on chain's website (target="_blank")
5. Commit: "feat: add chain price row component"

### Task 15: Product comparison card

**Files:**
- Create: `src/components/ProductCard.tsx`

**Steps:**
1. Card: product name (title-lg) + brand label + size
2. List of ChainPriceRow components sorted cheapest first
3. "Säästad kuni €X.XX" savings badge when price spread > 0
4. Product image if available
5. No borders — tonal layering per design system
6. Background: `surface-container-lowest`
7. Commit: "feat: add product comparison card component"

### Task 16: Brand section component

**Files:**
- Create: `src/components/BrandSection.tsx`

**Steps:**
1. Brand name as section header (headline-md)
2. List of ProductCard components for that brand
3. Collapsible if more than 3 products (show 3 + "Näita rohkem")
4. Commit: "feat: add brand section component"

---

## Phase 6: Pages (Tasks 17-19)

### Task 17: Home page

**Files:**
- Modify: `src/app/page.tsx`

**Steps:**
1. Hero section: headline "Kõik aiatarbed ühest kohast, parima hinnaga."
2. SearchBar component (hero element)
3. CategoryGrid component
4. "Parimad pakkumised" section (horizontal scroll, placeholder data initially)
5. Responsive: mobile-first, desktop gets centered max-w-7xl
6. Commit: "feat: build home page with search, categories, deals"

### Task 18: Search results page

**Files:**
- Create: `src/app/search/page.tsx`

**Steps:**
1. Read `?q=` from URL search params
2. SearchBar at top (filled with query)
3. Fetch `/api/search?q={query}` on mount
4. Loading state: skeleton shimmer cards
5. Results: grouped by brand using BrandSection components
6. Result count: "X toodet · Y poodi"
7. Chain filter chips (toggle to hide/show specific chains)
8. Bottom: "Muud tooted" section for single-chain items
9. Empty state: friendly message "Tooteid ei leitud"
10. Commit: "feat: build search results page with brand-grouped comparison"

### Task 19: Product detail page (stretch)

**Files:**
- Create: `src/app/product/[id]/page.tsx`

**Steps:**
1. Full price comparison table
2. Product image (largest available)
3. Brand + size + category info
4. Chain rows with "Ava poes" (Open in store) buttons
5. Price history chart placeholder
6. Related products section
7. Commit: "feat: add product detail page"

---

## Phase 7: Deploy (Task 20)

### Task 20: Deploy to Vercel

**Steps:**
1. Create GitHub repo: `gh repo create sinu-aed --public --source=. --push`
2. Create Upstash Redis database for sinu-aed (new instance per CLAUDE.md rules)
3. Add env vars to `.env.local`: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
4. `npm run build` — fix any build errors
5. `npx vercel --prod --yes`
6. Set env vars in Vercel dashboard
7. Verify via chrome-devtools MCP: home loads, search works, prices show
8. Commit + push
9. Update STACK.md with deployment URL

---

## Phase Gates

| After Task | Checkpoint |
|-----------|-----------|
| Task 7 | All 4 scrapers return data for "muld" query |
| Task 9 | Matcher correctly groups "Biolan aiamaa muld 60L" across 3+ chains |
| Task 10 | `/api/search?q=muld` returns grouped results with prices |
| Task 18 | Full UI works: search "muld" → see brand-grouped price comparison |
| Task 20 | Live on Vercel, chrome-devtools verification |
