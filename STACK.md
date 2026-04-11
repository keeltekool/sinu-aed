# Sinu Aed — STACK.md

> Spring gardening price comparison across 4 Estonian home improvement chains
> Last updated: 2026-04-12

## Overview

"Sinu Aed" (Your Garden) — Mobile-first web app comparing prices for the same product across Bauhof, Espak, Decora, and Ehituse ABC. Focused on spring gardening: soils, seeds, fertilizers, paints, garden tools (Fiskars, Biolan, Baltic Agro, Makita, Tikkurila, etc.).

## Status: PRE-BUILD

Design approved. UI/UX from Google Stitch incoming. Implementation plan pending.

## Data Sources — All 4 Confirmed Working

| Chain | Platform | API Method | Key/Config |
|-------|----------|-----------|-----------|
| **Decora** | Magento 2 | Klevu v2 POST `decoracsv2.ksearchnet.com/cs/v2/search` | `klevu-159479682665411675` |
| **Ehituse ABC** | Custom + Azure | Klevu v2 POST `eucs32v2.ksearchnet.com/cs/v2/search` | `klevu-168180264665813326` |
| **Espak** | WooCommerce | Algolia POST `UTKUHA7JT0-dsn.algolia.net` index `vwwm_posts_product` | `b9c55a35ad2799389ce3d4584a5f9def` |
| **Bauhof** | Vue/Nuxt + StorefrontUI | `__NUXT__` IIFE decode from `/et/search?term=` pages | No API key needed |

## Proven Price Data (April 2026)

| Product | Bauhof | Ehituse ABC | Espak | Decora |
|---------|--------|-------------|-------|--------|
| Biolan Aiamaa Must Muld 60L | **€2.95** | €3.20 | €3.29 | €3.29 |
| Biolan Mustikamuld 50L | €9.99 | €3.50 | €3.96 | €3.99 |
| Biolan Kurgiturvas 50L | €3.99 | — | €3.19 | €3.39 |
| Fiskars PowerGear oksalõikur | — | €195.00 | €76.00 | €129.00 |
| Eskaro Akrit 7 | — | €68.20 | €52.73 | €69.79 |

## Tech Stack (planned)

| Layer | Tech |
|-------|------|
| Framework | Next.js (Vercel) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Cache | Upstash Redis (6h TTL) |
| Database | Neon (golden products + price history) |
| Hosting | Vercel |
| Fonts | Plus Jakarta Sans (display/headlines) + Inter (body/UI) |

## Brand / Design System

- **Primary (Lush Garden):** `#154212` (on-primary: `#ffffff`)
- **Primary Container:** `#2D5A27`
- **Secondary (Earthy Soil):** `#7a5649`
- **Tertiary (Spring Bloom):** `#572f00`
- **Surface:** `#f7faf6` | Surface-container-low: `#f1f4f0`
- **On-surface (text):** `#181c1a` (never pure black)
- **No borders** — tonal layering only
- **Card rounding:** `1rem` (16px) | Small elements: `0.75rem` (12px)
- **Price hero shadow:** `0 20px 40px rgba(24, 28, 26, 0.06)`
- **"Frosted Greenhouse":** 80% opacity + 20px backdrop-blur for overlays

## Chain Colors

| Chain | Color | Hex |
|-------|-------|-----|
| Bauhof | Orange | `#F7941D` |
| Espak | Dark Blue | `#01285F` |
| Decora | Red | `#E2001A` |
| Ehituse ABC | Green | `#009639` |

## Screens (from Stitch)

1. **Avaleht/Otsing** — Hero search, 8 category tiles, "Parimad pakkumised" deals
2. **Otsingutulemused** — Chain filter chips, "Aedniku valik" badge, price comparison sorted cheapest first
3. **Kategooria** — Product cards with image, name, price, chain badge
4. **Toote üksikasjad** — Full price comparison table, price history chart, related products

## Scraper Architecture

- `klevu.ts` — shared Klevu v2 adapter (Decora + Ehituse ABC)
- `algolia.ts` — Espak Algolia adapter
- `bauhof.ts` — Bauhof `__NUXT__` IIFE decoder
- `cache.ts` — Upstash Redis (same pattern as HindRadar)
- `matcher.ts` — AI normalization + cross-chain matching

## Golden Products

~200-500 products that exist across 2+ chains. Identified via:
1. Category search across all 4 chains
2. AI normalization of product names → `{ brand, type, size }`
3. Cross-match by normalized key
4. Ranked by price spread

## Gotchas

| Issue | Solution |
|-------|----------|
| Klevu v2 needs POST with `context.apiKeys` array | Not GET params |
| Espak Algolia index is `vwwm_posts_product` | WP plugin prefix, not `wp_posts_product` |
| Bauhof has no JSON API | Decode `__NUXT__` IIFE function arguments to get prices |
| Bauhof search returns max 32 products | Paginate or use multiple search terms |
| Product names vary across chains | AI normalization via Claude Haiku for matching |
| Ehituse ABC shows price=salePrice in Klevu | Discounts may only show on product pages |
| "Grass" brand conflicts with "grass" (lawn) keyword | Use brand + product type for search, not just keywords |
| Espak has EAN codes, others don't | Use EAN for Espak matching, brand+size for others |

## Dev Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npx vercel --prod --yes  # Deploy
```

## Project Docs

- `docs/plans/2026-04-11-design.md` — Full design document
- `docs/plans/2026-04-11-stitch-prompt.md` — Google Stitch UI/UX prompt
- `docs/designs/` — Google Stitch output (UI/UX designs)
