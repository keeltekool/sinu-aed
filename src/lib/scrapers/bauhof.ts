import type { RawProduct } from "../types";

/**
 * Bauhof scraper — decodes __NUXT__ IIFE payload from search pages.
 *
 * Bauhof uses Nuxt.js SSR. Product data is embedded in window.__NUXT__
 * as an IIFE: (function(a,b,c,...){return {...}})(val1,val2,...)
 *
 * Product names/SKUs are literal strings in the function body.
 * Prices are variable references (e.g., price:al) — resolved by
 * mapping function parameters to their argument values.
 */
export async function searchBauhof(
  query: string,
  limit = 32
): Promise<RawProduct[]> {
  const url = `https://www.bauhof.ee/et/search?term=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    if (!res.ok) return [];

    const html = await res.text();
    return decodeNuxtProducts(html);
  } catch {
    console.error("Bauhof search failed");
    return [];
  }
}

function decodeNuxtProducts(html: string): RawProduct[] {
  const nuxtIdx = html.indexOf("window.__NUXT__=");
  if (nuxtIdx === -1) return [];

  const scriptEnd = html.indexOf("</script>", nuxtIdx);
  if (scriptEnd === -1) return [];

  const nuxt = html.substring(nuxtIdx, scriptEnd);

  // Extract function parameters
  const pStart = nuxt.indexOf("(function(") + 10;
  const pEnd = nuxt.indexOf(")", pStart);
  if (pStart === 9 || pEnd === -1) return [];

  const params = nuxt.substring(pStart, pEnd).split(",");

  // Find IIFE arguments (after last '}(')
  let lastBrace = -1;
  let pos = 0;
  while (true) {
    const i = nuxt.indexOf("}(", pos);
    if (i === -1) break;
    lastBrace = i;
    pos = i + 1;
  }
  if (lastBrace === -1) return [];

  const argsStr = nuxt.substring(lastBrace + 2, nuxt.lastIndexOf(")"));

  // Parse argument values (split by comma, respect strings)
  const vals = splitArgs(argsStr);

  // Build variable → value map
  const vm: Record<string, unknown> = {};
  for (let i = 0; i < Math.min(params.length, vals.length); i++) {
    vm[params[i]] = parseValue(vals[i]);
  }

  // Extract products: title:"...",sku:"..."...price:VAR,old_price:VAR
  const products: RawProduct[] = [];
  const re =
    /title:"([^"]+)",sku:"(\d+)"[^}]*?price:([a-zA-Z_$0-9]+),old_price:([a-zA-Z_$0-9]+)/g;
  let m;

  // Also extract real URL slugs from the HTML: /et/p/{SKU}/{slug}
  const slugMap = new Map<string, string>();
  const slugRe = /\/et\/p\/(\d+)\/([a-z0-9-]+)/g;
  let sm;
  while ((sm = slugRe.exec(html)) !== null) {
    slugMap.set(sm[1], sm[2]);
  }

  while ((m = re.exec(nuxt)) !== null) {
    const name = m[1].replace(/\\u002F/g, "/");
    const sku = m[2];
    const price = typeof vm[m[3]] === "number" ? (vm[m[3]] as number) : 0;
    const oldPrice = typeof vm[m[4]] === "number" ? (vm[m[4]] as number) : 0;
    const onSale = oldPrice > price && price > 0;

    if (price <= 0) continue;

    // Real Bauhof URL format: /et/p/{SKU}/{slug}
    const slug = slugMap.get(sku) || name.toLowerCase().replace(/[^a-zäöüõšž0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const productUrl = `https://www.bauhof.ee/et/p/${sku}/${slug}`;

    // Image via Bauhof's IPX image proxy
    const imgMatch = nuxt
      .substring(m.index, m.index + 500)
      .match(/image_url:"([^"]+)"/);
    const imageUrl = imgMatch
      ? `https://www.bauhof.ee/_ipx/f_webp,q_80,fit_inside,s_420x332/${imgMatch[1].replace(/\\u002F/g, "/")}`
      : null;

    products.push({
      chain: "bauhof",
      name,
      brand: "",
      sku,
      ean: null,
      regularPrice: onSale ? oldPrice : price,
      salePrice: onSale ? price : null,
      imageUrl,
      productUrl,
      inStock: true,
      category: "",
    });
  }

  return products;
}

function splitArgs(raw: string): string[] {
  const vals: string[] = [];
  let buf = "";
  let inStr = false;
  let strCh = "";
  let depth = 0;

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];
    if (inStr) {
      buf += c;
      if (c === strCh && raw.charCodeAt(i - 1) !== 92) inStr = false;
    } else if (c === '"') {
      inStr = true;
      strCh = c;
      buf += c;
    } else if ("([{".includes(c)) {
      depth++;
      buf += c;
    } else if (")]}".includes(c)) {
      depth--;
      buf += c;
    } else if (c === "," && depth === 0) {
      vals.push(buf.trim());
      buf = "";
    } else {
      buf += c;
    }
  }
  if (buf.trim()) vals.push(buf.trim());
  return vals;
}

function parseValue(raw: string): unknown {
  if (raw === "void 0" || raw === "null") return null;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  const num = Number(raw);
  if (!isNaN(num) && raw !== "") return num;
  return raw;
}
