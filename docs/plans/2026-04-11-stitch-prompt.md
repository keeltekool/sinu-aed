# Google Stitch Design Prompt — Spring Gardening Price Comparison App

## App Overview

A mobile-first web app that instantly compares prices for the same home improvement and gardening product across 4 Estonian retail chains: Bauhof, Espak, Decora, and Ehituse ABC.

The core use case: a customer stands in their garden thinking "I need 60L of Biolan soil" — they open this app, search "Biolan muld 60L", and within seconds see which chain has it cheapest right now, including current discounts and sales.

## Target Audience

Estonian home gardeners and DIY enthusiasts during spring season (March-June). Not professional builders. People who buy soil, seeds, paint, garden tools, flower pots — seasonal, emotional, price-sensitive purchases. Age 25-55, mobile-first, value-conscious but not extreme couponers. They just want to know where to go before they drive to the store.

## Theme & Mood

Spring gardening extravaganza. Fresh, growing, alive. Think:
- Fresh greens, earthy tones, spring energy
- Clean, breathable layouts — like stepping into a garden center
- Confident, not cluttered — this app gives you one clear answer: "go HERE for the best price"
- Estonian language UI (labels in Estonian)

Avoid: generic blue tech aesthetics, dark mode default, overly corporate feel. This should feel like a helpful neighbor, not a finance tool.

## Core Features

### 1. Search (Primary Feature — Landing Page)
- Large search bar, front and center
- Placeholder text: "Otsi toodet... nt Biolan muld 60L"
- Auto-suggest as user types (debounced, 300ms)
- Results appear below: product cards grouped by matched product
- Each card shows the product name, image, and price from each chain
- Chains sorted cheapest-first within each card
- Cheapest chain gets a visual badge/highlight
- Price spread indicator: "Säästad kuni €X.XX" (You save up to)

### 2. Product Comparison Card
When a product match is found across chains, show:
- Product image (from whichever chain has the best image)
- Canonical product name: "Biolan Aiamaa Must Muld 60L"
- Brand badge (e.g., Biolan logo or brand pill)
- Price table with all chains:
  ```
  🏆 Ehituse ABC    €3.20
     Espak           €3.29  (was €5.40, -39%)
     Decora          €3.29  (was €5.20, -37%)
     Bauhof          €3.49
  ```
- Each row: chain logo/icon + chain name + current price + discount info if on sale
- Cheapest row highlighted (not just bold — visually distinct background)
- Tap a chain row → opens product page on that chain's website

### 3. Category Browse
- 8 spring gardening categories as visual tiles/pills:
  1. Mullad ja turbad (Soils) — icon: soil bag
  2. Väetised (Fertilizers) — icon: plant growth
  3. Seemned (Seeds) — icon: seed packet
  4. Värvid (Paints) — icon: paint roller
  5. Aiatööriistad (Garden tools) — icon: pruning shears
  6. Lillepotid (Flower pots) — icon: pot
  7. Muruniidukid (Lawn mowers) — icon: mower
  8. Kastekannud (Watering cans) — icon: watering can
- Tap a category → shows golden products in that category
- Products sorted by biggest price spread (most interesting comparisons first)

### 4. Deal Highlights
- Section on home page: "Parimad pakkumised" (Best deals)
- Shows products with the biggest discounts RIGHT NOW across any chain
- Sorted by discount percentage
- Badge showing "Decora -39%" or "Espak -43%"

### 5. Chain Info Bar
- Horizontal scrollable bar showing all 4 chain logos
- Each with a small indicator: how many products on sale right now
- Tap → filter to see only that chain's deals

## Screens

### Screen 1: Home / Search
- Top: App logo + tagline "Leia parim hind" (Find the best price)
- Search bar (hero element)
- Below search: Category tiles (2x4 grid or horizontal scroll)
- Below categories: "Parimad pakkumised" deal cards
- Bottom: minimal tab bar (Search / Categories / Info)

