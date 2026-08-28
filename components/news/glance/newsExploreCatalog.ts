import { NEWS_EXPLORE_DESTINATIONS } from "@/lib/services/newsGlance";

export const NEWS_EXPLORE_MOBILE_COMPACT_TITLES = [
  "Holdings news",
  "Markets Today",
  "Perspectives",
  "Search",
] as const;

export const NEWS_EXPLORE_ITEM_HREFS = [
  NEWS_EXPLORE_DESTINATIONS.holdings,
  NEWS_EXPLORE_DESTINATIONS.marketBrief,
  NEWS_EXPLORE_DESTINATIONS.marketsToday,
  NEWS_EXPLORE_DESTINATIONS.search,
  NEWS_EXPLORE_DESTINATIONS.macro,
  NEWS_EXPLORE_DESTINATIONS.videos,
  NEWS_EXPLORE_DESTINATIONS.crypto,
  NEWS_EXPLORE_DESTINATIONS.perspectives,
  NEWS_EXPLORE_DESTINATIONS.marketPulse,
  NEWS_EXPLORE_DESTINATIONS.events,
] as const;
