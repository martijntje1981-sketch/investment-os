import type { LucideIcon } from "lucide-react";
import {
  Bitcoin,
  BriefcaseBusiness,
  Building2,
  Flame,
  Globe2,
  Landmark,
  LineChart,
  Newspaper,
  PlayCircle,
} from "lucide-react";

import type {
  NewsContentItem,
  NewsMarketCategory,
} from "@/lib/types/newsContent";
import type { MarketsTodayRegionId } from "@/lib/services/news/marketsTodayRegionalClassification";

export type NewsMediaFallbackCategory =
  | "portfolio"
  | "macro"
  | "central_banks"
  | "geopolitics"
  | "video"
  | "regional"
  | "crypto"
  | "commodities"
  | "equities"
  | "general";

export type NewsMediaFallbackTone =
  | "macro"
  | "portfolio"
  | "markets"
  | "crypto"
  | "commodities"
  | "video"
  | "general";

export type NewsMediaFallbackStyle = {
  tone: NewsMediaFallbackTone;
  surfaceClass: string;
  borderClass: string;
  iconClass: string;
};

/** Restrained premium palette for fallback thumbnail surfaces only. */
export const NEWS_MEDIA_FALLBACK_TONE_STYLES: Record<
  NewsMediaFallbackTone,
  Omit<NewsMediaFallbackStyle, "tone">
> = {
  macro: {
    surfaceClass: "bg-blue-50",
    borderClass: "border border-blue-100",
    iconClass: "text-blue-700",
  },
  portfolio: {
    surfaceClass: "bg-violet-50",
    borderClass: "border border-violet-100",
    iconClass: "text-violet-700",
  },
  markets: {
    surfaceClass: "bg-emerald-50",
    borderClass: "border border-emerald-100",
    iconClass: "text-emerald-700",
  },
  crypto: {
    surfaceClass: "bg-amber-50",
    borderClass: "border border-amber-100",
    iconClass: "text-amber-700",
  },
  commodities: {
    surfaceClass: "bg-orange-50",
    borderClass: "border border-orange-100",
    iconClass: "text-orange-700",
  },
  video: {
    surfaceClass: "bg-red-50",
    borderClass: "border border-red-100",
    iconClass: "text-red-700",
  },
  general: {
    surfaceClass: "bg-slate-100",
    borderClass: "border border-slate-200",
    iconClass: "text-slate-600",
  },
};

export const NEWS_MEDIA_FALLBACK_CATEGORY_TONES: Record<
  NewsMediaFallbackCategory,
  NewsMediaFallbackTone
> = {
  portfolio: "portfolio",
  macro: "macro",
  central_banks: "macro",
  geopolitics: "general",
  video: "video",
  regional: "markets",
  crypto: "crypto",
  commodities: "commodities",
  equities: "markets",
  general: "general",
};

const FALLBACK_ICONS: Record<NewsMediaFallbackCategory, LucideIcon> = {
  portfolio: BriefcaseBusiness,
  macro: LineChart,
  central_banks: Landmark,
  geopolitics: Globe2,
  video: PlayCircle,
  regional: Building2,
  crypto: Bitcoin,
  commodities: Flame,
  equities: Building2,
  general: Newspaper,
};

export function getNewsMediaFallbackTone(
  category: NewsMediaFallbackCategory,
): NewsMediaFallbackTone {
  return NEWS_MEDIA_FALLBACK_CATEGORY_TONES[category];
}

export function getNewsMediaFallbackStyle(
  category: NewsMediaFallbackCategory,
): NewsMediaFallbackStyle {
  const tone = getNewsMediaFallbackTone(category);
  return {
    tone,
    ...NEWS_MEDIA_FALLBACK_TONE_STYLES[tone],
  };
}

export function getNewsMediaFallbackIcon(
  category: NewsMediaFallbackCategory,
): LucideIcon {
  return FALLBACK_ICONS[category];
}

export function resolveNewsMediaFallbackCategory(
  item: Pick<
    NewsContentItem,
    | "sourceType"
    | "contentTypeLabel"
    | "marketCategory"
    | "category"
    | "matchedHoldings"
    | "matchedSymbols"
  >,
): NewsMediaFallbackCategory {
  if (
    item.contentTypeLabel === "Video" ||
    item.sourceType === "youtube"
  ) {
    return "video";
  }

  return resolveNewsSubjectFallbackCategory(item);
}

export function resolveNewsSubjectFallbackCategory(
  item: Pick<
    NewsContentItem,
    "marketCategory" | "category" | "matchedHoldings" | "matchedSymbols"
  >,
): NewsMediaFallbackCategory {
  if (
    item.matchedHoldings.length > 0 ||
    item.matchedSymbols.length > 0
  ) {
    return "portfolio";
  }

  if (item.marketCategory === "crypto" || item.category === "crypto") {
    return "crypto";
  }

  if (item.marketCategory === "commodities") {
    return "commodities";
  }

  if (item.marketCategory === "equities") {
    return "equities";
  }

  if (item.marketCategory === "geopolitics") {
    return "geopolitics";
  }

  if (item.category === "macro" || item.marketCategory === "macro") {
    return "macro";
  }

  if (item.category === "markets" || item.marketCategory === "general") {
    return "equities";
  }

  return "general";
}

export function resolveNewsBriefHeadlineFallbackCategory(input: {
  affectedMarket: string;
  marketCategory?: NewsMarketCategory;
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

export function resolveMarketsTodayFallbackCategory(
  regionId: MarketsTodayRegionId,
): NewsMediaFallbackCategory {
  if (regionId === "crypto") {
    return "crypto";
  }
  return "regional";
}
