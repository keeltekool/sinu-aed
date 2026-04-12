import type { RawProduct } from "../types";
import { ALGOLIA_CONFIG } from "../constants";

interface AlgoliaHit {
  post_title: string;
  regular_price: number;
  sale_price: number;
  sku: string;
  ean: string;
  stock_status: string;
  images?: {
    medium?: { url: string };
  };
  permalink: string;
  taxonomies?: {
    pa_kaubamark?: string[];
    product_cat?: string[];
  };
}

export async function searchAlgolia(
  query: string,
  limit = 80
): Promise<RawProduct[]> {
  const body = JSON.stringify({
    requests: [
      {
        indexName: ALGOLIA_CONFIG.indexName,
        params: `query=${encodeURIComponent(query)}&hitsPerPage=${limit}&attributesToRetrieve=post_title,regular_price,sale_price,sku,ean,stock_status,images,permalink,taxonomies`,
      },
    ],
  });

  try {
    const res = await fetch(
      `https://${ALGOLIA_CONFIG.appId}-dsn.algolia.net/1/indexes/*/queries`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Algolia-Application-Id": ALGOLIA_CONFIG.appId,
          "X-Algolia-API-Key": ALGOLIA_CONFIG.apiKey,
        },
        body,
        cache: "no-store",
      }
    );

    if (!res.ok) return [];

    const json = await res.json();
    const hits: AlgoliaHit[] = json.results?.[0]?.hits || [];

    return hits.map((h) => {
      const regularPrice = h.regular_price || 0;
      const salePrice = h.sale_price || 0;
      const onSale = salePrice > 0 && salePrice < regularPrice;
      const brand = h.taxonomies?.pa_kaubamark?.[0] || "";
      const category = h.taxonomies?.product_cat?.join(" > ") || "";

      return {
        chain: "espak" as const,
        name: h.post_title || "",
        brand: brand.replace(/\s*(OÜ|AS|SIA|OY|SRL|SP)\s*$/i, "").trim(),
        sku: h.sku || "",
        ean: h.ean || null,
        regularPrice,
        salePrice: onSale ? salePrice : null,
        imageUrl: h.images?.medium?.url || null,
        productUrl: h.permalink || "",
        inStock: h.stock_status === "instock",
        category,
      };
    });
  } catch {
    console.error("Algolia search failed for Espak");
    return [];
  }
}
