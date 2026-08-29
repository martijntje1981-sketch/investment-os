import {
  computeNewsRankScore,
  isStrongMacroItem,
  isStrongPortfolioItem,
} from "@/lib/services/news/newsFeedRanking";
import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";

/** Verified provider or article-symbol match scores from portfolioNewsMatching. */
const VERIFIED_DIRECT_MATCH_SCORE = 22;

export type NewsRankingTier =
  | "direct_holding"
  | "instrument_alias"
  | "sector_theme"
  | "macro"
  | "general";

export type NewsRankingEvidence = {
  tier: NewsRankingTier;
  relevanceScore: number;
  sourceQuality: number;
  recencyBoost: number;
  rankScore: number;
  tieBreaker: string;
};

const TIER_BASE_SCORE: Record<NewsRankingTier, number> = {
  direct_holding: 1_000_000,
  instrument_alias: 800_000,
  sector_theme: 600_000,
  macro: 400_000,
  general: 0,
};

export function classifyNewsRankingTier(item: NewsContentItem): NewsRankingTier {
  if (
    item.matchedHoldings.length > 0 &&
    (item.relevanceScore >= VERIFIED_DIRECT_MATCH_SCORE ||
      item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE)
  ) {
    return "direct_holding";
  }

  if (
    item.matchedHoldings.length > 0 ||
    (item.matchedSymbols.length > 0 && item.relevanceScore > 0)
  ) {
    return "instrument_alias";
  }

  if (isStrongMacroItem(item)) {
    return "macro";
  }

  if (item.relevanceScore > 0) {
    return "sector_theme";
  }

  return "general";
}

function safeRecencyBoost(publishedAt: string, now: number): number {
  const parsed = Date.parse(publishedAt);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  const ageDays = Math.max(0, (now - parsed) / (24 * 60 * 60 * 1000));
  return Math.max(0, 200 - ageDays * 15);
}

function stableTieBreaker(item: NewsContentItem): string {
  return (item.canonicalUrl || item.id).toLowerCase();
}

/**
 * Deterministic portfolio-aware ranking for already retrieved news.
 * Reuses relevanceScore, matched holdings and the existing rank engine.
 */
export function buildNewsRankingEvidence(
  item: NewsContentItem,
  now = Date.now(),
): NewsRankingEvidence {
  const tier = classifyNewsRankingTier(item);
  const sourceQuality = getSourceQualityScore(item.sourceName);
  const recencyBoost = safeRecencyBoost(item.publishedAt, now);
  const legacyRank = computeNewsRankScore(item, now);
  const safeLegacyRank = Number.isFinite(legacyRank) ? legacyRank : 0;

  const rankScore =
    TIER_BASE_SCORE[tier] +
    item.relevanceScore * 100 +
    sourceQuality * 10 +
    recencyBoost +
    safeLegacyRank * 0.01;

  return {
    tier,
    relevanceScore: item.relevanceScore,
    sourceQuality,
    recencyBoost,
    rankScore,
    tieBreaker: stableTieBreaker(item),
  };
}

export function compareNewsItemsForRanking(
  left: NewsContentItem,
  right: NewsContentItem,
  now = Date.now(),
): number {
  const leftEvidence = buildNewsRankingEvidence(left, now);
  const rightEvidence = buildNewsRankingEvidence(right, now);

  if (rightEvidence.rankScore !== leftEvidence.rankScore) {
    return rightEvidence.rankScore - leftEvidence.rankScore;
  }

  if (rightEvidence.relevanceScore !== leftEvidence.relevanceScore) {
    return rightEvidence.relevanceScore - leftEvidence.relevanceScore;
  }

  if (rightEvidence.sourceQuality !== leftEvidence.sourceQuality) {
    return rightEvidence.sourceQuality - leftEvidence.sourceQuality;
  }

  if (rightEvidence.recencyBoost !== leftEvidence.recencyBoost) {
    return rightEvidence.recencyBoost - leftEvidence.recencyBoost;
  }

  return leftEvidence.tieBreaker.localeCompare(rightEvidence.tieBreaker);
}

export function rankNewsItemsForBriefing(
  items: NewsContentItem[],
  now = Date.now(),
): NewsContentItem[] {
  return [...items].sort((left, right) =>
    compareNewsItemsForRanking(left, right, now),
  );
}

export function isDirectVerifiedHoldingMatch(item: NewsContentItem): boolean {
  return classifyNewsRankingTier(item) === "direct_holding";
}

export function isPortfolioThemeMatch(item: NewsContentItem): boolean {
  const tier = classifyNewsRankingTier(item);
  return tier === "sector_theme" || tier === "macro";
}

export { isStrongPortfolioItem, isStrongMacroItem };
