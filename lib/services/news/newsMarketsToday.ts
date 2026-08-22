import { detectPortfolioMarketImpact } from "@/lib/services/news/newsPortfolioSentiment";
import { resolveNewsMediaTypeFromItem } from "@/lib/services/news/newsMediaType";
import { selectTrustedNewsThumbnail } from "@/lib/services/news/newsThumbnail";
import {
  assignStoriesToMarketsTodayRegions,
} from "@/lib/services/news/marketsTodayDedup";
import {
  classifyMarketsTodayRegionId,
  MARKETS_TODAY_REGION_EMOJI,
  MARKETS_TODAY_REGION_LABELS,
  MARKETS_TODAY_REGION_ORDER,
  type MarketsTodayRegionId,
} from "@/lib/services/news/marketsTodayRegionalClassification";
import type {
  NewsContentItem,
  NewsImpactLevel,
  NewsMarketCategory,
  NewsSourceType,
} from "@/lib/types/newsContent";
import type { NewsMediaType } from "@/lib/services/news/newsMediaType";

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
  thumbnailUrl: string | null;
  mediaType: NewsMediaType;
  sourceType: NewsSourceType;
  marketCategory: NewsMarketCategory;
  impactLevel: NewsImpactLevel;
  summary: string;
  whyItMatters: string;
};

export type MarketsTodayRegion = {
  id: MarketsTodayRegionId;
  label: string;
  emoji: string;
  sentiment: MarketsTodaySentiment;
  summary: string | null;
  highestImpactStory: MarketsTodayStory | null;
  updatedAt: string | null;
  stories: MarketsTodayStory[];
};

export type MarketsTodayPulse = {
  overallSentiment: MarketsTodaySentiment;
  biggestTheme: string;
  highestImpactEvent: string;
  summary: string;
  updatedAt: string | null;
};

export const MARKETS_TODAY_EMPTY_STATE_COPY =
  "No major market-moving developments.";

export const MARKETS_TODAY_STORIES_LABEL = "Key developments";

export const MARKETS_TODAY_PULSE_TITLE = "Today's Global Market Pulse";

const IMPACT_RANK: Record<NewsImpactLevel, number> = {
  "High Impact": 3,
  "Medium Impact": 2,
  "Low Impact": 1,
};

const SUMMARY_MAX_CHARS = 160;
const WHY_IT_MATTERS_MAX_CHARS = 140;

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

