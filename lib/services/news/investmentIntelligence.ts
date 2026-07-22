import type {
  NewsApiResponse,
  NewsContentItem,
  UpcomingMarketEvent,
} from "@/lib/types/newsContent";
import {
  buildNewsHubLayout,
  computeNewsRankScore,
  isStrongPortfolioItem,
} from "@/lib/services/news/newsFeedRanking";
import { collectSearchableNewsItems } from "@/lib/services/news/newsSearchFilter";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";

export type PortfolioStatus =
  | "Stable"
  | "Watching"
  | "Elevated"
  | "High Attention";

export type HoldingSentiment = "positive" | "neutral" | "negative";

export type MustWatchRecommendation = {
  type: "article" | "video";
  itemId: string;
  title: string;
  sourceName: string;
  canonicalUrl: string;
  reason: string;
};

export type InvestmentIntelligence = {
  portfolioStatus: PortfolioStatus;
  portfolioSummary: string;
  todayMatters: string[];
  holdingInsights: {
    positive: string[];
    neutral: string[];
    negative: string[];
  };
  macroHighlights: string[];
  mustWatch: MustWatchRecommendation | null;
  keyRisks: string[];
  opportunities: string[];
  quietMarket: boolean;
  generatedAt: string;
};

const NO_MATERIAL_DEVELOPMENTS =
  "No material developments were detected.";

const POSITIVE_SIGNAL =
  /\b(rally|rallies|surge|surges|gain|gains|inflow|inflows|improve|improves|rising|rise|rose|beat|beats|strong|outperform|upgrade|upgrades|recovery|rebound)\b/i;
const NEGATIVE_SIGNAL =
  /\b(fall|falls|drop|drops|decline|declines|outflow|outflows|weak|weaker|miss|misses|downgrade|downgrades|concern|concerns|slump|slumps|selloff|sell-off|cut|cuts|pressure)\b/i;

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

