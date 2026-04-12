export type ChainId = "bauhof" | "espak" | "decora" | "ehituse-abc";

export interface ChainConfig {
  id: ChainId;
  name: string;
  color: string;
  baseUrl: string;
}

export interface RawProduct {
  chain: ChainId;
  name: string;
  brand: string;
  sku: string;
  ean: string | null;
  regularPrice: number;
  salePrice: number | null;
  imageUrl: string | null;
  productUrl: string;
  inStock: boolean;
  category: string;
}

export interface NormalizedProduct extends RawProduct {
  normalizedBrand: string;
  normalizedType: string;
  normalizedSize: string;
  matchKey: string; // brand|size — used for cross-chain grouping
}

export interface ChainPrice {
  chain: ChainId;
  chainName: string;
  chainColor: string;
  regularPrice: number;
  salePrice: number | null;
  effectivePrice: number;
  productUrl: string;
  inStock: boolean;
  discountPercent: number | null;
}

export interface ProductGroup {
  matchKey: string;
  displayName: string;
  brand: string;
  size: string;
  category: string;
  imageUrl: string | null;
  chains: ChainPrice[];
  cheapestChain: ChainId;
  cheapestPrice: number;
  mostExpensivePrice: number;
  priceSpread: number;
  savingsPercent: number;
  chainCount: number;
}

export interface SearchResponse {
  query: string;
  comparable: ProductGroup[]; // 2+ chains
  singleChain: ProductGroup[]; // 1 chain only
  totalProducts: number;
  totalChains: number;
  fetchedAt: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  searchQuery: string;
}

export interface Deal {
  product: string;
  brand: string;
  size: string;
  imageUrl: string | null;
  chain: ChainId;
  chainName: string;
  chainColor: string;
  effectivePrice: number;
  regularPrice: number;
  discountPercent: number;
  productUrl: string;
  savingsScore: number;
}

export interface DealsResponse {
  deals: Deal[];
  fetchedAt: string;
}
