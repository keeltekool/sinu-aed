# "Praegu soodsalt" Deals Section — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a horizontal-scroll deals section to the home page showing two types of deals: "Allahindlus" (chain-reported discounts) and "Parim hind" (cross-chain best price spread).

**Architecture:** New `/api/deals` route searches 4 seed categories (muld, väetis, värv, fiskars) across all chains, collects products with discounts OR cross-chain price spreads, deduplicates, ranks by savings magnitude, returns top 10. Home page fetches on mount and renders as horizontal scroll cards. Redis cached (1h TTL).

**Tech Stack:** Next.js 16 API route, existing scraper infrastructure, existing cache layer, Tailwind CSS for horizontal scroll UI.

---

## Task 1: Add Deal types

**Files:**
- Modify: `src/lib/types.ts`

**Steps:**

1. Add new types to `src/lib/types.ts`:

```typescript
export type DealType = "allahindlus" | "parim-hind";

export interface Deal {
  type: DealType;
  product: string;         // display name
  brand: string;
  size: string;
  imageUrl: string | null;
  // The deal chain (cheapest or discounted)
  chain: ChainId;
  chainName: string;
  chainColor: string;
  effectivePrice: number;
  productUrl: string;
  // For "allahindlus": chain's own regular vs sale
  regularPrice: number | null;
  discountPercent: number | null;
  // For "parim-hind": cross-chain comparison
  otherChainPrice: number | null;  // most expensive chain's price
  otherChainName: string | null;
  spreadPercent: number | null;
  // Unified sort key: higher = better deal
  savingsScore: number;
}

export interface DealsResponse {
  deals: Deal[];
  fetchedAt: string;
}
```

2. Commit: `feat: add Deal and DealsResponse types`

---

## Task 2: Build deals aggregation logic

**Files:**
- Create: `src/lib/deals.ts`

**Steps:**

