# Sinu Aed — Continuation Prompt

> Copy this entire prompt into a fresh Claude Code session to resume work.

## Project

**Sinu Aed** ("Your Garden") — Spring gardening price comparison app.
**Dir:** `C:\Users\Kasutaja\Claude_Projects\hind-compare`
**Live:** https://hind-compare.vercel.app
**GitHub:** https://github.com/keeltekool/sinu-aed

## What's Built (MVP LIVE)

- Next.js 16 + TypeScript + Tailwind v4 on Vercel
- 4 chain scrapers: Decora (Klevu), Ehituse ABC (Klevu), Espak (Algolia), Bauhof (__NUXT__ IIFE decoder)
- Product matcher: brand+size for supplies, brand+model for tools, two-pass with fuzzy word overlap
- Search API `/api/search?q=` with Upstash Redis cache (1h TTL, 3-tier fallback)
- Deals API `/api/deals` with horizontal scroll on home page ("Praegu soodsalt")
- Image proxy `/api/img?url=` bypasses chain hotlink protection
- Home page: search bar + 7 category tiles + deals section
- Search results: brand-grouped comparison cards, chain price rows link to stores

## Current State: 74 comparable products. Target: 200+

The app works but has thin product coverage. The NEXT build is catalog expansion.

## What's Been Decided

### Final 7 Categories (approved)
1. Mullad ja turbad
2. Väetised
3. Muru (grass seed, lawn fertilizer, lawn soil — NOT tools)
4. Värvid ja lakid
5. Aiatööriistad
6. Muruhooldus (mowers, trimmers — the TOOLS)
7. Kastmistarvikud

### Strategy: Brand-First Cross-Chain Search
- Search by BRAND NAME at each chain individually
- Cross-match results: products in 2+ chains = golden
- 77 comparable found from just 10 brands × 3 chains in test
- Adding Bauhof + more brands + improved matcher → 200+ target

### Confirmed Top Brands (data-driven, see docs/brand-confidence-report.md)

**TIER 1 — All 3+ chains, 100+ products:**
Baltic Agro (307), Makita (215), Horticom (212), Fiskars (178), Eskaro (173), Biolan (119), Tikkurila (118), Substral (107)

**TIER 2 — 2+ chains, strong:**
Ryobi, Gardena, Sadolin, Vivacolor, Kekkilä, Pinotex, Scheppach, Bosch, Matogard, DeWalt, Baltic Bark, Prosperplast, Cellfast

### Google-Verified Cross-Chain Products (exact products confirmed at 3-4 of our chains)

**Mullad:**
- Biolan Aiamaa Must Muld 60L → Bauhof ✓ Espak ✓ Decora ✓ Ehituse ABC ✓
- Biolan Mustikamuld 50L → all 4
- Biolan Kurgiturvas 50L → Bauhof, Decora, Espak confirmed
- Kekkilä Kasvuturvas 130L/300L → Bauhof, Decora, Espak
- Grass universaalne must muld 50L → Bauhof, Decora

**Väetised:**
- Baltic Agro Kevadine Aiaväetis 3kg/4kg/5kg/15kg → Bauhof ✓ Espak ✓ Decora ✓
- Baltic Agro Kevadine Muruväetis 4kg/15kg → all chains
- Substral Muruväetis 100 päeva → Bauhof, Bauhaus, Eesti Murud
- Biolan kanakaka graanulid → Bauhof, Espak

**Värvid:**
- Vivacolor Wall 7 (multiple sizes) → Hind.ee 42 listings, all chains
- Eskaro Akrit 7 (0.95L/4.75L/9.5L) → Decora ✓ Bauhof ✓ Ehituse ABC ✓
- Tikkurila Harmony → Ehituse ABC, Decora, Bauhof
- Sadolin Bindo 3/7/20 → Ehituse ABC, Decora, Hind.ee 19-23 listings
- Pinotex Ultra/Extreme → Bauhof, Decora, Espak

**Aiatööriistad:**
- Fiskars Solid labidas → Bauhof ✓ Espak ✓ Ehituse ABC ✓ (Hind.ee 193 products)
- Fiskars PowerGear UPX82/UPX86 → Ehituse ABC, SityPro, Kaup24
- Fiskars SmartFit L86 → Bauhof, Ehituse ABC

**Muruhooldus:**
- Makita DUR192LZ trimmer → Hind.ee 15 sellers
- Makita DUR191LZX3 → Hind.ee 10 sellers
- Gardena trimmers → multiple chains

**Kastmistarvikud:**
- Gardena voolikud → Hind.ee 120 products, all chains
- Gardena pihustid → Hind.ee 118 products

## Key Technical Details

### API Configs (in constants.ts)
- Decora Klevu: `decoracsv2.ksearchnet.com`, key `klevu-159479682665411675`
- Ehituse ABC Klevu: `eucs32v2.ksearchnet.com`, key `klevu-168180264665813326`
- Espak Algolia: App `UTKUHA7JT0`, key `b9c55a35ad2799389ce3d4584a5f9def`, index `vwwm_posts_product`
- Bauhof: __NUXT__ IIFE decode from `/et/search?term=`, URLs `/et/p/{SKU}/{slug}`

### Upstash Redis
- URL: `https://verified-piranha-96920.upstash.io`
- Token in Vercel env vars and `.env.local`

### Gotchas
- Bauhof CDN blocks images → use `/_ipx/` proxy or prefer other chains' images
- Bauhof returns 200 for 404 pages (SPA) → can't HTTP-test links
- Decora Klevu images had `needtochange` in URL → stripped in klevu.ts
- Espak Algolia index is `vwwm_posts_product` not `wp_posts_product`
- Klevu category browsing doesn't work (returns random products)
- Tool products need model number matching, not size matching

## What To Build Next

### Catalog Expansion (74 → 200+)
1. Update `constants.ts`: new 7 categories with `searchTerms: string[]` per category (brand names + category terms)
2. Increase API limits: 30→80 in klevu.ts, algolia.ts, bauhof.ts
3. Improve matcher: fuzzy word overlap for tool products (Fiskars/Gardena matching currently weak)
4. Update search API: when query matches a category's primary term, search ALL that category's searchTerms
5. Update home page CategoryGrid for new 7 categories

### Implementation Plan (saved)
See `docs/plans/2026-04-12-catalog-expansion.md` — needs rewrite with brand-first strategy.

### Reference Documents
- `docs/garden-category-bible.md` — full category taxonomy from all 4 chains
- `docs/brand-confidence-report.md` — brand rankings with chain presence data
- `docs/plans/2026-04-12-product-spec.md` — full product spec
- `STACK.md` — complete technical reference

## Rules (from CLAUDE.md)
- All code in main context, NO subagents for builds
- New project = new service instances (Upstash already created)
- Superpowers skills for planning, brainstorming, debugging
- E2E verification with Playwright after deploys
- `npm run build` must pass clean before deploy
- `npx vercel --yes --prod` for deploy, `git push origin master` after