function itemText(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`.toLowerCase();
}

function detectSentiment(text: string): HoldingSentiment {
  const hasPositive = POSITIVE_SIGNAL.test(text);
  const hasNegative = NEGATIVE_SIGNAL.test(text);

  if (hasPositive && !hasNegative) {
    return "positive";
  }
  if (hasNegative && !hasPositive) {
    return "negative";
  }
  return "neutral";
}

function uniqueSymbols(items: NewsContentItem[]): Set<string> {
  const symbols = new Set<string>();
  for (const item of items) {
    for (const symbol of item.matchedSymbols) {
      symbols.add(symbol.toUpperCase());
    }
    for (const holding of item.matchedHoldings) {
      symbols.add(holding.symbol.toUpperCase());
    }
  }
  return symbols;
}

function buildHoldingInsights(
  portfolioItems: NewsContentItem[],
): InvestmentIntelligence["holdingInsights"] {
  const bySymbol = new Map<
    string,
    { sentiment: HoldingSentiment; score: number }
  >();

  for (const item of portfolioItems) {
    const sentiment = detectSentiment(itemText(item));
    const weight =
      item.relevanceScore +
      (item.impactLevel === "High Impact" ? 3 : item.impactLevel === "Medium Impact" ? 1 : 0);

    for (const symbol of item.matchedSymbols) {
      const key = symbol.toUpperCase();
      const existing = bySymbol.get(key);
      if (!existing || weight > existing.score) {
        bySymbol.set(key, { sentiment, score: weight });
      }
    }

    for (const holding of item.matchedHoldings) {
      const key = holding.symbol.toUpperCase();
      const existing = bySymbol.get(key);
      if (!existing || weight > existing.score) {
        bySymbol.set(key, { sentiment, score: weight });
      }
    }
  }

  const result: InvestmentIntelligence["holdingInsights"] = {
    positive: [],
    neutral: [],
    negative: [],
  };

  for (const [symbol, entry] of bySymbol.entries()) {
    if (entry.sentiment === "positive") {
      result.positive.push(symbol);
    } else if (entry.sentiment === "negative") {
      result.negative.push(symbol);
    } else {
      result.neutral.push(symbol);
    }
  }

  result.positive.sort();
  result.neutral.sort();
  result.negative.sort();
  return result;
}

function derivePortfolioStatus(input: {
  portfolioItems: NewsContentItem[];
  highImpactCount: number;
  macroItems: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
}): PortfolioStatus {
  const mentionedHoldings = uniqueSymbols(input.portfolioItems).size;
  const hasHighImpactEvent = input.upcomingEvents.some(
    (event) => event.impact === "High",
  );

  if (
    mentionedHoldings >= 4 ||
    (mentionedHoldings >= 2 && input.highImpactCount >= 2) ||
    (mentionedHoldings >= 3 && hasHighImpactEvent)
  ) {
    return "High Attention";
  }

  if (
    mentionedHoldings >= 2 ||
    input.highImpactCount >= 2 ||
    (mentionedHoldings >= 1 && hasHighImpactEvent)
  ) {
    return "Elevated";
  }

  if (mentionedHoldings >= 1 || input.macroItems.length > 0 || hasHighImpactEvent) {
    return "Watching";
  }

  return "Stable";
}

function buildPortfolioSummary(input: {
  portfolioItems: NewsContentItem[];
  macroItems: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
  portfolioStatus: PortfolioStatus;
  quietMarket: boolean;
}): string {
  if (input.quietMarket) {
    return NO_MATERIAL_DEVELOPMENTS;
  }

  const mentionedCount = uniqueSymbols(input.portfolioItems).size;
  const sentences: string[] = [];

  if (mentionedCount > 0) {
    sentences.push(
      `${mentionedCount} ${mentionedCount === 1 ? "holding is" : "holdings are"} mentioned today.`,
    );
  } else if (input.macroItems.length > 0) {
    sentences.push("Macro developments may affect your portfolio context today.");
  }

  if (input.portfolioStatus === "Stable" || input.portfolioStatus === "Watching") {
    if (input.upcomingEvents.some((event) => event.impact === "High")) {
      sentences.push("Monitor the scheduled high-impact calendar item today.");
    } else {
      sentences.push("No action appears necessary.");
    }
  } else if (input.portfolioStatus === "Elevated") {
    sentences.push("Review today's verified headlines for portfolio-linked context.");
  } else {
    sentences.push("Several verified developments may warrant closer monitoring today.");
  }

  return sentences.slice(0, 2).join(" ");
}

function buildTodayMatters(input: {
  portfolioItems: NewsContentItem[];
  macroItems: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
}): string[] {
  const bullets: string[] = [];

  for (const event of input.upcomingEvents.slice(0, 2)) {
    bullets.push(`${event.title} ${event.timeLabel}`.trim());
  }

  for (const item of input.macroItems.slice(0, 2)) {
    bullets.push(stripTitleSuffix(item.title));
  }

  for (const item of input.portfolioItems.slice(0, 2)) {
    if (item.matchedSymbols.length > 0) {
      bullets.push(
        `${item.matchedSymbols.join(", ")} mentioned in verified coverage`,
      );
    } else {
      bullets.push(stripTitleSuffix(item.title));
    }
  }

  const unique = [...new Set(bullets.map((bullet) => bullet.trim()).filter(Boolean))];
  return unique.slice(0, 3);
}

function buildMacroHighlights(macroItems: NewsContentItem[]): string[] {
  return macroItems
    .slice(0, 3)
    .map((item) => stripTitleSuffix(item.title))
    .filter(Boolean);
}

function buildMustWatch(
  rankedItems: NewsContentItem[],
): MustWatchRecommendation | null {
  const candidates = rankedItems.filter(
    (item) => item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE || isStrongPortfolioItem(item),
  );

  const pool = candidates.length > 0 ? candidates : rankedItems;
  if (pool.length === 0) {
    return null;
  }

  const sorted = [...pool].sort(
    (a, b) => computeNewsRankScore(b) - computeNewsRankScore(a),
  );

  const topArticle = sorted.find((item) => item.sourceType !== "youtube");
  const topVideo = sorted.find((item) => item.sourceType === "youtube");

  const articleScore = topArticle ? computeNewsRankScore(topArticle) : -1;
  const videoScore = topVideo ? computeNewsRankScore(topVideo) : -1;

  const chosen =
    topVideo && videoScore > articleScore + 40
      ? topVideo
      : topArticle ?? topVideo ?? null;

  if (!chosen) {
    return null;
  }

  return {
    type: chosen.sourceType === "youtube" ? "video" : "article",
    itemId: chosen.id,
    title: stripTitleSuffix(chosen.title),
    sourceName: chosen.sourceName,
    canonicalUrl: chosen.canonicalUrl,
    reason:
      chosen.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE
        ? "Highest verified relevance to your holdings."
        : "Most relevant verified headline in today's feed.",
  };
}

function buildKeyRisks(input: {
  holdingInsights: InvestmentIntelligence["holdingInsights"];
  macroItems: NewsContentItem[];
}): string[] {
  const risks: string[] = [];

  if (input.holdingInsights.negative.length > 0) {
    risks.push(
      `Verified coverage references ${input.holdingInsights.negative.join(", ")} with cautious language.`,
    );
  }

  for (const item of input.macroItems.slice(0, 2)) {
    if (
      item.impactLevel === "High Impact" &&
      /\b(inflation|fed|rate|recession|risk|volatility)\b/i.test(itemText(item))
    ) {
      risks.push(stripTitleSuffix(item.title));
    }
  }

  return [...new Set(risks)].slice(0, 3);
}

function buildOpportunities(input: {
  holdingInsights: InvestmentIntelligence["holdingInsights"];
  portfolioItems: NewsContentItem[];
}): string[] {
  const opportunities: string[] = [];

  if (input.holdingInsights.positive.length > 0) {
    opportunities.push(
      `Positive verified mentions for ${input.holdingInsights.positive.join(", ")}.`,
    );
  }

  for (const item of input.portfolioItems) {
    if (POSITIVE_SIGNAL.test(itemText(item)) && item.matchedSymbols.length > 0) {
      opportunities.push(stripTitleSuffix(item.title));
    }
  }

  return [...new Set(opportunities)].slice(0, 3);
}

export function buildInvestmentIntelligence(
  payload: NewsApiResponse,
): InvestmentIntelligence {
  const allItems = collectSearchableNewsItems(payload);
  const layout = buildNewsHubLayout(allItems);

  const portfolioItems = [
    ...layout.topPortfolioStories,
    ...allItems.filter((item) => isStrongPortfolioItem(item)),
  ].filter(
    (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
  );

  const macroItems = [
    ...layout.marketsMacro,
    ...payload.macroNews,
  ].filter(
    (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
  );

  const rankedFeed = [
    ...layout.topPortfolioStories,
    ...layout.marketsMacro,
    ...layout.latestRelevantFeed,
  ].filter(
    (item, index, array) => array.findIndex((entry) => entry.id === item.id) === index,
  );

  const highImpactCount = allItems.filter(
    (item) => item.impactLevel === "High Impact",
  ).length;

  const holdingInsights = buildHoldingInsights(portfolioItems);
  const hasEvidence =
    portfolioItems.length > 0 ||
    macroItems.length > 0 ||
    payload.upcomingEvents.length > 0;

  const quietMarket =
    !hasEvidence ||
    (portfolioItems.length === 0 &&
      macroItems.length === 0 &&
      payload.upcomingEvents.length === 0);

  const portfolioStatus = quietMarket
    ? "Stable"
    : derivePortfolioStatus({
        portfolioItems,
        highImpactCount,
        macroItems,
        upcomingEvents: payload.upcomingEvents,
      });

  const portfolioSummary = buildPortfolioSummary({
    portfolioItems,
    macroItems,
    upcomingEvents: payload.upcomingEvents,
    portfolioStatus,
    quietMarket,
  });

  return {
    portfolioStatus,
    portfolioSummary,
    todayMatters: quietMarket
      ? []
      : buildTodayMatters({
          portfolioItems,
          macroItems,
          upcomingEvents: payload.upcomingEvents,
        }),
    holdingInsights,
    macroHighlights: quietMarket ? [] : buildMacroHighlights(macroItems),
    mustWatch: quietMarket ? null : buildMustWatch(rankedFeed),
    keyRisks: quietMarket
      ? []
      : buildKeyRisks({ holdingInsights, macroItems }),
    opportunities: quietMarket
      ? []
      : buildOpportunities({ holdingInsights, portfolioItems }),
    quietMarket,
    generatedAt: payload.fetchedAt,
  };
}

export function createEmptyInvestmentIntelligence(
  generatedAt = new Date().toISOString(),
): InvestmentIntelligence {
  return {
    portfolioStatus: "Stable",
    portfolioSummary: NO_MATERIAL_DEVELOPMENTS,
    todayMatters: [],
    holdingInsights: { positive: [], neutral: [], negative: [] },
    macroHighlights: [],
    mustWatch: null,
    keyRisks: [],
    opportunities: [],
    quietMarket: true,
    generatedAt,
  };
}
