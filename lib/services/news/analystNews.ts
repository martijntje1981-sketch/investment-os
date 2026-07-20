/**
 * Analyst-related news detection, deduplication, and action normalization.
 */

import { unstable_cache } from "next/cache";

import { filterFinancialNewsItems } from "@/lib/services/news/financialContentFilter";
import { createYouTubeProviders } from "@/lib/services/news/providers/youtubeRssProvider";
import { CURATED_YOUTUBE_SOURCES } from "@/lib/services/news/newsSources";
import { personalizeNewsItems } from "@/lib/services/news/relevanceMatching";
import type {
  AnalystRecentAction,
  AnalystRecentActionType,
} from "@/lib/types/analyst";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { PortfolioInstrumentPayload } from "@/lib/types/portfolioStorage";

type AnalystPattern = {
  pattern: RegExp;
  actionType: AnalystRecentActionType;
  label: string;
};

const ANALYST_EVENT_PATTERNS: AnalystPattern[] = [
  { pattern: /\bupgrade(?:d|s)?\b.*\b(?:to|from)\b/i, actionType: "upgrade", label: "Upgrade" },
  { pattern: /\bupgrades?\b/i, actionType: "upgrade", label: "Upgrade" },
  { pattern: /\bdowngrade(?:d|s)?\b/i, actionType: "downgrade", label: "Downgrade" },
  { pattern: /\bdowngrades?\b/i, actionType: "downgrade", label: "Downgrade" },
  { pattern: /\binitiat(?:e|es|ed)\b.*\bcoverage\b/i, actionType: "initiation", label: "Coverage initiation" },
  { pattern: /\bstarts?\b.*\bcoverage\b/i, actionType: "initiation", label: "Coverage initiation" },
  { pattern: /\brais(?:e|es|ed)\b.*\bprice target\b/i, actionType: "target_increase", label: "Price target increase" },
  { pattern: /\bprice target\b.*\brais(?:e|es|ed)\b/i, actionType: "target_increase", label: "Price target increase" },
  { pattern: /\bcut(?:s|ted)?\b.*\bprice target\b/i, actionType: "target_decrease", label: "Price target decrease" },
  { pattern: /\bprice target\b.*\bcut(?:s|ted)?\b/i, actionType: "target_decrease", label: "Price target decrease" },
  { pattern: /\bestimate revision\b/i, actionType: "estimate_revision", label: "Estimate revision" },
  { pattern: /\brevis(?:e|es|ed)\b.*\bestimates?\b/i, actionType: "estimate_revision", label: "Estimate revision" },
  { pattern: /\breaffirm(?:s|ed)?\b.*\b(?:rating|target)\b/i, actionType: "reaffirmation", label: "Rating reaffirmation" },
];

const TARGET_VALUE_PATTERN =
  /(?:from|to)\s+\$?\d+(?:\.\d+)?(?:\s*(?:to|from)\s+\$?\d+(?:\.\d+)?)?/i;
const RATING_VALUE_PATTERN =
  /\b(?:buy|hold|sell|overweight|underweight|neutral|outperform|underperform)\b/gi;

export function detectAnalystEvent(
  title: string,
  summary?: string,
): { actionType: AnalystRecentActionType; label: string } | null {
  const text = `${title} ${summary ?? ""}`.trim();
  for (const entry of ANALYST_EVENT_PATTERNS) {
    if (entry.pattern.test(text)) {
      return { actionType: entry.actionType, label: entry.label };
    }
  }
  return null;
}

export function isAnalystRelatedNews(item: NewsContentItem): boolean {
  return detectAnalystEvent(item.title, item.description ?? undefined) !== null;
}

export function extractPreviousAndNewValues(text: string): {
  previousValue: string | null;
  newValue: string | null;
} {
  const targetMatch = text.match(TARGET_VALUE_PATTERN);
  if (targetMatch) {
    const parts = targetMatch[0].split(/\s+(?:to|from)\s+/i);
    if (parts.length >= 2) {
      return { previousValue: parts[0] ?? null, newValue: parts[1] ?? null };
    }
    return { previousValue: null, newValue: targetMatch[0] };
  }

  const ratings = text.match(RATING_VALUE_PATTERN);
  if (ratings && ratings.length >= 2) {
    return {
      previousValue: ratings[0] ?? null,
      newValue: ratings[ratings.length - 1] ?? null,
    };
  }

  return { previousValue: null, newValue: null };
}

