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
  matchedHoldingIds: string[];
  matchedSymbols: string[];
  relevanceLabel: string | null;
  category: NewsContentCategory;
  contentTypeLabel: NewsContentTypeLabel;
  fetchedAt: string;
  relevanceScore: number;
};

export type NewsFeedFetchResult = {
  sourceId: string;
  sourceName: string;
  items: NewsContentItem[];
  error: string | null;
};

export type NewsApiResponse = {
  success: boolean;
  items: NewsContentItem[];
  forYou: NewsContentItem[];
  markets: NewsContentItem[];
  videos: NewsContentItem[];
  sourceErrors: Array<{ sourceId: string; sourceName: string; error: string }>;
  fetchedAt: string;
  error?: string;
};
