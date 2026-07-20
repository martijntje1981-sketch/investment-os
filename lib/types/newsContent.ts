export type NewsImpactLevel = "High Impact" | "Medium Impact" | "Low Impact";

export type NewsSourceType = "youtube" | "news" | "x" | "instagram";

export type NewsContentCategory =
  | "markets"
  | "macro"
  | "equities"
  | "crypto"
  | "energy"
  | "technology"
  | "general";

/** Premium market taxonomy for broader news grouping. */
export type NewsMarketCategory =
  | "macro"
  | "equities"
  | "crypto"
  | "commodities"
  | "geopolitics"
  | "general";

export type NewsContentTypeLabel =
  | "Video"
  | "Market commentary"
  | "News"
  | "Social post";

export type NewsMatchedHolding = {
  id: string;
  symbol: string;
  name: string;
  providerSymbol: string | null;
};

export type NewsDataState = "live" | "partial" | "cached" | "unavailable";

export type EventsDataState = "live" | "empty" | "provider_unavailable";

/** Provider-neutral normalized content item for the News page. */
export type NewsContentItem = {
  id: string;
  title: string;
  sourceName: string;
  sourceType: NewsSourceType;
  canonicalUrl: string;
  thumbnailUrl: string | null;
  publishedAt: string;
  description: string | null;
  /** Factual summary derived from title/description — not model-generated. */
  summary: string;
  /** Editorial read-through — clearly separated from confirmed facts. */
  interpretation: string;
  impactLevel: NewsImpactLevel;
  matchedHoldingIds: string[];
  matchedSymbols: string[];
  matchedHoldings: NewsMatchedHolding[];
  relevanceLabel: string | null;
  category: NewsContentCategory;
  marketCategory: NewsMarketCategory;
  contentTypeLabel: NewsContentTypeLabel;
  fetchedAt: string;
  relevanceScore: number;
  /** Provider-reported symbols on wire articles (EODHD). */
  articleSymbols?: string[];
};

export type MarketBriefInsight = {
  id: string;
  label: string;
  text: string;
  kind: "macro" | "portfolio" | "general";
  insightType: "fact" | "interpretation";
  sourceName?: string | null;
};

export type TodaysMarketBrief = {
  title: string;
  updatedAt: string;
  keyInsights: MarketBriefInsight[];
  biggestMacroDevelopment: string;
  biggestMacroDevelopmentType: "fact" | "interpretation" | "unavailable";
  biggestPortfolioDevelopment: string | null;
  biggestPortfolioDevelopmentType: "fact" | "interpretation" | "unavailable";
  whatToWatchToday: string;
  sourceCount: number;
  hasVerifiedContent: boolean;
};

export type NewsFeedFetchResult = {
  sourceId: string;
  sourceName: string;
  items: NewsContentItem[];
  error: string | null;
};

export type UpcomingEventCategory =
  | "earnings"
  | "cpi"
  | "fed"
  | "ecb"
  | "macro";

export type UpcomingMarketEvent = {
  id: string;
  title: string;
  category: UpcomingEventCategory;
  date: string;
  timeLabel: string;
  country: string;
  description: string;
  impact: "High" | "Medium";
  source: string;
};

export type NewsDataStatus = {
  feedsState: NewsDataState;
  eventsState: EventsDataState;
  eodhdNewsAvailable: boolean;
  sourceCount: number;
  activeSourceNames: string[];
};

export type NewsApiResponse = {
  success: boolean;
  marketBrief: TodaysMarketBrief;
  portfolioNews: NewsContentItem[];
  macroNews: NewsContentItem[];
  marketVideos: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
  dividendNews?: NewsContentItem[];
  analystNews?: NewsContentItem[];
  dataStatus: NewsDataStatus;
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
  fetchedAt: string;
  error?: string;
};
