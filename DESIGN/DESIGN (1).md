# Design System Document: Editorial Gardening & Price Comparison

## 1. Overview & Creative North Star
**Creative North Star: "The Verdant Curator"**

This design system moves away from the sterile, utilitarian nature of typical price comparison tools. Instead, it adopts an **Editorial Organic** aesthetic—blending the authoritative structure of a high-end gardening magazine with the breathable, rhythmic pulse of a spring morning in Estonia.

To break the "template" look, we employ **Intentional Asymmetry**. Hero sections should feature overlapping elements where imagery "breaks" the container of the card, and typography scales are pushed to extremes to create a clear, sophisticated hierarchy. We treat the UI not as a digital grid, but as a series of layered botanical plates.

---

## 2. Colors & Tonal Depth

Our palette is rooted in the Estonian landscape: deep forest greens, rich soil browns, and the crisp light of early spring.

### Brand & Functional Palette
- **Primary (Lush Garden):** `#154212` (On-Primary: `#ffffff`)
- **Primary Container:** `#2D5A27` — Used for prominent brand moments.
- **Secondary (Earthy Soil):** `#7a5649` — Connects the UI to the ground.
- **Tertiary (Spring Bloom):** `#572f00` — Accents for warmth and urgency.

### Merchant Identity (Retailer Tokens)
To maintain brand integrity for partners while keeping them within our "Curator" ecosystem, use these specific variables:
- **Variable-Bauhof:** `#F7941D`
- **Variable-Espak:** `#01285F`
- **Variable-Decora:** `#E2001A`
- **Variable-EhituseABC:** `#009639`

### The "No-Line" Rule & Surface Hierarchy
**Strict Directive:** Prohibit 1px solid borders for sectioning. Boundaries are defined through background shifts.
- **Surface Layering:** Use `surface` (`#f7faf6`) for the base. Use `surface-container-low` (`#f1f4f0`) for secondary content areas. 
- **The Glass & Gradient Rule:** For primary CTAs, use a subtle linear gradient from `primary` to `primary_container`. For floating navigation or modal overlays, use `surface_container_lowest` at 80% opacity with a `20px` backdrop-blur to create a "Frosted Greenhouse" effect.

---

## 3. Typography: Editorial Authority

We use a pairing of **Plus Jakarta Sans** (Display/Headlines) for a modern, slightly wider character, and **Inter** (Body/UI) for maximum legibility.

| Level | Token | Font | Size | Weight | Character |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Plus Jakarta Sans | 3.5rem | 700 | Dramatic, tight tracking |
| **Headline** | `headline-md`| Plus Jakarta Sans | 1.75rem | 600 | Authoritative, "Neighborly" |
| **Title** | `title-lg` | Inter | 1.375rem | 600 | Clear product naming |
| **Body** | `body-lg` | Inter | 1rem | 400 | Comfortable reading |
| **Label** | `label-md` | Inter | 0.75rem | 500 | All-caps for metadata |

*Editorial Note:* In the Estonian language UI, ensure `line-height` for body text is set to `1.6` to accommodate longer compound words (e.g., *aiatarvete kauplus*).

---

## 4. Elevation & Depth: Tonal Layering

We reject the standard "Shadow-Box" UI. Depth is achieved through the **Layering Principle**.

- **Stacking:** Place a `surface-container-lowest` (#ffffff) card on a `surface-container` (#ecefeb) background. The contrast provides the "lift."
- **Ambient Shadows:** If a card represents a "Price Hero," use a shadow: `0 20px 40px rgba(24, 28, 26, 0.06)`. It should feel like soft morning light, not a digital effect.
- **The "Ghost Border":** If accessibility requires a border, use `outline_variant` at **15% opacity**. Never use a 100% opaque stroke.

---

## 5. Components

### Cards (The Core Unit)
- **Rule:** No borders. No internal dividers.
- **Structure:** Use `surface-container-lowest`. 
- **Price Badging:** Prices are displayed in `headline-sm` using the `primary` green.
- **Retailer Badge:** Use a small circular avatar with the Merchant Identity color, paired with `label-sm` text.

### Buttons (Tactile & Grounded)
- **Primary:** `primary` background with `on_primary` text. Roundedness: `lg` (1rem). 
- **Secondary:** `secondary_container` background. Provides an earthy, tactile feel for "Save for Later" actions.
- **Tertiary:** Text-only with an icon. Use for "Vaata kõiki" (See all) links.

### Inputs & Search
- **Search Bar:** Large, `surface-container-high` background, `xl` rounding (1.5rem) to suggest "friendly search."
- **States:** On focus, the background shifts to `surface_container_lowest` with a subtle `primary` ghost border.

### Price Comparison List
- **Instruction:** Do not use line dividers. Separate store listings using 16px of vertical white space and alternating `surface-container-low` backgrounds for every second row to create a "Zebra" rhythm that feels intentional rather than accidental.

---

## 6. Do’s and Don’ts

### Do:
- **Do** use "Aedniku valik" (Gardener's Choice) badges using the `tertiary_fixed` color to highlight best value.
- **Do** allow images to slightly overlap the edge of their container cards to enhance the "Alive" mood.
- **Do** use Estonian terminology that feels neighborly (e.g., use "Sinu aed" instead of "Kasutaja profiil").

### Don’t:
- **Don't** use pure black (#000000) for text. Use `on_surface` (#181c1a) to keep the contrast natural.
- **Don't** use standard 4px or 6px corners. Stick strictly to `lg` (1rem / 16px) for cards and `md` (0.75rem / 12px) for smaller elements.
- **Don't** cram the UI. If a screen feels full, add 24px of `surface` space. The app must feel as "breathable" as a garden.