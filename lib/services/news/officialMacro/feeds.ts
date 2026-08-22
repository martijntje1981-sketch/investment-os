import type { OfficialMacroFeed } from "@/lib/services/news/officialMacro/types";

/**
 * Curated official RSS only. Administrative / noise feeds are omitted.
 * Failures skip that feed; they do not take down the hub.
 */
export const OFFICIAL_MACRO_FEEDS: readonly OfficialMacroFeed[] = [
  {
    id: "ecb-press",
    sourceName: "European Central Bank",
    institution: "ecb",
    feedUrl: "https://www.ecb.europa.eu/rss/press.html",
    feedKind: "policy_decision",
  },
  {
    id: "ecb-statpress",
    sourceName: "European Central Bank",
    institution: "ecb",
    feedUrl: "https://www.ecb.europa.eu/rss/statpress.html",
    feedKind: "economic_release",
  },
  {
    id: "fed-press-monetary",
    sourceName: "Federal Reserve Board",
    institution: "federal_reserve",
    feedUrl: "https://www.federalreserve.gov/feeds/press_monetary.xml",
    feedKind: "policy_decision",
    defaultTopic: "monetary_policy",
  },
  {
    id: "fed-press-economic",
    sourceName: "Federal Reserve Board",
    institution: "federal_reserve",
    feedUrl: "https://www.federalreserve.gov/feeds/press_economic.xml",
    feedKind: "economic_release",
  },
  {
    id: "fed-speeches",
    sourceName: "Federal Reserve Board",
    institution: "federal_reserve",
    feedUrl: "https://www.federalreserve.gov/feeds/speeches.xml",
    feedKind: "speech",
  },
  {
    id: "stlouis-fred-blog",
    sourceName: "Federal Reserve Bank of St. Louis",
    institution: "st_louis_fed",
    feedUrl: "https://fredblog.stlouisfed.org/feed/",
    feedKind: "research",
  },
  {
    id: "atlanta-gdpnow",
    sourceName: "Federal Reserve Bank of Atlanta",
    institution: "atlanta_fed",
    feedUrl: "https://www.atlantafed.org/rss/gdpnow",
    feedKind: "economic_release",
    defaultTopic: "growth",
  },
  {
    id: "atlanta-macroblog",
    sourceName: "Federal Reserve Bank of Atlanta",
    institution: "atlanta_fed",
    feedUrl: "https://www.atlantafed.org/rss/macroblog",
    feedKind: "research",
  },
];

export const OFFICIAL_MACRO_ITEMS_PER_FEED = 8;