1. Create `src/lib/deals.ts` with function `aggregateDeals()`:
   - Seed queries: `["muld", "väetis", "värv", "fiskars"]`
   - For each query: call `searchAllChains(query)` then `groupByProduct(results)`
   - Extract two deal types:
     - **Allahindlus**: From raw products where `salePrice !== null && salePrice < regularPrice`. Calculate `discountPercent`. Score = discount %.
     - **Parim hind**: From `comparable` ProductGroups where `priceSpread > 1.00` (at least €1 spread) and `chainCount >= 2`. Score = spread %.
   - Deduplicate by `brand + size` key (same product shouldn't appear twice)
   - Sort all deals by `savingsScore` descending
   - Return top 10

2. Key logic for Allahindlus extraction (from raw products, NOT grouped):
   ```
   for each raw product where salePrice < regularPrice:
     discountPercent = round((1 - salePrice/regularPrice) * 100)
     if discountPercent >= 10:  // minimum 10% to qualify as a deal
       create Deal with type "allahindlus"
   ```

3. Key logic for Parim Hind extraction (from comparable groups):
   ```
   for each ProductGroup where chainCount >= 2 and priceSpread >= 1.00:
     spreadPercent = savingsPercent from group
     if spreadPercent >= 15:  // minimum 15% spread to qualify
       create Deal with type "parim-hind"
       chain = cheapest chain
       otherChainPrice = most expensive chain's price
   ```

4. Commit: `feat: add deals aggregation logic`

---

## Task 3: Build /api/deals route

**Files:**
- Create: `src/app/api/deals/route.ts`

**Steps:**

1. Create API route:
   - GET `/api/deals`
   - Use `getCached()` pattern from cache.ts — but generalize cache.ts first to support any response type (not just SearchResponse)
   - Cache key: `deals:all`, TTL: 1 hour
   - Call `aggregateDeals()` on cache miss
   - Return `DealsResponse` JSON

2. Generalize cache.ts: change `getCachedSearch` to a generic `getCached<T>(key, fetcher, ttl?)`:
   ```typescript
   export async function getCached<T>(
     key: string,
     fetcher: () => Promise<T>,
     ttl: number = SEARCH_TTL
   ): Promise<T>
   ```
   Update `/api/search/route.ts` to use the new generic signature.

3. Commit: `feat: add /api/deals route with caching`

---

## Task 4: Build DealCard component

**Files:**
- Create: `src/components/DealCard.tsx`

**Steps:**

1. Create `DealCard` component matching Stitch design:
   - Fixed width card (`w-64 flex-none`) for horizontal scroll
   - Top: product image (h-36, via proxy, with fallback)
   - Overlay badge top-left:
     - Allahindlus: red badge `-{discountPercent}%`
     - Parim hind: green badge `Parim hind`
   - Below image:
     - Chain color dot + chain name (label size)
     - Product name (1 line, truncated)
     - Brand (tiny label)
     - Price: big sale/effective price + strikethrough original (if allahindlus) or "vs €X at {otherChain}" (if parim-hind)
   - Entire card is `<a>` linking to productUrl, target="_blank"

2. Use existing `proxyImg()` pattern and `ProductImage` fallback pattern from ProductCard.tsx — extract to shared util if needed.

3. Commit: `feat: add DealCard component`

---

## Task 5: Build DealsSection component

**Files:**
- Create: `src/components/DealsSection.tsx`

**Steps:**

1. Create `DealsSection` — client component that:
   - Fetches `/api/deals` on mount via useEffect
   - Loading state: 3 shimmer placeholder cards in horizontal scroll
   - Error state: silently hidden (deals are secondary, don't break the page)
   - Renders section header "Praegu soodsalt" with emoji or icon
   - Horizontal scroll container: `flex overflow-x-auto gap-4 no-scrollbar pb-4 -mx-6 px-6`
   - Maps `deals` array to `DealCard` components
   - Hide entire section if 0 deals returned

2. Add no-scrollbar CSS utility to globals.css:
   ```css
   .no-scrollbar::-webkit-scrollbar { display: none; }
   .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
   ```

3. Commit: `feat: add DealsSection with horizontal scroll`

---

## Task 6: Wire into home page

**Files:**
- Modify: `src/app/page.tsx`

**Steps:**

1. Import DealsSection, add below CategoryGrid:
   ```tsx
   <SearchBar autoFocus />
   </section>
   <CategoryGrid />
   <DealsSection />
   ```

2. Commit: `feat: add deals section to home page`

---

## Task 7: Build + Deploy + E2E Verify

**Steps:**

1. `npm run build` — must pass clean
2. `git add -A && git commit -m "feat: Praegu soodsalt deals section"`
3. `npx vercel --yes --prod`
4. `git push origin master`

**Phase gate — E2E verification:**

5. Playwright screenshot of home page (wait 10s for deals to load):
   ```bash
   npx playwright screenshot --browser chromium --wait-for-timeout 12000 --viewport-size "390,844" "https://hind-compare.vercel.app/" screenshot.png --full-page
   ```
6. Verify visually:
   - [ ] "Praegu soodsalt" section visible below categories
   - [ ] Horizontal scroll with deal cards
   - [ ] Discount badges showing (red for allahindlus, green for parim-hind)
   - [ ] Product images loading (or eco fallback)
   - [ ] Prices visible with strikethrough originals
   - [ ] Cards are tappable links

7. API verification:
   ```bash
   curl https://hind-compare.vercel.app/api/deals | jq '.deals | length'
   ```
   Expected: 8-10 deals

8. Cache verification:
   ```bash
   # Second call should be faster
   time curl -s https://hind-compare.vercel.app/api/deals > /dev/null
   ```

9. Click-through verification:
   - Click first deal card → must open real product page on chain website (not 404)

---

## Files Summary

| Action | File |
|--------|------|
| Modify | `src/lib/types.ts` — add Deal, DealsResponse types |
| Modify | `src/lib/cache.ts` — generalize to `getCached<T>()` |
| Modify | `src/app/api/search/route.ts` — update to use generic cache |
| Modify | `src/app/globals.css` — add no-scrollbar utility |
| Modify | `src/app/page.tsx` — add DealsSection |
| Create | `src/lib/deals.ts` — deals aggregation logic |
| Create | `src/app/api/deals/route.ts` — deals API endpoint |
| Create | `src/components/DealCard.tsx` — individual deal card |
| Create | `src/components/DealsSection.tsx` — horizontal scroll container |

## Risk Flags

- `/api/deals` searches 4 categories × 4 chains = 16 API calls on cold cache. Could take 5-8 seconds. Cache mitigates this — only first hit is slow.
- If all chains are slow simultaneously, deals section shows loading state then hides gracefully.
- Bauhof product URLs must use `/et/p/{SKU}/{slug}` format (already fixed in bauhof.ts).
