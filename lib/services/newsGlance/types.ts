import type { NewsMediaFallbackCategory } from "@/components/news/newsMediaFallback";
import type { NewsHubHoldingRow } from "@/lib/services/holdingIntelligence";
import type { MarketsTodaySentiment } from "@/lib/services/news/newsMarketsToday";
import type { NewsContentItem } from "@/lib/types/newsContent";

export const NEWS_GLANCE_NO_MATERIAL = "No material news found";
export const NEWS_GLANCE_BIGGER_PICTURE_LIMIT = 3;
export const NEWS_GLANCE_HOLDING_LIMIT_MOBILE = 3;
export const NEWS_GLANCE_HOLDING_LIMIT_DESKTOP = 4;
export const NEWS_GLANCE_MARKET_REGION_IDS = [
  "us",
  "europe",
  "asia",
  "crypto",
] as const;

export type NewsGlanceMarketRegionId =
  (typeof NEWS_GLANCE_MARKET_REGION_IDS)[number];

export type NewsGlanceVisualFamily =
  | "holding"
  | "macro"
  | "crypto"
  | "commodities";

export type NewsGlanceMatchKind = "direct" | "sector" | "macro" | "none";

export type NewsGlanceMoveDirection = "up" | "down" | "flat" | "unknown";

export type NewsGlanceHoldingRow = {
  holdingId: string;
  symbol: string;
  name: string;
  exposureLabel: string;
  weightPercent: number | null;
  changePercent: number | null;
  moveLabel: string;
  moveDirection: NewsGlanceMoveDirection;
  headline: string | null;
  sourceName: string | null;
  publishedAt: string | null;
  canonicalUrl: string | null;
  thumbnailUrl: string | null;
  hasThumbnail: boolean;
  matchRole: NewsHubHoldingRow["matchRole"];
  matchKind: NewsGlanceMatchKind;
  classificationLabel: "Direct" | "Context" | "Macro" | null;
  emptyCopy: string | null;
  visualFamily: NewsGlanceVisualFamily;
  fallbackCategory: NewsMediaFallbackCategory;
  sourceItem: NewsContentItem | null;
};

export type NewsGlanceBiggerPictureItem = {
  id: string;
  themeLabel: string;
  headline: string;
  sourceName: string;
  publishedAt: string;
  canonicalUrl: string | null;
  thumbnailUrl: string | null;
  hasThumbnail: boolean;
  relevanceCue: string;
  matchKind: "sector" | "macro";
  visualFamily: NewsGlanceVisualFamily;
  fallbackCategory: NewsMediaFallbackCategory;
  sourceItem: NewsContentItem;
};

export type NewsGlanceMarketTile = {
  id: NewsGlanceMarketRegionId;
  label: string;
  href: string;
  sentiment: MarketsTodaySentiment;
  statusLabel: string;
  signal: string | null;
  available: boolean;
  visualFamily: NewsGlanceVisualFamily;
};

export type NewsGlanceSynthesis = {
  kicker: string;
  text: string;
} | null;

export type NewsGlanceView = {
  holdingRows: NewsGlanceHoldingRow[];
  aroundTheMarkets: NewsGlanceMarketTile[];
  biggerPicture: NewsGlanceBiggerPictureItem[];
  synthesis: NewsGlanceSynthesis;
  fetchedAt: string | null;
};
