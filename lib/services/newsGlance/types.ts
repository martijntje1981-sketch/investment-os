import type { NewsMediaFallbackCategory } from "@/components/news/newsMediaFallback";
import type { NewsHubHoldingRow } from "@/lib/services/holdingIntelligence";
import type { NewsContentItem } from "@/lib/types/newsContent";

export const NEWS_GLANCE_NO_MATERIAL = "No material news found";
export const NEWS_GLANCE_BIGGER_PICTURE_EMPTY =
  "No meaningful broader context right now.";
export const NEWS_GLANCE_BIGGER_PICTURE_LIMIT = 3;

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
  classificationLabel: "Direct" | "Sector / theme context" | "Macro context" | null;
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

export type NewsGlanceSynthesis = {
  kicker: string;
  text: string;
} | null;

export type NewsGlanceView = {
  holdingRows: NewsGlanceHoldingRow[];
  biggerPicture: NewsGlanceBiggerPictureItem[];
  synthesis: NewsGlanceSynthesis;
  fetchedAt: string | null;
};
