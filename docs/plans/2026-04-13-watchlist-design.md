# Watchlist ("Minu lemmikud") — Design + Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let users heart products from search results. Hearted products appear on the home page (below categories) with live prices from the catalog.

**Architecture:** localStorage for watchlist persistence (array of matchKey + name). New `/api/watchlist` endpoint fetches fresh prices from Redis catalog. WatchlistSection component on home page. Heart icon on ProductCard.

**Tech Stack:** Existing Next.js codebase, localStorage, existing Redis catalog. No new dependencies.

---

## Approved Design

- Heart icon on ProductCard (top-right, outline → filled green on tap)
- Home page: WatchlistSection BELOW CategoryGrid, ABOVE DealsSection
- Section hidden when no watchlist items
- localStorage key: `sinu-aed-watchlist`, value: `[{ matchKey, name, addedAt }]`
- API endpoint: `GET /api/watchlist?keys=KEY1,KEY2` returns ProductGroup[]
- Products not found in catalog: returned with empty chains array
- Max 30 watchlist items
- Toast on heart: "Lisatud lemmikutesse" / "Eemaldatud lemmikutest"

---

## Task 1: Create watchlist localStorage hook

**Files:**
- Create: `src/lib/watchlist.ts`

```typescript
interface WatchlistItem {
  matchKey: string;
  name: string;
  addedAt: string;
}

// Read watchlist from localStorage
function getWatchlist(): WatchlistItem[]

// Add item to watchlist (max 30)
function addToWatchlist(matchKey: string, name: string): void

// Remove item from watchlist
function removeFromWatchlist(matchKey: string): void

// Check if item is in watchlist
function isInWatchlist(matchKey: string): boolean

// React hook: useWatchlist()
// Returns { watchlist, add, remove, isWatched, count }
// Syncs across components via storage event listener
```

---

## Task 2: Create `/api/watchlist` endpoint

**Files:**
- Create: `src/app/api/watchlist/route.ts`

**Logic:**
1. Parse `keys` query param (comma-separated matchKeys)
2. Read all 7 `catalog:*` Redis entries
3. For each requested matchKey, find the matching ProductGroup
4. Return found products; for missing products, return stub with saved name + empty chains

**Response type:** `{ products: ProductGroup[], missing: string[], fetchedAt: string }`

---

## Task 3: Add heart icon to ProductCard

**Files:**
- Modify: `src/components/ProductCard.tsx`

**Changes:**
- Import `useWatchlist` hook
- Add heart icon button in top-right of card header (next to brand/name)
- Outline heart (`favorite_border`) when not watched
- Filled green heart (`favorite`) when watched
- onClick: toggle watchlist state
- Show toast notification on add/remove

**Toast:** Simple absolute-positioned notification that auto-dismisses after 2 seconds. No toast library — just a state variable + CSS transition.

---

## Task 4: Create WatchlistSection component

**Files:**
- Create: `src/components/WatchlistSection.tsx`

**Logic:**
1. Read watchlist from localStorage via `useWatchlist()`
2. If empty → render nothing
3. If has items → fetch `/api/watchlist?keys=...` on mount
4. Show loading shimmer while fetching
5. Render ProductCards for each returned product (reuse existing component)
6. Section heading: "Minu lemmikud" with filled heart icon + count

**Layout:**
- Vertical stack of ProductCards (same as search results)
- Full-width cards, same styling as search page

---

## Task 5: Wire WatchlistSection into home page

**Files:**
- Modify: `src/app/page.tsx`

**Changes:**
- Import WatchlistSection
- Place between CategoryGrid and DealsSection
- WatchlistSection handles its own visibility (renders null when empty)

**Home page order:**
1. SearchBar
2. CategoryGrid
3. WatchlistSection ← NEW
4. DealsSection

---

## Task 6: Build + verify

**Steps:**
1. `npm run build` — must pass clean
2. Deploy to Vercel
3. E2E browser test:
   - Search "muld" → heart "Biolan Aiamaa Must Muld 60L"
   - Toast appears: "Lisatud lemmikutesse"
   - Navigate home → WatchlistSection shows with the hearted product
   - Prices match catalog data
   - Heart another product from "fiskars" search
   - Navigate home → both products visible
   - Unheart one product → section updates
   - Unheart all → section disappears
   - Refresh page → watchlist persists (localStorage)
   - Verify no console errors

---

## Files Summary

| Action | File |
|--------|------|
| Create | `src/lib/watchlist.ts` |
| Create | `src/app/api/watchlist/route.ts` |
| Create | `src/components/WatchlistSection.tsx` |
| Modify | `src/components/ProductCard.tsx` |
| Modify | `src/app/page.tsx` |
