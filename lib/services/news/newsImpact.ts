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

export function generateWhyThisMatters(
  item: Pick<
    NewsContentItem,
    "title" | "matchedSymbols" | "category" | "impactLevel"
  >,
): string {
  const topic = stripTitleSuffix(item.title);

  if (item.matchedSymbols.length > 0) {
    const holdings = item.matchedSymbols.join(", ");
    return `Why this matters: moves in ${topic.toLowerCase()} can affect your ${holdings} exposure through price action, sector sentiment, or allocation drift.`;
  }

  if (item.category === "crypto") {
    return "Why this matters: crypto headlines can change risk appetite and may spill over into broader growth and tech holdings.";
  }

  if (item.impactLevel === "High Impact") {
    return "Why this matters: this development can shift rate expectations, index direction, and cross-asset volatility across your portfolio.";
  }

  return "Why this matters: even indirect macro headlines can influence the environment your holdings trade in today.";
}
