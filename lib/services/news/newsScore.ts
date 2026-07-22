import { computeNewsRankScore } from "@/lib/services/news/newsFeedRanking";
import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import type { NewsContentItem } from "@/lib/types/newsContent";

/**
 * NewsScore — unified ranking for briefing sections.
 * Wraps the existing rank engine and exposes source-quality contribution.
 */
export function computeNewsScore(item: NewsContentItem, now = Date.now()): number {
  return computeNewsRankScore(item, now);
}

export function newsScoreBreakdown(item: NewsContentItem, now = Date.now()) {
  return {
    total: computeNewsRankScore(item, now),
    sourceQuality: getSourceQualityScore(item.sourceName),
    portfolioRelevance: item.relevanceScore,
    recency: item.publishedAt,
    impact: item.impactLevel,
  };
}

export { computeNewsRankScore as computeNewsScoreLegacy };