export function buildWhyAnalystActionMatters(
  actionType: AnalystRecentActionType,
  symbol: string,
): string {
  switch (actionType) {
    case "upgrade":
      return `Sell-side coverage for ${symbol} shifted more positively, which can affect how the market prices near-term expectations.`;
    case "downgrade":
      return `Analyst sentiment for ${symbol} weakened, which may reflect revised earnings or risk assumptions.`;
    case "initiation":
      return `New analyst coverage adds an external benchmark for ${symbol} that investors often compare against current prices.`;
    case "target_increase":
      return `A higher price target signals revised upside expectations for ${symbol} relative to prior analyst views.`;
    case "target_decrease":
      return `A lower price target signals reduced upside expectations for ${symbol} relative to prior analyst views.`;
    case "estimate_revision":
      return `Estimate revisions can change the earnings baseline investors use when valuing ${symbol}.`;
    case "reaffirmation":
      return `A reaffirmed rating confirms the current analyst stance on ${symbol} without a directional change.`;
  }
}

export function dedupeAnalystNews(items: NewsContentItem[]): NewsContentItem[] {
  const seen = new Set<string>();
  const output: NewsContentItem[] = [];

  for (const item of items) {
    const event = detectAnalystEvent(item.title, item.description ?? undefined);
    const symbol = item.matchedSymbols[0]?.toUpperCase() ?? "UNKNOWN";
    const key = `${symbol}|${event?.actionType ?? "unknown"}|${item.title.trim().toLowerCase()}|${item.sourceName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }

  return output;
}

export function tagAnalystNewsItems(items: NewsContentItem[]): NewsContentItem[] {
  return items.map((item) => {
    const event = detectAnalystEvent(item.title, item.description ?? undefined);
    if (!event) return item;
    return {
      ...item,
      relevanceLabel: event.label,
    };
  });
}

export function filterPortfolioAnalystNews(
  items: NewsContentItem[],
): NewsContentItem[] {
  return dedupeAnalystNews(
    tagAnalystNewsItems(items.filter(isAnalystRelatedNews)),
  );
}

export function newsItemToAnalystAction(
  item: NewsContentItem,
  holdingName?: string,
): AnalystRecentAction | null {
  const event = detectAnalystEvent(item.title, item.description ?? undefined);
  if (!event) return null;

  const symbol = item.matchedSymbols[0]?.toUpperCase();
  if (!symbol) return null;

  const text = `${item.title} ${item.description ?? ""}`;
  const { previousValue, newValue } = extractPreviousAndNewValues(text);

  return {
    id: item.id,
    symbol,
    name: holdingName ?? symbol,
    firm: item.sourceName,
    actionType: event.actionType,
    previousValue,
    newValue,
    occurredAt: item.publishedAt,
    sourceName: item.sourceName,
    sourceUrl: item.canonicalUrl,
    whyItMatters: buildWhyAnalystActionMatters(event.actionType, symbol),
  };
}

export function buildAnalystActionsFromNewsItems(
  items: NewsContentItem[],
  holdings: Array<Pick<PortfolioInstrumentPayload, "symbol" | "name">> = [],
): AnalystRecentAction[] {
  const nameBySymbol = new Map(
    holdings.map((holding) => [holding.symbol.trim().toUpperCase(), holding.name]),
  );

  return filterPortfolioAnalystNews(items)
    .map((item) =>
      newsItemToAnalystAction(
        item,
        nameBySymbol.get(item.matchedSymbols[0]?.toUpperCase() ?? ""),
      ),
    )
    .filter((action): action is AnalystRecentAction => action != null)
    .slice(0, 12);
}

const youtubeProviders = createYouTubeProviders(CURATED_YOUTUBE_SOURCES);

const getCachedPortfolioNewsItems = unstable_cache(
  async () => {
    const fetchedAt = new Date().toISOString();
    const results = await Promise.all(
      youtubeProviders.map((provider) =>
        provider.fetchItems({ fetchedAt, timeoutMs: 8_000 }),
      ),
    );
    return results.flatMap((result) => result.items);
  },
  ["investment-os-analyst-news-scan"],
  { revalidate: 45 * 60 },
);

export async function buildAnalystActionsFromNews(
  holdings: Array<PortfolioInstrumentPayload>,
): Promise<AnalystRecentAction[]> {
  if (holdings.length === 0) return [];

  const rawItems = await getCachedPortfolioNewsItems();
  const financialItems = filterFinancialNewsItems(rawItems);
  const personalized = personalizeNewsItems(financialItems, holdings as never);
  return buildAnalystActionsFromNewsItems(personalized, holdings);
}

export function shouldShowAnalystDashboardCard(
  snapshot: { hasMeaningfulCoverage: boolean },
): boolean {
  return snapshot.hasMeaningfulCoverage;
}
