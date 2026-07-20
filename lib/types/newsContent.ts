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

export type NewsContentTypeLabel =
  | "Video"
  | "Market commentary"
  | "News"
  | "Social post";

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
  aiSummary: string;
  whyThisMatters: string;
  impactLevel: NewsImpactLevel;
  matchedHoldingIds: string[];
  matchedSymbols: string[];
  relevanceLabel: string | null;
  category: NewsContentCategory;
  contentTypeLabel: NewsContentTypeLabel;
  fetchedAt: string;
  relevanceScore: number;
};

export type MarketBriefInsight = {
  id: string;
  label: string;
  text: string;
  kind: "macro" | "portfolio" | "general";
};

export type TodaysMarketBrief = {
  title: string;
  updatedAt: string;
  keyInsights: MarketBriefInsight[];
  biggestMacroDevelopment: string;
  biggestPortfolioDevelopment: string | null;
  whatToWatchToday: string;
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
};

export type NewsApiResponse = {
  success: boolean;
  marketBrief: TodaysMarketBrief;
  portfolioNews: NewsContentItem[];
  macroNews: NewsContentItem[];
  marketVideos: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
  fetchedAt: string;
  error?: string;
};
