# Sinu Aed — STACK.md

> Spring gardening price comparison across 4 Estonian home improvement chains
> Last updated: 2026-04-12

## Overview

"Sinu Aed" (Your Garden) — Mobile-first web app comparing prices for the same product across Bauhof, Espak, Decora, and Ehituse ABC. Focused on spring gardening: soils, fertilizers, paints, garden tools, lawn care, watering.

## Status: LIVE — Catalog Expansion Complete

- **Live URL:** https://hind-compare.vercel.app
- **GitHub:** https://github.com/keeltekool/sinu-aed
- **Build:** Clean, zero errors, Next.js 16.2.3
- **Comparable products:** 119 (up from 58 baseline)
- **Categories:** 7 (Mullad, Väetised, Muru, Värvid, Aiatööriistad, Muruhooldus, Kastmistarvikud)

## What Works

- Search any product (muld, fiskars, värv, väetis, biolan, etc.)
- 4 chains queried in parallel, results in ~2-3 seconds
- **Category-aware multi-term search:** tapping a category searches 7-13 brand+synonym terms per category
- Products matched by brand + size across chains, grouped and sorted cheapest first
- **Two-pass matcher:** exact brand+size/model first, then fuzzy word-overlap for tools/equipment
- Tool products (Fiskars, Makita, Gardena) matched by model number
- Product images via proxy (bypasses chain hotlink protection)
- Every chain price row links directly to the product on that chain's website
- Deals section ("Praegu soodsalt") with discounts + cross-chain price spreads
- Upstash Redis cache (1h TTL, 3-tier fallback: cache → live → stale)
- Estonian language UI throughout

## What Needs Work (Future)

- **Bauhof images** — CDN blocks external access. Using `/_ipx/` optimizer but may fail. Other chains' images preferred.
- **Price history** — no Neon DB yet, no historical tracking
- **Product detail page** — not built yet
- **SEO/meta tags** — basic, needs improvement
- **More searchTerms diversity** — brand-specific terms overlap with base terms for muld/väetis/värv categories

## Services

| Service | Purpose | Account |
|---------|---------|---------|
| Vercel | Hosting | egertv1s-projects |
| GitHub | Repo `sinu-aed` | keeltekool |
| Upstash Redis | Cache `verified-piranha-96920` | 1h TTL, 3-tier fallback |

## Data Sources — All 4 Working

