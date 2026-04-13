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
- **Pre-built catalog:** 469 comparable products from 38 brands, stored in Redis, served instantly
- **8 categories:** Mullad, Väetised, Muru, Värvid, Aiatööriistad, Muruhooldus, Kastmistarvikud, Grilltarvikud
- **Catalog builder:** `scripts/build-catalog.ts` — searches all brands at all chains, runs matcher, stores in Redis
- **GitHub Actions cron:** Rebuilds catalog Monday + Thursday at 06:00 Estonian time
- **Watchlist ("Minu lemmikud"):** Heart products → appear on home page with live prices. localStorage persistence.
- **Smart search:** Free-text search checks catalog first (instant), falls back to live search
- Two-pass matcher: exact brand+type+size/model → fuzzy word-overlap merge
- Price sanity: strips outlier chains (>3x cheapest) instead of deleting entire product
- Deals section: 20 deals from catalog, cross-chain spread as lead indicator, max 75% discount cap
- Deal cards link to cross-chain comparison page, not direct store
- Image proxy `/api/img?url=` returns transparent PNG on 403 (no console errors)
- Back arrow on search results page for home navigation
- Desktop carousel scroll arrows on deals section
- Upstash Redis cache (1h TTL for search, 7-day TTL for catalog)

## Current Numbers

- **469 comparable products** across 8 categories
- 38 brands + 26 category terms searched
- 9,373 unique raw products from 4 chains
- Catalog serves in ~300ms from Redis

### Per Category
| Category | Comparable | Chain Distribution |
|----------|-----------|-------------------|
| Mullad ja turbad | 65 | 9×4chains, 17×3, 39×2 |
| Väetised | 79 | 7×4, 32×3, 40×2 |
| Muru | 12 | 4×3, 8×2 |
| Värvid ja lakid | 166 | 17×4, 67×3, 82×2 |
| Aiatööriistad | 39 | 1×4, 11×3, 27×2 |
| Muruhooldus | 66 | 4×4, 12×3, 50×2 |
| Kastmistarvikud | 8 | 8×2 |
| Grilltarvikud | 18 | 4×3, 14×2 |

## Key Technical Details

### Catalog Builder
- `scripts/build-catalog.ts` — run with `npx tsx scripts/build-catalog.ts`
- Searches 38 brands (TIER 1-3) + 26 category terms at all 4 chains
- Assigns products to categories via keyword matching on product names
- Stores in Redis: `catalog:{categoryId}`, TTL 7 days
- GitHub Actions: `.github/workflows/build-catalog.yml`, Mon+Thu 06:00 EET
- Manual trigger: https://github.com/keeltekool/sinu-aed/actions

### Matcher
- MatchKey format: `BRAND|TYPE_KEYWORD|SIZE` (supplies) or `BRAND|MODEL` (tools)
- TYPE_KEYWORDS: AIAMAA, MUSTIKA, KURGI, MURUVÄETIS, SEINAVÄRV, GRILLSÜSI, etc.
- Price outlier stripping: chains >3x cheapest get removed (not entire product)
- Fuzzy merge pass 2: word-overlap matching for unmatched single-chain products

### Watchlist
- localStorage key: `sinu-aed-watchlist`
- Value: `[{ matchKey, name, addedAt }]`
- API: `/api/watchlist?keys=KEY1,KEY2` fetches from catalog
- Supports old matchKey format (BRAND|SIZE) via partial matching fallback

### Search API Flow
1. Query matches category searchQuery → serve from `catalog:{id}` (instant)
2. Query matches catalog products by brand/name → serve catalog matches (instant)
3. Fallback: live search at 4 chains (2-5 seconds)

### API Configs
- Decora Klevu: `decoracsv2.ksearchnet.com`, key `klevu-159479682665411675`
- Ehituse ABC Klevu: `eucs32v2.ksearchnet.com`, key `klevu-168180264665813326`
- Espak Algolia: App `UTKUHA7JT0`, key `b9c55a35ad2799389ce3d4584a5f9def`, index `vwwm_posts_product`
- Bauhof: __NUXT__ IIFE decode, URLs `/et/p/{SKU}/{slug}`
- All scrapers: limit 80

### Upstash Redis
- URL: `https://verified-piranha-96920.upstash.io`
- Token in Vercel env vars, `.env.local`, and GitHub Actions secrets

### Gotchas
- Bauhof CDN blocks images → proxy returns transparent PNG, onError shows eco icon
- Bauhof returns 200 for 404 pages (SPA)
- Decora Klevu images had `needtochange` in URL → stripped
- Espak Algolia index is `vwwm_posts_product`
- Tool products match by model number, not size
- MatchKey format changed mid-session: old BRAND|SIZE, new BRAND|TYPE|SIZE. Watchlist API + component have fallback matching for backwards compatibility.
- Chain-reported discounts >75% are bad data, filtered in deals engine
- Cross-chain spreads >3x ratio = likely false match, chains get stripped

## Future Work

- **More brands/products:** Add brands as they're discovered, rerun catalog builder
- **Price history:** Neon DB for tracking price changes over time
- **Price alerts:** Notify user when a watchlisted product drops in price
- **Product detail page:** Full comparison view with price chart
- **SEO:** Meta tags, structured data
- **Cron frequency:** Increase to daily during peak spring season

## Reference Documents
- `docs/plans/2026-04-13-watchlist-design.md` — watchlist design + implementation plan
- `docs/plans/2026-04-12-catalog-expansion.md` — catalog expansion plan
- `docs/plans/2026-04-12-product-spec.md` — full product spec
- `docs/garden-category-bible.md` — chain category taxonomies
- `docs/brand-confidence-report.md` — brand rankings with chain presence data
- `STACK.md` — complete technical reference

## Rules (from CLAUDE.md)
- All code in main context, NO subagents for builds
- `npm run build` must pass clean before deploy
- `npx vercel --yes --prod` for deploy, `git push origin master` after
- E2E browser testing with Playwright after significant changes
