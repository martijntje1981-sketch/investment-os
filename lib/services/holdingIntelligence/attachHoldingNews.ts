/**
 * Attach the best existing news item to a holding.
 * Uses already-fetched/matched NewsContentItem fields — no new fetch.
 */

import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";
import { newsItemMatchesConfirmedHolding } from "@/lib/services/instruments/confirmedListingIdentity";
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

type HoldingIdentity = Pick<
  StoredPortfolioHolding,
  "symbol" | "name" | "providerSymbol" | "isin"
>;

function identityHaystack(
  item: Pick<NewsContentItem, "title" | "description">,
): string {
  return `${item.title} ${item.description ?? ""}`.toLowerCase();
}

function containsIdentityToken(haystack: string, value: string): boolean {
  const token = value.trim();
  if (token.length < 4) return false;
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

/**
 * Direct requires the article copy to name the instrument, listing, ISIN, or product.
 * Wire `articleSymbols` / keyword scores alone are not Direct evidence.
 */
export function hasDirectInstrumentEvidence(
  item: Pick<NewsContentItem, "title" | "description">,
  holding: HoldingIdentity,
): boolean {
  const haystack = identityHaystack(item);
  if (containsIdentityToken(haystack, holding.symbol)) return true;
  const provider = holding.providerSymbol?.trim();
  if (provider && haystack.includes(provider.toLowerCase())) return true;
  const isin = holding.isin?.trim();
  if (isin && isin.length >= 8 && haystack.includes(isin.toLowerCase())) return true;
  const name = holding.name.trim();
  if (name.length >= 8 && haystack.includes(name.toLowerCase())) return true;
  return false;
}

export function newsItemMatchesHolding(
  item: NewsContentItem,
  holding: Pick<StoredPortfolioHolding, "id" | "symbol" | "providerSymbol" | "assetType">,
): boolean {
  return newsItemMatchesConfirmedHolding(item, holding);
}

export function classifyHoldingNewsMatchType(
  relevanceScore: number,
  item?: Pick<NewsContentItem, "contextKind" | "title" | "description"> | null,
  holding?: HoldingIdentity | null,
): HoldingNewsMatchType {
  if (item?.contextKind === "macro_official") return "macro_context";
  if (relevanceScore <= 0) return "none";
  if (
    holding &&
    item &&
    relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE &&
    hasDirectInstrumentEvidence(item, holding)
  ) {
    return "direct_instrument";
  }
  if (relevanceScore >= DIRECT_INSTRUMENT_SCORE) return "instrument_alias";
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
  holding: Pick<StoredPortfolioHolding, "id" | "symbol" | "providerSymbol" | "assetType">,
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
