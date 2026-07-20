import type { NewsContentItem, NewsImpactLevel } from "@/lib/types/newsContent";
import { STRONG_PORTFOLIO_MATCH_SCORE } from "@/lib/services/news/relevanceMatching";

const HIGH_IMPACT_PATTERNS = [
  /\bfed\b/i,
  /\bfomc\b/i,
  /\bcpi\b/i,
  /\binflation\b/i,
  /\bearnings\b/i,
  /\binterest rate\b/i,
  /\becb\b/i,
  /\brecession\b/i,
  /\bbitcoin\b/i,
  /\bcrypto\b/i,
];
const MEDIUM_IMPACT_PATTERNS = [
  /\bmarket(?:s)?\b/i,
  /\bstock(?:s)?\b/i,
  /\beconom(?:y|ic)\b/i,
  /\bforecast\b/i,
  /\bvolatility\b/i,
  /\bportfolio\b/i,
];

export function deriveNewsImpactLevel(
  item: Pick<
    NewsContentItem,
    "title" | "description" | "relevanceScore" | "matchedSymbols" | "category"
  >,
): NewsImpactLevel {
  const haystack = `${item.title} ${item.description ?? ""}`;

  if (
    item.relevanceScore >= STRONG_PORTFOLIO_MATCH_SCORE ||
    HIGH_IMPACT_PATTERNS.some((pattern) => pattern.test(haystack))
  ) {
    return "High Impact";
  }

  if (
    item.matchedSymbols.length > 0 ||
    item.category === "macro" ||
    MEDIUM_IMPACT_PATTERNS.some((pattern) => pattern.test(haystack))
  ) {
    return "Medium Impact";
  }

  return "Low Impact";
}

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

export function generateInterpretation(
  item: Pick<
    NewsContentItem,
    "title" | "matchedSymbols" | "matchedHoldings" | "category" | "marketCategory" | "impactLevel"
  >,
): string {
  const topic = stripTitleSuffix(item.title);

  if (item.matchedHoldings.length > 0) {
    const holdings = item.matchedHoldings.map((holding) => holding.symbol).join(", ");
    return `This headline may affect ${holdings} through price action, sector sentiment, or how the holding fits your current allocation. It is context, not a recommendation.`;
  }

  if (item.marketCategory === "crypto" || item.category === "crypto") {
    return `Crypto-related coverage can influence risk appetite and may spill over into growth and technology exposures.`;
  }

  if (item.marketCategory === "commodities") {
    return `Commodity developments can affect inflation expectations and sectors tied to energy or materials.`;
  }

  if (item.marketCategory === "geopolitics") {
    return `Geopolitical headlines can shift risk sentiment across equities, currencies, and safe-haven assets.`;
  }

  if (item.impactLevel === "High Impact") {
    return `This macro development could influence rate expectations, index direction, and cross-asset volatility.`;
  }

  return `Broader market headlines can shape the environment your holdings trade in, even without a direct company link to ${topic}.`;
}

/** @deprecated Use generateInterpretation */
export const generateWhyThisMatters = generateInterpretation;