| Chain | Platform | API Method | Key/Config | Limit |
|-------|----------|-----------|-----------|-------|
| **Decora** | Magento 2 | Klevu v2 POST `decoracsv2.ksearchnet.com/cs/v2/search` | `klevu-159479682665411675` | 80 |
| **Ehituse ABC** | Custom + Azure | Klevu v2 POST `eucs32v2.ksearchnet.com/cs/v2/search` | `klevu-168180264665813326` | 80 |
| **Espak** | WooCommerce | Algolia POST `UTKUHA7JT0-dsn.algolia.net` index `vwwm_posts_product` | `b9c55a35ad2799389ce3d4584a5f9def` | 80 |
| **Bauhof** | Vue/Nuxt + StorefrontUI | `__NUXT__` IIFE decode from `/et/search?term=` pages | No API key needed | 80 (HTML caps lower) |

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.2.3 (Vercel, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Cache | Upstash Redis (1h TTL) |
| Hosting | Vercel |
| Fonts | Plus Jakarta Sans (headlines) + Inter (body) |
| Icons | Material Symbols Outlined |

## Brand / Design System

- **Primary (Lush Garden):** `#154212`
- **Primary Container:** `#2D5A27`
- **Secondary (Earthy Soil):** `#7a5649`
- **Surface:** `#f7faf6`
- **On-surface (text):** `#181c1a` (never pure black)
- **No borders** — tonal layering only
- **Card rounding:** `1rem` (16px)
- Chain colors: Bauhof `#F7941D`, Espak `#01285F`, Decora `#E2001A`, Ehituse ABC `#009639`

## Architecture

```
src/
  app/
    page.tsx              — Home: search bar + category grid + deals
    search/page.tsx       — Search results: brand-grouped comparison
    api/search/route.ts   — Search API: category-aware multi-term search
    api/deals/route.ts    — Deals API: discounts + cross-chain price spreads
    api/img/route.ts      — Image proxy: bypasses chain hotlink protection
    layout.tsx            — Root layout with fonts + header
    globals.css           — Tailwind v4 design tokens
  components/
    Header.tsx            — "Sinu Aed" logo, links home
    SearchBar.tsx         — Debounced search input
    CategoryGrid.tsx      — 7 category tiles (reads from CATEGORIES constant)
    ProductCard.tsx       — Product comparison card with image + chain prices
    ChainPriceRow.tsx     — Single chain: color dot + name + price + discount + link
    DealCard.tsx          — Fixed-width deal card for horizontal scroll
    DealsSection.tsx      — Horizontal scroll deals section
  lib/
    types.ts              — ChainId, RawProduct, ProductGroup, Category (with searchTerms)
    constants.ts          — Chain configs, API keys, 7 categories with searchTerms, 50+ known brands
    matcher.ts            — Two-pass: exact brand+size/model → fuzzy word-overlap merge
    cache.ts              — Upstash Redis 3-tier: cache → live → stale
    deals.ts              — Deals aggregator: chain discounts + cross-chain spreads
    scrapers/
      index.ts            — searchAllChains() — parallel query to all 4
      klevu.ts            — Shared Klevu v2 adapter (Decora + Ehituse ABC), limit 80
      algolia.ts          — Espak Algolia adapter, limit 80
      bauhof.ts           — Bauhof __NUXT__ IIFE price decoder, limit 80
```

## Matching Engine

1. **Exact match (Pass 1):** Group by `brand|size` (supplies) or `brand|model` (tools)
2. **Fuzzy merge (Pass 2):** Single-chain products merged into multi-chain groups if same brand + 2+ shared significant words (excluding stop words like SOLID, CLASSIC, PRO)
3. **Result:** Products in 2+ chains = comparable (shown as comparison cards), 1 chain = singleChain (shown below)

## Gotchas

| Issue | Solution |
|-------|----------|
| Klevu v2 needs POST with `context.apiKeys` array | Not GET params — must send JSON body |
| Espak Algolia index is `vwwm_posts_product` | WP plugin prefix |
| Decora Klevu images have `needtochange` in URL | Strip it in klevu.ts |
| Bauhof has no JSON API | Decode `__NUXT__` IIFE function arguments to get prices |
| Bauhof URLs are `/et/p/{SKU}/{slug}` | NOT `/et/{slug}` — extract from HTML, not constructed |
| Bauhof images: CDN blocks external access | Use `/_ipx/` optimizer URL; prefer other chains' images |
| Bauhof SPA returns 200 for 404 pages | Cannot HTTP-test links — must render in browser |
| Product names vary across chains | Pattern-based normalization: brand + size for supplies, brand + model for tools |
| Tool products (Fiskars etc.) don't match by size | Extract model numbers (UPX86, P541, L86) instead |
| Chain image hotlinking blocked | Image proxy at `/api/img?url=` fetches server-side with proper Referer |
| Category search slow first hit | 7-13 terms × 4 chains batched in groups of 3. Redis cache makes subsequent hits instant |
| Brand+base search terms overlap | Diverse sub-type terms (labidas, käärid, voolik) yield more unique products than brand+category combos |

## Dev Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npx vercel --prod --yes  # Deploy to Vercel
```

## Post-Deploy Smoke Tests

1. Load home page — search bar + 7 category tiles render
2. Search "muld" — comparable products grouped by brand (Biolan, Kekkilä, etc.)
3. Search "fiskars" — comparable products with model numbers
4. Tap "Aiatööriistad" category — 40+ comparable products
5. Click Bauhof price row — opens Bauhof product page (not 404!)
6. Click Espak price row — opens Espak product page
7. Check images — most products show real images, Bauhof-only show eco fallback
8. Search "värv" — paint products with Eskaro, Vivacolor, Tikkurila brands
9. "Sinu Aed" logo click — returns to home page
10. Deals section on home page — shows discount cards with horizontal scroll
