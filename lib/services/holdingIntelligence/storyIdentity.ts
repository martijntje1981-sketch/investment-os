/**
 * Deterministic story identity for cross-surface deduplication.
 * Same article + holding should not appear as independent insights.
 * Surfaces may still reference the same event when their purpose differs.
 */

import { normalizeMarketsTodayUrl } from "@/lib/services/news/marketsTodayDedup";
import { titlesAreNearDuplicate } from "@/lib/services/news/newsFeedRanking";
import type { HoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/types";
import type { NewsContentItem } from "@/lib/types/newsContent";

export type HoldingStoryIdentity = {
  articleId: string | null;
  canonicalUrl: string | null;
  holdingSymbol: string;
  themeKey: string | null;
};

export type SurfaceStoryRef = {
  surface: "dashboard" | "four_questions" | "news" | "analysis" | "holding_detail";
  identity: HoldingStoryIdentity;
};

function normalizeTheme(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed.replace(/[^a-z0-9]+/g, " ").trim() || null;
}

export function newsItemStoryKeys(item: Pick<NewsContentItem, "id" | "canonicalUrl" | "title">): {
  articleId: string | null;
  canonicalUrl: string | null;
  themeKey: string | null;
} {
  const url = normalizeMarketsTodayUrl(item.canonicalUrl) || item.canonicalUrl.trim() || null;
  return {
    articleId: item.id.trim() || null,
    canonicalUrl: url,
    themeKey: normalizeTheme(item.title),
  };
}

export function buildHoldingStoryIdentity(
  candidate: Pick<HoldingIntelligenceCandidate, "symbol" | "newsItem">,
): HoldingStoryIdentity | null {
  if (!candidate.newsItem) return null;
  const keys = newsItemStoryKeys(candidate.newsItem);
  return {
    articleId: keys.articleId,
    canonicalUrl: keys.canonicalUrl,
    holdingSymbol: candidate.symbol.trim().toUpperCase(),
    themeKey: keys.themeKey,
  };
}

export function storyIdentityKey(identity: HoldingStoryIdentity): string {
  const article =
    identity.canonicalUrl || identity.articleId || identity.themeKey || "none";
  return `${article}::${identity.holdingSymbol}`;
}

export function articleIdentityKey(identity: HoldingStoryIdentity): string | null {
  return identity.canonicalUrl || identity.articleId || null;
}

export function isSameUnderlyingStory(
  left: HoldingStoryIdentity | null,
  right: HoldingStoryIdentity | null,
): boolean {
  if (!left || !right) return false;
  if (left.canonicalUrl && right.canonicalUrl && left.canonicalUrl === right.canonicalUrl) {
    return true;
  }
  if (left.articleId && right.articleId && left.articleId === right.articleId) {
    return true;
  }
  if (
    left.themeKey &&
    right.themeKey &&
    left.holdingSymbol === right.holdingSymbol &&
    (left.themeKey === right.themeKey ||
      titlesAreNearDuplicate(left.themeKey, right.themeKey))
  ) {
    return true;
  }
  return false;
}

/** Same URL, article id, or near-duplicate title — one development, not two. */
export function newsItemsAreSameDevelopment(
  left: Pick<NewsContentItem, "id" | "canonicalUrl" | "title">,
  right: Pick<NewsContentItem, "id" | "canonicalUrl" | "title">,
): boolean {
  const a = newsItemStoryKeys(left);
  const b = newsItemStoryKeys(right);
  if (a.canonicalUrl && b.canonicalUrl && a.canonicalUrl === b.canonicalUrl) {
    return true;
  }
  if (a.articleId && b.articleId && a.articleId === b.articleId) {
    return true;
  }
  return titlesAreNearDuplicate(left.title, right.title);
}

/**
 * Keep the first (already ranked) occurrence of an article.
 * Later holdings lose the duplicated story rather than presenting it
 * as a second independent catalyst.
 */
export function dedupeSharedHoldingStories(
  ranked: HoldingIntelligenceCandidate[],
): HoldingIntelligenceCandidate[] {
  const usedArticles = new Set<string>();
  return ranked.map((candidate) => {
    const identity = buildHoldingStoryIdentity(candidate);
    const articleKey = identity ? articleIdentityKey(identity) : null;
    if (!articleKey) return candidate;
    if (!usedArticles.has(articleKey)) {
      usedArticles.add(articleKey);
      return candidate;
    }

    return {
      ...candidate,
      newsItem: null,
      matchType: "none",
      relevanceScore: null,
      newsItemCount: 0,
      evidenceTimestamp: null,
      explanationStatus: "insufficient_evidence",
      confidence: 0.25,
      explanationNote: "No distinct holding-specific catalyst found.",
    };
  });
}
