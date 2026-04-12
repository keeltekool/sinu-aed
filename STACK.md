# Sinu Aed — STACK.md

> Spring gardening price comparison across 4 Estonian home improvement chains
> Last updated: 2026-04-12

## Overview

"Sinu Aed" (Your Garden) — Mobile-first web app comparing prices for the same product across Bauhof, Espak, Decora, and Ehituse ABC. Focused on spring gardening: soils, seeds, fertilizers, paints, garden tools (Fiskars, Biolan, Baltic Agro, Makita, Tikkurila, etc.).

## Status: MVP LIVE

- **Live URL:** https://hind-compare.vercel.app
- **GitHub:** https://github.com/keeltekool/sinu-aed
- **Build:** Clean, zero errors, Next.js 16.2.3

## What Works

- Search any product (muld, fiskars, värv, väetis, biolan, etc.)
- 4 chains queried in parallel, results in ~2-3 seconds
- Products matched by brand + size across chains, grouped and sorted cheapest first
- Tool products (Fiskars, Makita, Gardena) matched by model number
- Product images via proxy (bypasses chain hotlink protection)
- Every chain price row links directly to the product on that chain's website
- Bauhof uses `/et/p/{SKU}/{slug}` URL format
- Estonian language UI throughout

## What Needs Work (Next Session)

- **Assortment depth** — currently ~50-60 comparable products. Target: 200-500. Fix: increase API limits, synonym expansion, category crawling
- **Bauhof images** — CDN blocks external access. Currently using Bauhof's `/_ipx/` optimizer but images may still fail. Other chains' images preferred.
- **Price history** — no Neon DB yet, no historical tracking
- **Upstash Redis cache** — not yet integrated (env vars not set). Currently no caching.
- **"Parimad pakkumised" section** — placeholder on home page, not populated
- **Product detail page** — not built yet
- **SEO/meta tags** — basic, needs improvement

## Services

| Service | Purpose | Account |
|---------|---------|---------|
| Vercel | Hosting | egertv1s-projects |
| GitHub | Repo `sinu-aed` | keeltekool |
| (needed) Upstash Redis | Cache | — |
| (needed) Neon | Price history DB | — |

## Data Sources — All 4 Working

| Chain | Platform | API Method | Key/Config |
|-------|----------|-----------|-----------|
| **Decora** | Magento 2 | Klevu v2 POST `decoracsv2.ksearchnet.com/cs/v2/search` | `klevu-159479682665411675` |
| **Ehituse ABC** | Custom + Azure | Klevu v2 POST `eucs32v2.ksearchnet.com/cs/v2/search` | `klevu-168180264665813326` |
| **Espak** | WooCommerce | Algolia POST `UTKUHA7JT0-dsn.algolia.net` index `vwwm_posts_product` | `b9c55a35ad2799389ce3d4584a5f9def` |
| **Bauhof** | Vue/Nuxt + StorefrontUI | `__NUXT__` IIFE decode from `/et/search?term=` pages | No API key needed |

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 16.2.3 (Vercel, Turbopack) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
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
    page.tsx              — Home: search bar + category grid
    search/page.tsx       — Search results: brand-grouped comparison
    api/search/route.ts   — Search API: queries 4 chains, matches, returns JSON
    api/img/route.ts      — Image proxy: bypasses chain hotlink protection
    layout.tsx            — Root layout with fonts + header
    globals.css           — Tailwind v4 design tokens
  components/
    Header.tsx            — "Sinu Aed" logo, links home
    SearchBar.tsx         — Debounced search input
    CategoryGrid.tsx      — 8 category tiles
    ProductCard.tsx       — Product comparison card with image + chain prices
    ChainPriceRow.tsx     — Single chain: color dot + name + price + discount + link
  lib/
    types.ts              — ChainId, RawProduct, ProductGroup, etc.
    constants.ts          — Chain configs, Klevu/Algolia keys, categories, known brands
    matcher.ts            — Product normalizer + cross-chain grouper
    scrapers/
      index.ts            — searchAllChains() — parallel query to all 4
      klevu.ts            — Shared Klevu v2 adapter (Decora + Ehituse ABC)
      algolia.ts          — Espak Algolia adapter
      bauhof.ts           — Bauhof __NUXT__ IIFE price decoder
```

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

## Dev Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npx vercel --prod --yes  # Deploy to Vercel
```

## Post-Deploy Smoke Tests

1. Load home page — search bar + 8 category tiles render
2. Search "muld" — comparable products grouped by brand (Biolan, Kekkilä, etc.)
3. Search "fiskars" — 3+ comparable products with model numbers
4. Click Bauhof price row — opens Bauhof product page (not 404!)
5. Click Espak price row — opens Espak product page
6. Check images — most products show real images, Bauhof-only show eco fallback
7. Search "värv" — paint products with Eskaro, Vivacolor, Tikkurila brands
8. "Sinu Aed" logo click — returns to home page
