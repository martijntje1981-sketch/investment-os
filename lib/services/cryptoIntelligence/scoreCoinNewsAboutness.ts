/**
 * Deterministic coin-news aboutness scoring (no NLP/AI).
 * Distinguishes strong / likely / weak mentions using existing article fields.
 */

import { getSourceQualityScore } from "@/lib/services/news/newsSourceQuality";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CoinNewsMatchConfidence = "strong" | "likely" | "weak";

export type CoinNewsMatchBasis =
  | "provider_symbol"
  | "article_symbol"
  | "holding_id"
  | "ticker_or_name_keyword";

export type CoinNewsAboutnessScore = {
  confidence: CoinNewsMatchConfidence;
  basis: CoinNewsMatchBasis;
  score: number;
  /** True when default Crypto Intelligence may surface this story. */
  defaultEligible: boolean;
};

const CRYPTO_CONTEXT =
  /\b(crypto|cryptocurrenc(?:y|ies)|bitcoin|ethereum|blockchain|token|altcoin|defi|stablecoin|coin\b|nft)\b/i;

/** Ambiguous short tickers that collide with common English / names. */
const AMBIGUOUS_SHORT_TICKERS = new Set([
  "SOL",
  "ADA",
  "ONE",
  "NEAR",
  "DOT",
  "LINK",
  "ATOM",
  "OP",
  "ARB",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeProviderCodes(providerSymbol: string): string[] {
  const upper = providerSymbol.trim().toUpperCase();
  const codes = new Set<string>([upper]);
  const bare = upper.replace(/\.CC$/i, "");
  codes.add(bare);
  const base = bare.split("-")[0];
  if (base) codes.add(base);
  return [...codes];
}

function countMentions(text: string, needle: string): number {
  if (!needle || needle.length < 2) return 0;
  const re = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "gi");
  return (text.match(re) ?? []).length;
}

function titleHasSafeTicker(
  title: string,
  symbol: string,
  hasCryptoContext: boolean,
  hasNameInTitle: boolean,
): boolean {
  const upper = symbol.trim().toUpperCase();
  const titleUpper = title.toUpperCase();
  const tickerRe = new RegExp(`\\b${escapeRegExp(upper)}\\b`);
  if (!tickerRe.test(titleUpper)) return false;

  if (upper.length >= 4) return true;
  if (hasNameInTitle) return true;
  if (AMBIGUOUS_SHORT_TICKERS.has(upper)) {
    return hasCryptoContext;
  }
  // Other short tickers (XRP, BTC, ETH, BNB): headline ticker is usually intentional.
  return true;
}

function bodyHasSafeTicker(
  body: string,
  symbol: string,
  hasCryptoContext: boolean,
): boolean {
  const upper = symbol.trim().toUpperCase();
  const tickerRe = new RegExp(`\\b${escapeRegExp(upper)}\\b`, "i");
  if (!tickerRe.test(body)) return false;
  if (upper.length >= 4) return true;
  if (AMBIGUOUS_SHORT_TICKERS.has(upper)) {
    return hasCryptoContext;
  }
  return hasCryptoContext || upper.length <= 3;
}

function freshnessBoost(publishedAt: string, nowMs: number): number {
  const published = Date.parse(publishedAt);
  if (!Number.isFinite(published)) return 0;
  const ageHours = (nowMs - published) / (1000 * 60 * 60);
  if (ageHours <= 12) return 12;
  if (ageHours <= 36) return 8;
  if (ageHours <= 72) return 4;
  if (ageHours <= 168) return 1;
  return 0;
}

/**
 * Score how specifically an article is about a single owned coin.
 * Returns null when there is no credible association.
 */
export function scoreCoinNewsAboutness(
  item: NewsContentItem,
  holding: StoredPortfolioHolding,
  nowMs = Date.now(),
): CoinNewsAboutnessScore | null {
  const symbol = holding.symbol.trim().toUpperCase();
  if (!symbol) return null;

  const provider = (holding.providerSymbol ?? "").trim().toUpperCase();
  const name = holding.name.trim();
  const nameLower = name.toLowerCase();
  const title = item.title.trim();
  const titleLower = title.toLowerCase();
  const body = `${item.description ?? ""} ${item.summary ?? ""}`;
  const fullText = `${title} ${body}`;
  const fullLower = fullText.toLowerCase();
  const hasCryptoContext = CRYPTO_CONTEXT.test(fullText);
  const cryptoCategory =
    item.category === "crypto" || item.marketCategory === "crypto";

  const articleSymbols = (item.articleSymbols ?? []).map((s) =>
    s.trim().toUpperCase(),
  );
  const matchedSymbols = item.matchedSymbols.map((s) => s.trim().toUpperCase());
  const providerCodes = provider ? normalizeProviderCodes(provider) : [];

  const hasHoldingId = item.matchedHoldingIds.includes(holding.id);
  const hasArticleProvider = providerCodes.some((code) =>
    articleSymbols.includes(code),
  );
  const hasArticleTicker = articleSymbols.includes(symbol);
  const hasMatchedProvider = providerCodes.some((code) =>
    matchedSymbols.includes(code),
  );
  const hasMatchedTicker = matchedSymbols.includes(symbol);

  const nameInTitle =
    nameLower.length >= 4 &&
    nameLower !== symbol.toLowerCase() &&
    titleLower.includes(nameLower);
  const nameInBody =
    nameLower.length >= 4 &&
    nameLower !== symbol.toLowerCase() &&
    fullLower.includes(nameLower);
  const tickerInTitle = titleHasSafeTicker(
    title,
    symbol,
    hasCryptoContext || cryptoCategory,
    nameInTitle,
  );
  const tickerInBody = bodyHasSafeTicker(
    fullText,
    symbol,
    hasCryptoContext || cryptoCategory,
  );

  // Reject unsafe short-ticker body-only hits with no other evidence.
  const hasStructuredMatch =
    hasHoldingId ||
    hasArticleProvider ||
    hasArticleTicker ||
    hasMatchedProvider ||
    hasMatchedTicker;
  const hasSafeTextMatch = nameInTitle || nameInBody || tickerInTitle;
  const weakBodyOnly =
    !hasStructuredMatch &&
    !hasSafeTextMatch &&
    tickerInBody &&
    AMBIGUOUS_SHORT_TICKERS.has(symbol);

  if (!hasStructuredMatch && !hasSafeTextMatch && !tickerInBody) {
    return null;
  }
  if (weakBodyOnly && !hasCryptoContext && !cryptoCategory) {
    return null;
  }
  if (
    !hasStructuredMatch &&
    !hasSafeTextMatch &&
    tickerInBody &&
    !hasCryptoContext &&
    !cryptoCategory &&
    symbol.length <= 3
  ) {
    return null;
  }

  let basis: CoinNewsMatchBasis = "ticker_or_name_keyword";
  if (hasHoldingId) basis = "holding_id";
  else if (hasArticleProvider || hasArticleTicker) basis = "article_symbol";
  else if (hasMatchedProvider || hasMatchedTicker) basis = "provider_symbol";

  let score = 0;
  if (hasHoldingId) score += 45;
  if (hasArticleProvider) score += 38;
  if (hasArticleTicker) score += 34;
  if (hasMatchedProvider) score += 28;
  if (hasMatchedTicker) score += 24;
  if (nameInTitle) score += 32;
  else if (nameInBody) score += 14;
  if (tickerInTitle) score += 22;
  else if (tickerInBody && !AMBIGUOUS_SHORT_TICKERS.has(symbol)) score += 8;
  else if (tickerInBody) score += 3;

  const mentionCount =
    countMentions(fullText, symbol) +
    (nameLower.length >= 4 ? countMentions(fullLower, nameLower) : 0);
  if (mentionCount >= 3) score += 10;
  else if (mentionCount >= 2) score += 5;

  if (cryptoCategory) score += 6;
  if (hasCryptoContext) score += 4;

  // Headline focus: title starts with coin name/ticker or coin is early in title.
  const titleStart = title.slice(0, Math.min(title.length, 28)).toUpperCase();
  if (
    titleStart.startsWith(symbol) ||
    (name.length >= 4 && title.toUpperCase().startsWith(name.toUpperCase()))
  ) {
    score += 12;
  }

  score += Math.min(12, Math.round(getSourceQualityScore(item.sourceName) / 4));
  score += freshnessBoost(item.publishedAt, nowMs);
  if (item.relevanceScore > 0) {
    score += Math.min(15, Math.round(item.relevanceScore / 4));
  }

  // Generic crypto pieces that only weakly touch a short ticker stay weak.
  const genericCryptoOnly =
    /\b(crypto market|cryptocurrenc|bitcoin and ethereum|btc and eth)\b/i.test(
      title,
    ) &&
    !nameInTitle &&
    !hasArticleTicker &&
    !hasArticleProvider;

  let confidence: CoinNewsMatchConfidence;
  if (
    (hasArticleProvider || hasArticleTicker || hasHoldingId || nameInTitle) &&
    score >= 55
  ) {
    confidence = "strong";
  } else if (
    score >= 42 &&
    (tickerInTitle || hasMatchedTicker || hasMatchedProvider || nameInBody) &&
    !genericCryptoOnly
  ) {
    confidence = "likely";
  } else {
    confidence = "weak";
  }

  if (genericCryptoOnly && confidence !== "strong") {
    confidence = "weak";
    score = Math.min(score, 35);
  }

  return {
    confidence,
    basis,
    score,
    defaultEligible: confidence === "strong" || confidence === "likely",
  };
}

export function watchLabelForConfidence(
  confidence: CoinNewsMatchConfidence,
  symbol: string,
): string {
  if (confidence === "strong") {
    return `High-confidence story for your ${symbol} holding`;
  }
  if (confidence === "likely") {
    return `Likely relevant to your ${symbol} holding`;
  }
  return `Weak mention of ${symbol} — not shown by default`;
}
