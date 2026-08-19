/**
 * Attach the best existing news item to a holding.
 * Uses already-fetched/matched NewsContentItem fields — no new fetch.
 */

import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import {
  BITCOIN_CRYPTO_CONTEXT_NOTE,
  ETF_CONTEXTUAL_NOTE,
  HOLDING_EXPLANATION_NOTES,
  MACRO_CONTEXT_NOTE,
  CONFIDENCE_BY_STATUS,
  type HoldingExplanationStatus,
  type HoldingNewsMatchType,
} from "@/lib/services/holdingIntelligence/types";

const DIRECT_INSTRUMENT_SCORE = 22;

export function newsItemMatchesHolding(
  item: NewsContentItem,
  holding: Pick<StoredPortfolioHolding, "id" | "symbol">,
): boolean {
  const symbol = holding.symbol.trim().toUpperCase();
  if (item.matchedHoldingIds.includes(holding.id)) return true;
  if (
    item.matchedSymbols.some(
      (matched) => matched.trim().toUpperCase() === symbol,
    )
  ) {
    return true;
  }
  return item.matchedHoldings.some(
    (matched) =>
      matched.id === holding.id ||
      matched.symbol.trim().toUpperCase() === symbol,
  );
}

export function classifyHoldingNewsMatchType(
  relevanceScore: number,
  item?: Pick<NewsContentItem, "contextKind"> | null,
): HoldingNewsMatchType {
  if (item?.contextKind === "macro_official") return "macro_context";
  if (relevanceScore >= DIRECT_INSTRUMENT_SCORE) return "direct_instrument";
  if (relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE) {
    return "instrument_alias";
  }
  if (relevanceScore > 0) return "sector_theme";
  return "none";
}

export function resolveHoldingExplanation(input: {
  matchType: HoldingNewsMatchType;
  isEtfLike: boolean;
  matchedCount: number;
  isBitcoin?: boolean;
}): {
  status: HoldingExplanationStatus;
  note: string;
  confidence: number;
} {
  const { matchType, isEtfLike, matchedCount, isBitcoin = false } = input;

  if (matchedCount === 0) {
    return {
      status: "unavailable",
      note: HOLDING_EXPLANATION_NOTES.unavailable,
      confidence: CONFIDENCE_BY_STATUS.unavailable,
    };
  }

  if (matchType === "none") {
    return {
      status: "insufficient_evidence",
      note: HOLDING_EXPLANATION_NOTES.insufficient_evidence,
      confidence: CONFIDENCE_BY_STATUS.insufficient_evidence,
    };
  }

  if (matchType === "component") {
    return {
      status: "probable_contextual",
      note: isEtfLike
        ? ETF_CONTEXTUAL_NOTE
        : HOLDING_EXPLANATION_NOTES.probable_contextual,
      confidence: CONFIDENCE_BY_STATUS.probable_contextual,
    };
  }

  if (matchType === "macro_context") {
    return {
      status: "probable_contextual",
      note: MACRO_CONTEXT_NOTE,
      confidence: CONFIDENCE_BY_STATUS.probable_contextual,
    };
  }

  if (matchType === "sector_theme") {
    return {
      status: "probable_contextual",
      note: isBitcoin
        ? BITCOIN_CRYPTO_CONTEXT_NOTE
        : isEtfLike
          ? ETF_CONTEXTUAL_NOTE
          : HOLDING_EXPLANATION_NOTES.probable_contextual,
      confidence: CONFIDENCE_BY_STATUS.probable_contextual,
    };
  }

  if (matchType === "instrument_alias") {
    return {
      status: "probable_contextual",
      note: isEtfLike
        ? ETF_CONTEXTUAL_NOTE
        : HOLDING_EXPLANATION_NOTES.probable_contextual,
      confidence: CONFIDENCE_BY_STATUS.probable_contextual,
    };
  }

  if (isEtfLike && matchType !== "direct_instrument") {
    return {
      status: "probable_contextual",
      note: ETF_CONTEXTUAL_NOTE,
      confidence: CONFIDENCE_BY_STATUS.probable_contextual,
    };
  }

  if (matchType === "direct_instrument") {
    return {
      status: "supported",
      note: HOLDING_EXPLANATION_NOTES.supported,
      confidence: CONFIDENCE_BY_STATUS.supported,
    };
  }

  return {
    status: "insufficient_evidence",
    note: HOLDING_EXPLANATION_NOTES.insufficient_evidence,
    confidence: CONFIDENCE_BY_STATUS.insufficient_evidence,
  };
}

export function selectBestHoldingNewsItem(
  items: NewsContentItem[],
  holding: Pick<StoredPortfolioHolding, "id" | "symbol">,
): { item: NewsContentItem | null; matchedCount: number } {
  const matched = items.filter((item) => newsItemMatchesHolding(item, holding));
  if (matched.length === 0) {
    return { item: null, matchedCount: 0 };
  }

  const ranked = [...matched].sort((a, b) => {
    const officialDiff =
      Number(a.contextKind === "macro_official") -
      Number(b.contextKind === "macro_official");
    if (officialDiff !== 0) return officialDiff;
    const scoreDiff = (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.publishedAt.localeCompare(a.publishedAt);
  });

  return { item: ranked[0] ?? null, matchedCount: matched.length };
}
