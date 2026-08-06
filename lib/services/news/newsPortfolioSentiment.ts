import type { NewsContentItem } from "@/lib/types/newsContent";

export type PortfolioMarketImpact = "Positive" | "Neutral" | "Negative";

const POSITIVE_SIGNAL =
  /\b(rally|rallies|surge|surges|gain|gains|inflow|inflows|improve|improves|rising|rise|rose|beat|beats|strong|outperform|upgrade|upgrades|recovery|rebound)\b/i;
const NEGATIVE_SIGNAL =
  /\b(fall|falls|drop|drops|decline|declines|outflow|outflows|weak|weaker|miss|misses|downgrade|downgrades|concern|concerns|slump|slumps|selloff|sell-off|cut|cuts|pressure)\b/i;

function itemText(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`.toLowerCase();
}

export function detectPortfolioMarketImpact(
  item: NewsContentItem,
): PortfolioMarketImpact {
  const text = itemText(item);
  const hasPositive = POSITIVE_SIGNAL.test(text);
  const hasNegative = NEGATIVE_SIGNAL.test(text);

  if (hasPositive && !hasNegative) {
    return "Positive";
  }
  if (hasNegative && !hasPositive) {
    return "Negative";
  }
  return "Neutral";
}

export function portfolioImpactConfidence(
  item: NewsContentItem,
): string | null {
  if (item.impactLevel === "High Impact") {
    return "High confidence";
  }
  if (item.impactLevel === "Medium Impact") {
    return "Medium confidence";
  }
  return null;
}

export function affectedHoldingsForItem(item: NewsContentItem): string[] {
  if (item.matchedHoldings.length > 0) {
    return item.matchedHoldings.map((holding) => holding.symbol);
  }
  return item.matchedSymbols;
}
