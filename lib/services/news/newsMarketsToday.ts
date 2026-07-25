import { detectPortfolioMarketImpact } from "@/lib/services/news/newsPortfolioSentiment";
import {
  assignStoriesToMarketsTodayRegions,
  dedupeMarketsTodayItems,
} from "@/lib/services/news/marketsTodayDedup";
import {
  classifyMarketsTodayRegionId,
  MARKETS_TODAY_REGION_LABELS,
  MARKETS_TODAY_REGION_ORDER,
  type MarketsTodayRegionId,
} from "@/lib/services/news/marketsTodayRegionalClassification";
import type { NewsContentItem } from "@/lib/types/newsContent";

export type MarketsTodaySentiment =
  | "Positive"
  | "Neutral"
  | "Negative"
  | "unavailable";

export type MarketsTodayStory = {
  id: string;
  title: string;
  sourceName: string;
  publishedAt: string;
  canonicalUrl: string;
};

export type MarketsTodayRegion = {
  id: MarketsTodayRegionId;
  label: string;
  sentiment: MarketsTodaySentiment;
  stories: MarketsTodayStory[];
};

export const MARKETS_TODAY_EMPTY_STATE_COPY =
  "No major verified developments available.";

export const MARKETS_TODAY_STORIES_LABEL = "Key developments";

function hasClearDirectionalSignal(item: NewsContentItem): boolean {
  const impact = detectPortfolioMarketImpact(item);
  return impact === "Positive" || impact === "Negative";
}

/** Conservative sentiment — only shown when multiple items agree with clear signals. */
export function aggregateMarketsTodaySentiment(
  items: NewsContentItem[],
): MarketsTodaySentiment {
  if (items.length < 2) {
    return "unavailable";
  }

  const directional = items.filter(
    (item) =>
      hasClearDirectionalSignal(item) && item.impactLevel !== "Low Impact",
  );

  if (directional.length < 2) {
    return "unavailable";
  }

  const impacts = directional.map((item) => detectPortfolioMarketImpact(item));
  const uniqueImpacts = new Set(
    impacts.filter((impact) => impact !== "Neutral"),
  );

  if (uniqueImpacts.size !== 1) {
    return "unavailable";
  }

  return [...uniqueImpacts][0] as Exclude<MarketsTodaySentiment, "unavailable">;
}

function displayTitle(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

function toStory(item: NewsContentItem): MarketsTodayStory {
  return {
    id: item.id,
    title: displayTitle(item.title),
    sourceName: item.sourceName,
    publishedAt: item.publishedAt,
    canonicalUrl: item.canonicalUrl,
  };
}

function topStories(items: NewsContentItem[]): MarketsTodayStory[] {
  return items.slice(0, 3).map(toStory);
}

export function buildMarketsTodayRegions(input: {
  items: NewsContentItem[];
}): MarketsTodayRegion[] {
  const assigned = assignStoriesToMarketsTodayRegions(
    input.items,
    classifyMarketsTodayRegionId,
  );

  return MARKETS_TODAY_REGION_ORDER.map((id) => {
    const regionItems = assigned.get(id) ?? [];
    return {
      id,
      label: MARKETS_TODAY_REGION_LABELS[id],
      sentiment: aggregateMarketsTodaySentiment(regionItems),
      stories: topStories(regionItems),
    };
  });
}

export {
  classifyMarketsTodayRegion,
  classifyMarketsTodayRegionId,
  MARKETS_TODAY_REGION_ORDER,
  MARKETS_TODAY_REGION_LABELS,
} from "@/lib/services/news/marketsTodayRegionalClassification";

export {
  dedupeMarketsTodayItems,
  normalizeMarketsTodayTitle,
  normalizeMarketsTodayUrl,
} from "@/lib/services/news/marketsTodayDedup";
