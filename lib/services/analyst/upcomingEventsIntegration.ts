/**
 * Future Upcoming Events integration points for Analyst Intelligence.
 *
 * Do not implement full events here — only stable hooks for later wiring.
 */

import type { AnalystApiQuote, AnalystUpcomingEventLink } from "@/lib/types/analyst";

export function buildAnalystUpcomingEventLinks(
  quotes: AnalystApiQuote[],
): AnalystUpcomingEventLink[] {
  return quotes
    .filter((quote) => quote.analystCount > 0)
    .map((quote) => ({
      symbol: quote.symbol,
      providerSymbol: quote.providerSymbol,
      eventType: "earnings" as const,
      eventDate: null,
      analystQuoteUpdatedAt: quote.updatedAt,
    }));
}

export function attachUpcomingEventsPlaceholder<T extends { upcomingEvents?: unknown[] }>(
  payload: T,
  links: AnalystUpcomingEventLink[],
): T & { analystEventLinks?: AnalystUpcomingEventLink[] } {
  return {
    ...payload,
    analystEventLinks: links,
  };
}
