export const NEWS_HUB_PATH = "/news";
export const ANALYSIS_PATH = "/analysis";
export const LEGACY_BRIEFING_PATH = "/briefing";

export function resolveLegacyBriefingRedirect(): string {
  return NEWS_HUB_PATH;
}

export type NewsHubTab = "market" | "events";

export const NEWS_HUB_TABS: Array<{ id: NewsHubTab; label: string; description: string }> = [
  {
    id: "market",
    label: "Market News",
    description: "Macro, equities, crypto, commodities, and geopolitics",
  },
  {
    id: "events",
    label: "Upcoming Events",
    description: "Verified economic calendar catalysts",
  },
];

export type MarketNewsCategoryFilter =
  | "all"
  | "macro"
  | "equities"
  | "crypto"
  | "commodities"
  | "geopolitics";

export const MARKET_NEWS_CATEGORY_FILTERS: Array<{
  id: MarketNewsCategoryFilter;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "macro", label: "Macro" },
  { id: "equities", label: "Equities" },
  { id: "crypto", label: "Crypto" },
  { id: "commodities", label: "Commodities" },
  { id: "geopolitics", label: "Geopolitics" },
];
