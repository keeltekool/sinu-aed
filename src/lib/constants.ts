import type { ChainConfig, ChainId, Category } from "./types";

export const CHAINS: Record<ChainId, ChainConfig> = {
  bauhof: {
    id: "bauhof",
    name: "Bauhof",
    color: "#F7941D",
    baseUrl: "https://www.bauhof.ee",
  },
  espak: {
    id: "espak",
    name: "Espak",
    color: "#01285F",
    baseUrl: "https://www.espak.ee",
  },
  decora: {
    id: "decora",
    name: "Decora",
    color: "#E2001A",
    baseUrl: "https://www.decora.ee",
  },
  "ehituse-abc": {
    id: "ehituse-abc",
    name: "Ehituse ABC",
    color: "#009639",
    baseUrl: "https://www.ehituseabc.ee",
  },
};

export const CHAIN_IDS = Object.keys(CHAINS) as ChainId[];

export const KLEVU_CONFIGS = {
  decora: {
    host: "decoracsv2.ksearchnet.com",
    apiKey: "klevu-159479682665411675",
    chainId: "decora" as ChainId,
  },
  "ehituse-abc": {
    host: "eucs32v2.ksearchnet.com",
    apiKey: "klevu-168180264665813326",
    chainId: "ehituse-abc" as ChainId,
  },
};

export const ALGOLIA_CONFIG = {
  appId: "UTKUHA7JT0",
  apiKey: "b9c55a35ad2799389ce3d4584a5f9def",
  indexName: "vwwm_posts_product",
};

export const CATEGORIES: Category[] = [
  { id: "mullad", label: "Mullad", icon: "potted_plant", searchQuery: "muld" },
  { id: "vaetised", label: "Väetised", icon: "grass", searchQuery: "väetis" },
  { id: "seemned", label: "Seemned", icon: "compost", searchQuery: "seemned" },
  {
    id: "varvid",
    label: "Värvid",
    icon: "format_paint",
    searchQuery: "värv",
  },
  {
    id: "toöriistad",
    label: "Aiatööriistad",
    icon: "carpenter",
    searchQuery: "fiskars",
  },
  { id: "lillepotid", label: "Lillepotid", icon: "eco", searchQuery: "lillepott" },
  {
    id: "muruniidukid",
    label: "Muruniidukid",
    icon: "agriculture",
    searchQuery: "muruniiduk",
  },
  {
    id: "kastekannud",
    label: "Kastekannud",
    icon: "water_drop",
    searchQuery: "kastekann",
  },
];

// Known brands for product normalization (uppercase)
export const KNOWN_BRANDS = [
  "BIOLAN",
  "GRASS",
  "KEKKILÄ",
  "KEKKILA",
  "FISKARS",
  "BALTIC AGRO",
  "MAKITA",
  "GARDENA",
  "BOSCH",
  "RYOBI",
  "DEWALT",
  "ESKARO",
  "VIVACOLOR",
  "TIKKURILA",
  "SADOLIN",
  "SUBSTRAL",
  "HORTICOM",
  "COMPO",
  "PROSPERPLAST",
  "ELHO",
  "MATOGARD",
  "BIOPON",
  "GREENWORLD",
  "HUSQVARNA",
  "SCHEPPACH",
  "CLINT",
  "GUDNORD",
  "SESTON",
  "KURZEMES SEKLAS",
  "ECOFERTIS",
  "KNAUF",
  "WEBER",
  "SAKRET",
  "CAPAROL",
  "PINOTEX",
  "WOODEX",
  "FALU VAPEN",
  "DUPLI COLOR",
  "HANSAVÄRV",
  "RIIA LAKID",
  "NYLFORCE",
  "EINHELL",
  "HYUNDAI",
  "SUNSEEKER",
  "CELL-FAST",
  "GF SRL",
  "MICA DECORATIONS",
  "LAMELA",
  "KOBI",
  "AQUAPHOR",
  "BALTIC BARK",
  "EASY GARDEN",
  "TERA",
  "ECOVACS",
  "BIOPLUS",
];
