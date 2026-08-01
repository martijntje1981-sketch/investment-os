import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { CalendarEvent } from "@/lib/services/events/types";

function holdingUsesUsd(holding: StoredPortfolioHolding): boolean {
  const currency = (holding.quoteCurrency ?? holding.currency ?? "").toUpperCase();
  const exchange = (
    holding.pricingExchange ??
    holding.exchange ??
    ""
  ).toUpperCase();
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  return (
    currency === "USD" ||
    exchange === "US" ||
    provider.endsWith(".US") ||
    provider.includes(".US:")
  );
}

function holdingUsesEur(holding: StoredPortfolioHolding): boolean {
  const currency = (holding.quoteCurrency ?? holding.currency ?? "").toUpperCase();
  const exchange = (
    holding.pricingExchange ??
    holding.exchange ??
    ""
  ).toUpperCase();
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  return (
    currency === "EUR" ||
    ["XETRA", "PA", "AS", "BR", "LS", "MC", "MI"].includes(exchange) ||
    /\.(XETRA|PA|AS|BR|LS|MC|MI)$/i.test(provider)
  );
}

function titleMentionsHolding(
  title: string,
  holding: StoredPortfolioHolding,
): boolean {
  const symbol = holding.symbol.trim().toUpperCase();
  if (!symbol || symbol.length < 2) return false;
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(title);
}

/**
 * Marks portfolio relevance only when evidence exists.
 * Never invents relevance for generic macro releases.
 */
export function applyPortfolioRelevance(
  events: CalendarEvent[],
  holdings: StoredPortfolioHolding[],
): CalendarEvent[] {
  if (holdings.length === 0) {
    return events.map((event) => ({
      ...event,
      portfolioRelevant: false,
      relevanceReason: null,
    }));
  }

  const hasUsd = holdings.some(holdingUsesUsd);
  const hasEur = holdings.some(holdingUsesEur);
  const investmentHoldings = holdings.filter(
    (holding) => holding.assetType === "investment",
  );

  return events.map((event) => {
    if (event.portfolioRelevant && event.relevanceReason) {
      return event;
    }

    const title = event.title.toLowerCase();
    const isFed =
      event.category === "central_banks" &&
      (/\b(fed|federal reserve|fomc)\b/i.test(event.title) ||
        (event.country ?? "").toLowerCase().includes("united states"));
    const isEcb =
      event.category === "central_banks" &&
      (/\b(ecb|european central bank)\b/i.test(event.title) ||
        (event.country ?? "").toLowerCase().includes("euro"));

    if (isFed && hasUsd) {
      return {
        ...event,
        portfolioRelevant: true,
        relevanceReason: "Relevant to USD-linked holdings",
      };
    }

    if (isEcb && hasEur) {
      return {
        ...event,
        portfolioRelevant: true,
        relevanceReason: "Relevant to EUR-linked holdings",
      };
    }

    if (event.category === "earnings") {
      const matched = investmentHoldings.find((holding) =>
        titleMentionsHolding(event.title, holding),
      );
      if (matched) {
        return {
          ...event,
          ticker: matched.symbol,
          instrumentName: matched.name,
          portfolioRelevant: true,
          relevanceReason: `Earnings linked to ${matched.symbol}`,
        };
      }
    }

    if (event.ticker) {
      const matched = holdings.find(
        (holding) =>
          holding.symbol.trim().toUpperCase() ===
          event.ticker!.trim().toUpperCase(),
      );
      if (matched) {
        return {
          ...event,
          portfolioRelevant: true,
          relevanceReason:
            event.relevanceReason ?? `Linked to ${matched.symbol}`,
        };
      }
    }

    // Avoid false relevance for generic CPI / GDP / payrolls.
    void title;
    return {
      ...event,
      portfolioRelevant: false,
      relevanceReason: null,
    };
  });
}