export function clampMarketsTodayText(
  value: string,
  maxChars: number,
): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }
  if (cleaned.length <= maxChars) {
    return cleaned;
  }
  return `${cleaned.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
}

function storySummary(item: NewsContentItem): string {
  const raw = (item.summary || item.description || item.title).trim();
  return clampMarketsTodayText(raw, SUMMARY_MAX_CHARS);
}

function storyWhyItMatters(item: NewsContentItem): string {
  const raw = (item.interpretation || item.summary || "").trim();
  return clampMarketsTodayText(raw, WHY_IT_MATTERS_MAX_CHARS);
}

function toStory(item: NewsContentItem): MarketsTodayStory {
  return {
    id: item.id,
    title: displayTitle(item.title),
    sourceName: item.sourceName,
    publishedAt: item.publishedAt,
    canonicalUrl: item.canonicalUrl,
    thumbnailUrl: selectTrustedNewsThumbnail(item),
    mediaType: resolveNewsMediaTypeFromItem(item),
    sourceType: item.sourceType,
    marketCategory: item.marketCategory,
    impactLevel: item.impactLevel,
    summary: storySummary(item),
    whyItMatters: storyWhyItMatters(item),
  };
}

export function compareMarketsTodayStoriesByImpact(
  left: Pick<MarketsTodayStory, "impactLevel" | "publishedAt">,
  right: Pick<MarketsTodayStory, "impactLevel" | "publishedAt">,
): number {
  const impactDiff =
    IMPACT_RANK[right.impactLevel] - IMPACT_RANK[left.impactLevel];
  if (impactDiff !== 0) {
    return impactDiff;
  }
  return (
    (Date.parse(right.publishedAt) || 0) - (Date.parse(left.publishedAt) || 0)
  );
}

function sortItemsByImpact(items: NewsContentItem[]): NewsContentItem[] {
  return [...items].sort((left, right) =>
    compareMarketsTodayStoriesByImpact(left, right),
  );
}

function topStories(items: NewsContentItem[]): MarketsTodayStory[] {
  return sortItemsByImpact(items).slice(0, 3).map(toStory);
}

function latestTimestamp(stories: MarketsTodayStory[]): string | null {
  let latest: string | null = null;
  let latestMs = Number.NEGATIVE_INFINITY;
  for (const story of stories) {
    const ms = Date.parse(story.publishedAt);
    if (!Number.isFinite(ms)) {
      continue;
    }
    if (ms > latestMs) {
      latestMs = ms;
      latest = story.publishedAt;
    }
  }
  return latest;
}

function buildRegionSummary(
  items: NewsContentItem[],
  stories: MarketsTodayStory[],
): string | null {
  if (stories.length === 0) {
    return null;
  }
  const lead = sortItemsByImpact(items)[0];
  if (!lead) {
    return stories[0]?.summary || null;
  }
  return storySummary(lead) || stories[0]?.summary || null;
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
    const stories = topStories(regionItems);
    return {
      id,
      label: MARKETS_TODAY_REGION_LABELS[id],
      emoji: MARKETS_TODAY_REGION_EMOJI[id],
      sentiment: aggregateMarketsTodaySentiment(regionItems),
      summary: buildRegionSummary(regionItems, stories),
      highestImpactStory: stories[0] ?? null,
      updatedAt: latestTimestamp(stories),
      stories,
    };
  });
}

function aggregatePulseSentiment(
  regions: MarketsTodayRegion[],
): MarketsTodaySentiment {
  const available = regions
    .map((region) => region.sentiment)
    .filter(
      (sentiment): sentiment is Exclude<MarketsTodaySentiment, "unavailable"> =>
        sentiment !== "unavailable",
    );

  if (available.length === 0) {
    return "unavailable";
  }

  const counts = available.reduce(
    (acc, sentiment) => {
      acc[sentiment] += 1;
      return acc;
    },
    { Positive: 0, Neutral: 0, Negative: 0 },
  );

  const ranked = (
    Object.entries(counts) as Array<
      [Exclude<MarketsTodaySentiment, "unavailable">, number]
    >
  ).sort((left, right) => right[1] - left[1]);

  const [topSentiment, topCount] = ranked[0] ?? ["Neutral", 0];
  const secondCount = ranked[1]?.[1] ?? 0;

  if (topCount === 0 || topCount === secondCount) {
    return "unavailable";
  }

  return topSentiment;
}

export function buildMarketsTodayPulse(
  regions: MarketsTodayRegion[],
): MarketsTodayPulse {
  const stories = regions
    .flatMap((region) => region.stories)
    .sort(compareMarketsTodayStoriesByImpact);

  const lead = stories[0] ?? null;
  const highImpact = stories.find(
    (story) => story.impactLevel === "High Impact",
  );
  const themeSource = highImpact ?? lead;
  const eventSource = highImpact ?? lead;

  const summarySource =
    lead?.summary ||
    lead?.whyItMatters ||
    regions.find((region) => region.summary)?.summary ||
    "";

  return {
    overallSentiment: aggregatePulseSentiment(regions),
    biggestTheme: themeSource
      ? clampMarketsTodayText(themeSource.title, 90)
      : "Markets are quiet across major regions.",
    highestImpactEvent: eventSource
      ? clampMarketsTodayText(eventSource.title, 90)
      : "No high-impact event standing out yet.",
    summary: summarySource
      ? clampMarketsTodayText(summarySource, SUMMARY_MAX_CHARS)
      : "No major market-moving developments across the tracked regions.",
    updatedAt: latestTimestamp(stories),
  };
}

export {
  classifyMarketsTodayRegion,
  classifyMarketsTodayRegionId,
  MARKETS_TODAY_REGION_ORDER,
  MARKETS_TODAY_REGION_LABELS,
  MARKETS_TODAY_REGION_EMOJI,
} from "@/lib/services/news/marketsTodayRegionalClassification";

export {
  dedupeMarketsTodayItems,
  normalizeMarketsTodayTitle,
  normalizeMarketsTodayUrl,
} from "@/lib/services/news/marketsTodayDedup";
