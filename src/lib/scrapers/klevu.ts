import type { ChainId, RawProduct } from "../types";
import { CHAINS } from "../constants";

interface KlevuConfig {
  host: string;
  apiKey: string;
  chainId: ChainId;
}

interface KlevuRecord {
  name: string;
  brand_name?: string;
  brand?: string;
  price: string;
  salePrice: string;
  sku: string;
  url: string;
  image?: string;
  imageUrl?: string;
  inStock?: string;
  category?: string;
  klevu_category?: string;
}

export async function searchKlevu(
  config: KlevuConfig,
  query: string,
  limit = 30
): Promise<RawProduct[]> {
  const body = JSON.stringify({
    context: { apiKeys: [config.apiKey] },
    recordQueries: [
      {
        id: "productSearch",
        typeOfRequest: "SEARCH",
        settings: {
          query: { term: query },
          typeOfRecords: ["KLEVU_PRODUCT"],
          limit,
          offset: 0,
        },
      },
    ],
  });

  try {
    const res = await fetch(`https://${config.host}/cs/v2/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      cache: "no-store",
    });

    if (!res.ok) return [];

    const json = await res.json();
    const records: KlevuRecord[] =
      json.queryResults?.[0]?.records || [];

    return records.map((r) => {
      const regularPrice = parseFloat(r.price) || 0;
      const salePrice = parseFloat(r.salePrice) || 0;
      const onSale = salePrice > 0 && salePrice < regularPrice;

      return {
        chain: config.chainId,
        name: r.name,
        brand: r.brand_name || r.brand || "",
        sku: r.sku || "",
        ean: null,
        regularPrice,
        salePrice: onSale ? salePrice : null,
        imageUrl: r.imageUrl || r.image || null,
        productUrl: r.url || "",
        inStock: r.inStock !== "no",
        category: r.category || "",
      };
    });
  } catch {
    console.error(`Klevu search failed for ${CHAINS[config.chainId].name}`);
    return [];
  }
}