### Screen 2: Search Results
- Search bar at top (filled with query)
- Results count: "12 toodet leitud" (12 products found)
- Product comparison cards stacked vertically
- Each card expandable to show full chain comparison
- Filter pills: by chain, by category, "Ainult sooduspakkumised" (Sales only)

### Screen 3: Product Detail
- Full product comparison view
- Large product image
- Product name + brand
- Price comparison table (all chains)
- Price history chart (line chart, last 30 days) — future feature placeholder
- "Ava poes" (Open in store) buttons for each chain
- Related products: "Sarnased tooted" (Similar products)

### Screen 4: Category Browse
- Category header with icon
- Grid/list of golden products in this category
- Sort by: Cheapest, Biggest discount, Name
- Filter by chain

## Chain Visual Identity

Each chain needs a consistent visual identity throughout the app:
- **Bauhof**: Orange `#F7941D` — largest chain, most recognizable
- **Espak**: Dark blue `#01285F` — professional, building-focused
- **Decora**: Red `#E2001A` or use their brand color — home & garden
- **Ehituse ABC**: Green `#009639` — the ABC brand green

These colors appear on chain pills, price rows, and badges.

## Typography & Layout

- Primary font: Inter or similar clean sans-serif
- Mobile-first: 360-428px primary viewport
- Max content width: 640px (centered on larger screens)
- Generous whitespace — not cramped product listings
- Card-based layout but NO card-in-card nesting
- Tonal background shifts to separate sections (not shadows)
- Rounded corners: `rounded-lg` consistently (never xl or 2xl)

## Component Inventory

1. **SearchBar** — large input with search icon, clear button, debounced
2. **CategoryTile** — icon + label, tappable, 2-column grid
3. **ProductComparisonCard** — the core component:
   - Product image (left or top)
   - Product name + brand pill
   - Chain price rows (sorted cheapest first)
   - Price spread badge
   - Expandable/collapsible
4. **ChainPriceRow** — chain icon + name + price + discount badge
5. **DealCard** — product thumbnail + name + discount % + chain badge
6. **ChainFilterBar** — horizontal scrollable chain logos with selection state
7. **CategoryFilterPills** — filter chips for categories
8. **PriceSpreadBadge** — "Säästad €X.XX" savings indicator
9. **DiscountBadge** — "-39%" red/orange pill on sale items
10. **EmptyState** — friendly illustration when no results
11. **LoadingSkeleton** — shimmer placeholders during search

## Interaction Patterns

- Search is instant (debounced 300ms, results appear as you type)
- Tap product card → expands inline to show all chains (no page navigation)
- Tap chain row in expanded card → opens external link to that chain's product page
- Pull-to-refresh on any list view
- Smooth scroll, no jank
- Category selection is toggle (tap again to deselect)

## Data Reality

The app compares real products from real Estonian stores:
- **Biolan Aiamaa Must Muld 60L**: €3.20-€3.49 across chains
- **Fiskars PowerGear oksalõikur**: €76-€195 across chains (157% spread!)
- **Eskaro Akrit 7 seinavärv**: €52-€70 across chains
- **Baltic Agro kevadine aiaväetis**: varies by size

Products are matched by brand + product type + size across chains. Some chains have sale prices 25-40% below regular price during spring season.

## What This App is NOT

- Not a full e-commerce store — no cart, no checkout
- Not a product review site — no ratings, no comments
- Not a professional builder tool — no bulk pricing, no B2B
- Not a general comparison engine — focused on spring gardening category only
- No user accounts needed — open, instant, anonymous

## Technical Notes (for implementation reference)

- Built with React/Next.js + Tailwind CSS
- Mobile-first responsive design
- Data from 4 chain APIs (2 Klevu search, 1 Algolia, 1 SSR extraction)
- Upstash Redis cache for fast responses
- ~200-500 tracked "golden products" that exist across multiple chains
- Estonian language only (for now)
