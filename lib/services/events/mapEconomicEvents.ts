import type { UpcomingMarketEvent } from "@/lib/types/newsContent";
import type {
  CalendarEvent,
  CalendarEventCategory,
} from "@/lib/services/events/types";

export function mapLegacyCategoryToUi(
  category: UpcomingMarketEvent["category"],
): CalendarEventCategory {
  if (category === "fed" || category === "ecb") return "central_banks";
  if (category === "earnings") return "earnings";
  if (category === "cpi") return "macro";
  return "macro";
}

export function mapEconomicEventToCalendarEvent(
  event: UpcomingMarketEvent,
): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    timeLabel: event.timeLabel,
    datetime: `${event.date}T12:00:00.000Z`,
    category: mapLegacyCategoryToUi(event.category),
    country: event.country || null,
    market: event.country || null,
    ticker: null,
    instrumentName: null,
    portfolioRelevant: false,
    relevanceReason: null,
    source: event.source,
    sourceUrl: null,
    impact: event.impact ?? null,
    description: event.description,
  };
}
