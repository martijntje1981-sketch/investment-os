import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { CalendarEvent } from "@/lib/services/events/types";
import { localDateKey } from "@/lib/services/events/groupEvents";

function formatTimeLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function findHoldingName(
  holdings: StoredPortfolioHolding[],
  symbol: string,
): string | null {
  const match = holdings.find(
    (holding) => holding.symbol.trim().toUpperCase() === symbol.toUpperCase(),
  );
  return match?.name ?? null;
}

/**
 * Builds dividend calendar rows from verified dividend quote fields only.
 * Does not invent dates.
 */
export function buildDividendCalendarEvents(input: {
  quotes: DividendApiQuote[];
  holdings: StoredPortfolioHolding[];
  now?: Date;
}): CalendarEvent[] {
  const today = localDateKey(input.now ?? new Date());
  const events: CalendarEvent[] = [];

  for (const quote of input.quotes) {
    const name = findHoldingName(input.holdings, quote.symbol);

    if (quote.nextExDate && quote.nextExDate >= today) {
      events.push({
        id: `dividend-ex-${quote.symbol}-${quote.nextExDate}`,
        title: `${quote.symbol} ex-dividend`,
        date: quote.nextExDate,
        timeLabel: formatTimeLabel(quote.nextExDate),
        datetime: `${quote.nextExDate}T12:00:00.000Z`,
        category: "dividends",
        country: null,
        market: null,
        ticker: quote.symbol,
        instrumentName: name,
        portfolioRelevant: true,
        relevanceReason: `Ex-dividend date for ${quote.symbol}`,
        source: "EODHD Dividend Calendar",
        sourceUrl: null,
        impact: "Medium",
        description: name
          ? `Upcoming ex-dividend date for ${name}.`
          : `Upcoming ex-dividend date for ${quote.symbol}.`,
      });
    }

    if (quote.nextPaymentDate && quote.nextPaymentDate >= today) {
      events.push({
        id: `dividend-pay-${quote.symbol}-${quote.nextPaymentDate}`,
        title: `${quote.symbol} dividend payment`,
        date: quote.nextPaymentDate,
        timeLabel: formatTimeLabel(quote.nextPaymentDate),
        datetime: `${quote.nextPaymentDate}T12:00:00.000Z`,
        category: "dividends",
        country: null,
        market: null,
        ticker: quote.symbol,
        instrumentName: name,
        portfolioRelevant: true,
        relevanceReason: `Dividend payment for ${quote.symbol}`,
        source: "EODHD Dividend Calendar",
        sourceUrl: null,
        impact: "Medium",
        description: name
          ? `Scheduled dividend payment window for ${name}.`
          : `Scheduled dividend payment window for ${quote.symbol}.`,
      });
    }
  }

  return events;
}
