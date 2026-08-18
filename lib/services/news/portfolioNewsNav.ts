import type { NewsHubHoldingRow } from "@/lib/services/holdingIntelligence/newsHubRows";
import type { PortfolioNewsCard } from "@/lib/services/news/newsBriefingLayout";

export const PORTFOLIO_NEWS_SECTION_ID = "portfolio-news";

/** Unique holding symbols referenced by the current portfolio news cards. */
export function countHoldingsMentionedInPortfolioCards(
  cards: PortfolioNewsCard[],
): number {
  const symbols = new Set<string>();

  for (const card of cards) {
    for (const symbol of card.affectedHoldings) {
      if (symbol.trim()) {
        symbols.add(symbol.trim().toUpperCase());
      }
    }
    for (const symbol of card.item.matchedSymbols) {
      if (symbol.trim()) {
        symbols.add(symbol.trim().toUpperCase());
      }
    }
  }

  return symbols.size;
}

export function countHoldingsInNewsHubRows(rows: NewsHubHoldingRow[]): number {
  return rows.filter((row) => row.candidate.symbol.trim()).length;
}

export function buildHoldingsMentionedSummary(count: number): string | null {
  if (count <= 0) {
    return null;
  }

  return `${count} ${count === 1 ? "holding is" : "holdings are"} mentioned today.`;
}
