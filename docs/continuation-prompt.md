# Sinu Aed — Continuation Prompt

> Copy this entire prompt into a fresh Claude Code session to resume work.

## Project

**Sinu Aed** ("Your Garden") — Spring gardening price comparison app.
**Dir:** `C:\Users\Kasutaja\Claude_Projects\hind-compare`
**Live:** https://hind-compare.vercel.app
**GitHub:** https://github.com/keeltekool/sinu-aed

## What's Built (LIVE)

- Next.js 16 + TypeScript + Tailwind v4 on Vercel
- 4 chain scrapers: Decora (Klevu), Ehituse ABC (Klevu), Espak (Algolia), Bauhof (__NUXT__ IIFE decoder)
- **7 categories** with multi-term search (7-13 brand+synonym terms per category)
- Two-pass product matcher: exact brand+size/model → fuzzy word-overlap merge
- Search API `/api/search?q=` — category-aware, searches ALL terms when query matches a category
- Deals API `/api/deals` with horizontal scroll on home page ("Praegu soodsalt")
- Image proxy `/api/img?url=` bypasses chain hotlink protection
- Upstash Redis cache (1h TTL, 3-tier fallback)
- Home page: search bar + 7 category tiles + deals section
- Search results: brand-grouped comparison cards, chain price rows link to stores

## Current State: 119 comparable products (up from 58 baseline)

### Categories (final 7)
1. Mullad ja turbad (searchQuery: "muld", 13 searchTerms)
2. Väetised (searchQuery: "väetis", 11 searchTerms)
3. Muru (searchQuery: "muru", 8 searchTerms)
4. Värvid ja lakid (searchQuery: "värv", 11 searchTerms)
5. Aiatööriistad (searchQuery: "aiatööriist", 9 searchTerms)
6. Muruhooldus (searchQuery: "muruniiduk", 10 searchTerms)
7. Kastmistarvikud (searchQuery: "kastmine", 7 searchTerms)

### Catalog Expansion Results (per category)
| Category | Comparable | Raw Products |
|----------|-----------|-------------|
| muld | 15 | 51 |
| väetis | 11 | 55 |
| muru | 27 | 182 |
| värv | 17 | 57 |
| aiatööriist | 46 | 551 |
| muruniiduk | 7 | 69 |
| kastmine | 12 | 250 |

### Key Insight for Further Expansion
Brand+base combo terms ("biolan muld", "kekkilä") overlap heavily with the base term ("muld"). Diverse sub-type terms ("labidas", "käärid", "voolik") yield far more unique products. To reach 200+, add distinct product-type terms to underperforming categories.

## Key Technical Details

### API Configs (in constants.ts)
- Decora Klevu: `decoracsv2.ksearchnet.com`, key `klevu-159479682665411675`
- Ehituse ABC Klevu: `eucs32v2.ksearchnet.com`, key `klevu-168180264665813326`
- Espak Algolia: App `UTKUHA7JT0`, key `b9c55a35ad2799389ce3d4584a5f9def`, index `vwwm_posts_product`
- Bauhof: __NUXT__ IIFE decode from `/et/search?term=`, URLs `/et/p/{SKU}/{slug}`
- All scrapers: limit 80 per chain per search

### Upstash Redis
- URL: `https://verified-piranha-96920.upstash.io`
- Token in Vercel env vars and `.env.local`

### Matching Engine
- Pass 1: exact `brand|size` (supplies) or `brand|model` (tools)
- Pass 2: fuzzy merge — single-chain products merged into multi-chain groups if same brand + 2+ shared significant words (STOP_WORDS excluded)
- 50+ known brands in constants.ts

### Gotchas
- Bauhof CDN blocks images → use `/_ipx/` proxy or prefer other chains' images
- Bauhof returns 200 for 404 pages (SPA) → can't HTTP-test links
- Decora Klevu images had `needtochange` in URL → stripped in klevu.ts
- Espak Algolia index is `vwwm_posts_product` not `wp_posts_product`
- Klevu category browsing doesn't work (returns random products)
- Tool products need model number matching, not size matching
- Category searches batch terms in groups of 3 to avoid overwhelming APIs

## Future Work

- **Expand to 200+:** Add more distinct sub-type terms to muld/väetis/värv categories
- **Price history:** Neon DB for historical price tracking
- **Product detail page:** Full comparison view with price chart
- **SEO:** Proper meta tags, structured data
- **Bauhof images:** Investigate alternative image sources

## Reference Documents
- `docs/garden-category-bible.md` — full category taxonomy from all 4 chains
- `docs/brand-confidence-report.md` — brand rankings with chain presence data
- `docs/plans/2026-04-12-catalog-expansion.md` — catalog expansion plan (executed)
- `docs/plans/2026-04-12-product-spec.md` — full product spec
- `STACK.md` — complete technical reference

## Rules (from CLAUDE.md)
- All code in main context, NO subagents for builds
- `npm run build` must pass clean before deploy
- `npx vercel --yes --prod` for deploy, `git push origin master` after
