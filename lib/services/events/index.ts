import { fetchUpcomingMarketEvents } from "@/lib/services/news/upcomingEvents";
import { mapEconomicEventToCalendarEvent } from "@/lib/services/events/mapEconomicEvents";
import { buildDividendCalendarEvents } from "@/lib/services/events/buildDividendCalendarEvents";
import {
  groupEventsByHorizon,
  localDateKey,
  sortCalendarEvents,
} from "@/lib/services/events/groupEvents";
import { applyPortfolioRelevance } from "@/lib/services/events/portfolioRelevance";
import {
  CALENDAR_CATEGORIES_UNAVAILABLE,
  type CalendarEvent,
  type CalendarEventsPayload,
} from "@/lib/services/events/types";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function selectDashboardWeekEvents(
  events: CalendarEvent[],
  limit = 5,
): CalendarEvent[] {
  const now = new Date();
  const grouped = groupEventsByHorizon(events, now);
  const weekPool = sortCalendarEvents([
    ...grouped.today,
    ...grouped.thisWeek,
  ]);

  // Relevance prioritises within the week pool only; general events stay visible.
  const relevant = weekPool.filter((event) => event.portfolioRelevant);
  const general = weekPool.filter((event) => !event.portfolioRelevant);
  return [...relevant, ...general].slice(0, limit);
}

export async function buildCalendarEventsPayload(input: {
  holdings?: StoredPortfolioHolding[];
  dividendQuotes?: DividendApiQuote[];
}): Promise<CalendarEventsPayload> {
  const holdings = input.holdings ?? [];
  const economic = await fetchUpcomingMarketEvents();

  const economicEvents = economic.events.map(mapEconomicEventToCalendarEvent);
  const dividendEvents = buildDividendCalendarEvents({
    quotes: input.dividendQuotes ?? [],
    holdings,
  });

  const merged = applyPortfolioRelevance(
    sortCalendarEvents([...economicEvents, ...dividendEvents]),
    holdings,
  );

  const warnings = [
    economic.diagnostics.warning,
    ...CALENDAR_CATEGORIES_UNAVAILABLE.map(
      (category) => `${category} calendar is not connected in this phase.`,
    ),
  ].filter((value): value is string => Boolean(value));

  let state = economic.state;
  if (merged.length > 0) {
    state = "live";
  } else if (
    economic.state === "live" ||
    economic.state === "empty"
  ) {
    state = "empty";
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[calendar-events] payload", {
      state,
      providerHttpStatus: economic.diagnostics.providerHttpStatus,
      providerRowCount: economic.diagnostics.providerRowCount,
      mappedEventCount: economic.diagnostics.mappedEventCount,
      economicEventCount: economicEvents.length,
      dividendEventCount: dividendEvents.length,
      totalEvents: merged.length,
      from: economic.diagnostics.requestedFrom,
      to: economic.diagnostics.requestedTo,
    });
  }

  return {
    events: merged,
    grouped: groupEventsByHorizon(merged),
    state,
    source: economic.source,
    unavailableCategories: CALENDAR_CATEGORIES_UNAVAILABLE,
    diagnostics: {
      source: economic.source,
      requestedFrom: economic.diagnostics.requestedFrom,
      requestedTo: economic.diagnostics.requestedTo,
      providerHttpStatus: economic.diagnostics.providerHttpStatus,
      providerRowCount: economic.diagnostics.providerRowCount,
      mappedEventCount: economic.diagnostics.mappedEventCount,
      economicEventCount: economicEvents.length,
      dividendEventCount: dividendEvents.length,
      warnings,
      unavailableCategories: CALENDAR_CATEGORIES_UNAVAILABLE,
    },
  };
}

export { groupEventsByHorizon, sortCalendarEvents, localDateKey };
export { applyPortfolioRelevance };
export { buildDividendCalendarEvents };
export { mapEconomicEventToCalendarEvent };
export {
  filterExploreLinksForEventsAvailability,
  shouldIncludeUpcomingEventsNavLink,
  shouldRenderDashboardUpcomingEventsWidget,
  shouldShowUpcomingEventsSurfaces,
} from "@/lib/services/events/availability";
export * from "@/lib/services/events/types";
