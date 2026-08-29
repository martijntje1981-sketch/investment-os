/**
 * Hash-target News detail catalog.
 * Primary /news stays glance-only; known hashes open the preserved hub engines.
 */

import {
  MARKET_PULSE_PATH,
  NEWS_PATH,
  PERSPECTIVES_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS, SECTION_IDS } from "@/lib/navigation/deepLinks";
import { NEWS_MARKETS_TODAY_HREF } from "@/lib/navigation/discoverDestinations";

export type NewsDetailId =
  | "portfolio-news"
  | "news-market-brief"
  | "markets-today"
  | "news-search"
  | "news-macro"
  | "news-videos";

export type NewsDetailDefinition = {
  id: NewsDetailId;
  title: string;
  hashes: readonly string[];
};

export const NEWS_DETAIL_MODULES: readonly NewsDetailDefinition[] = [
  {
    id: "portfolio-news",
    title: "Holdings news",
    hashes: [SECTION_IDS.portfolioNews, "news-for-portfolio"],
  },
  {
    id: "news-market-brief",
    title: "Market brief",
    hashes: [SECTION_IDS.newsMarketBrief],
  },
  {
    id: "markets-today",
    title: "Markets Today",
    hashes: ["markets-today"],
  },
  {
    id: "news-search",
    title: "Search & filters",
    hashes: ["news-search", "news-search-results"],
  },
  {
    id: "news-macro",
    title: "Macro",
    hashes: ["news-macro", "news-macro-heading"],
  },
  {
    id: "news-videos",
    title: "Videos",
    hashes: ["news-videos"],
  },
] as const;

const HASH_TO_DETAIL = new Map<string, NewsDetailId>();
for (const definition of NEWS_DETAIL_MODULES) {
  for (const hash of definition.hashes) {
    HASH_TO_DETAIL.set(hash, definition.id);
  }
}

export function resolveNewsDetailId(
  hash: string | null | undefined,
): NewsDetailId | null {
  if (!hash) return null;
  return HASH_TO_DETAIL.get(hash) ?? null;
}

export function newsDetailTitle(id: NewsDetailId): string {
  return NEWS_DETAIL_MODULES.find((module) => module.id === id)?.title ?? "News";
}

export function newsDetailHref(id: NewsDetailId): string {
  const definition = NEWS_DETAIL_MODULES.find((module) => module.id === id);
  const hash = definition?.hashes[0] ?? id;
  return `${NEWS_PATH}#${hash}`;
}

export const NEWS_EXPLORE_DESTINATIONS = {
  holdings: newsDetailHref("portfolio-news"),
  marketBrief: DASHBOARD_DEEP_LINKS.marketBriefing,
  marketsToday: NEWS_MARKETS_TODAY_HREF,
  search: newsDetailHref("news-search"),
  macro: newsDetailHref("news-macro"),
  videos: newsDetailHref("news-videos"),
  crypto: NEWS_MARKETS_TODAY_HREF,
  perspectives: PERSPECTIVES_PATH,
  marketPulse: MARKET_PULSE_PATH,
  events: "/events",
} as const;
