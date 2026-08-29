import type {
  NewsContentItem,
  NewsContentTypeLabel,
  NewsMarketCategory,
  NewsSourceType,
} from "@/lib/types/newsContent";
import type { NewsMediaFallbackCategory } from "@/components/news/newsMediaFallback";
import { resolveNewsSubjectFallbackCategory } from "@/components/news/newsMediaFallback";

export type NewsMediaType = "article" | "video";

export type NewsMediaPresentation = {
  mediaType: NewsMediaType;
  subjectLabel: string;
  subjectFallbackCategory: NewsMediaFallbackCategory;
  thumbnailFallbackCategory: NewsMediaFallbackCategory;
  ctaLabel: "Read article" | "Watch video";
  showPlayIndicator: boolean;
};

const SUBJECT_LABELS: Record<NewsMarketCategory, string> = {
  macro: "Macro",
  equities: "Markets",
  crypto: "Crypto",
  commodities: "Commodities",
  geopolitics: "Geopolitics",
  general: "Markets",
};

/**
 * Canonical normalized media type from provider fields only.
 * Does not infer video status from source names or headline text.
 */
export function resolveNewsMediaType(input: {
  sourceType: NewsSourceType;
  contentTypeLabel: NewsContentTypeLabel;
}): NewsMediaType {
  if (input.contentTypeLabel === "Video") {
    return "video";
  }

  if (input.sourceType === "youtube") {
    return "video";
  }

  return "article";
}

export function resolveNewsMediaTypeFromItem(
  item: Pick<NewsContentItem, "sourceType" | "contentTypeLabel">,
): NewsMediaType {
  return resolveNewsMediaType(item);
}

export function getNewsMediaCtaLabel(
  mediaType: NewsMediaType,
): NewsMediaPresentation["ctaLabel"] {
  return mediaType === "video" ? "Watch video" : "Read article";
}

export function formatNewsSubjectLabel(
  marketCategory: NewsMarketCategory,
): string {
  return SUBJECT_LABELS[marketCategory] ?? "Markets";
}

export function buildNewsMediaPresentation(
  item: Pick<
    NewsContentItem,
    | "sourceType"
    | "contentTypeLabel"
    | "marketCategory"
    | "category"
    | "matchedHoldings"
    | "matchedSymbols"
  >,
): NewsMediaPresentation {
  const mediaType = resolveNewsMediaType(item);
  const subjectFallbackCategory = resolveNewsSubjectFallbackCategory(item);

  return {
    mediaType,
    subjectLabel: formatNewsSubjectLabel(item.marketCategory),
    subjectFallbackCategory,
    thumbnailFallbackCategory:
      mediaType === "video" ? "video" : subjectFallbackCategory,
    ctaLabel: getNewsMediaCtaLabel(mediaType),
    showPlayIndicator: mediaType === "video",
  };
}

export function buildNewsBriefHeadlinePresentation(input: {
  affectedMarket: string;
  marketCategory: NewsMarketCategory;
  mediaType: NewsMediaType;
}): Pick<
  NewsMediaPresentation,
  | "mediaType"
  | "subjectLabel"
  | "subjectFallbackCategory"
  | "thumbnailFallbackCategory"
  | "ctaLabel"
  | "showPlayIndicator"
> {
  const subjectFallbackCategory = resolveNewsBriefHeadlineSubjectCategory(input);

  return {
    mediaType: input.mediaType,
    subjectLabel: input.affectedMarket,
    subjectFallbackCategory,
    thumbnailFallbackCategory:
      input.mediaType === "video" ? "video" : subjectFallbackCategory,
    ctaLabel: getNewsMediaCtaLabel(input.mediaType),
    showPlayIndicator: input.mediaType === "video",
  };
}

function resolveNewsBriefHeadlineSubjectCategory(input: {
  affectedMarket: string;
  marketCategory: NewsMarketCategory;
}): NewsMediaFallbackCategory {
  const market = input.affectedMarket.toLowerCase();
  if (market.includes("crypto")) return "crypto";
  if (market.includes("commodities")) return "commodities";
  if (market.includes("geopolitics")) return "geopolitics";
  if (market.includes("macro")) return "macro";
  if (market.includes("portfolio")) return "portfolio";
  if (market.includes("equities") || market.includes("markets")) return "equities";
  if (input.marketCategory === "crypto") return "crypto";
  if (input.marketCategory === "commodities") return "commodities";
  if (input.marketCategory === "geopolitics") return "geopolitics";
  if (input.marketCategory === "macro") return "macro";
  if (input.marketCategory === "equities") return "equities";
  return "general";
}

export function buildMarketsTodayStoryPresentation(input: {
  mediaType: NewsMediaType;
  marketCategory: NewsMarketCategory;
  regionFallbackCategory: NewsMediaFallbackCategory;
}): Pick<
  NewsMediaPresentation,
  "thumbnailFallbackCategory" | "ctaLabel" | "showPlayIndicator" | "subjectLabel"
> {
  return {
    subjectLabel: formatNewsSubjectLabel(input.marketCategory),
    thumbnailFallbackCategory:
      input.mediaType === "video" ? "video" : input.regionFallbackCategory,
    ctaLabel: getNewsMediaCtaLabel(input.mediaType),
    showPlayIndicator: input.mediaType === "video",
  };
}
