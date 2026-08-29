import type {
  CalendarEvent,
  CalendarEventHorizon,
  GroupedCalendarEvents,
} from "@/lib/services/events/types";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local calendar YYYY-MM-DD (browser / Node local timezone). */
export function localDateKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Inclusive end of the current local week (Sunday). */
export function endOfLocalWeekKey(date: Date = new Date()): string {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = copy.getDay(); // 0 = Sunday
  const daysUntilSunday = (7 - day) % 7;
  copy.setDate(copy.getDate() + daysUntilSunday);
  return localDateKey(copy);
}

export function resolveEventHorizon(
  eventDate: string,
  now: Date = new Date(),
): CalendarEventHorizon {
  const today = localDateKey(now);
  const weekEnd = endOfLocalWeekKey(now);

  if (eventDate === today) return "today";
  if (eventDate > today && eventDate <= weekEnd) return "this_week";
  return "later";
}

export function sortCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.portfolioRelevant !== b.portfolioRelevant) {
      return a.portfolioRelevant ? -1 : 1;
    }
    const impactRank = (value: CalendarEvent["impact"]) =>
      value === "High" ? 0 : value === "Medium" ? 1 : 2;
    const impactDiff = impactRank(a.impact) - impactRank(b.impact);
    if (impactDiff !== 0) return impactDiff;
    return a.title.localeCompare(b.title);
  });
}

export function groupEventsByHorizon(
  events: CalendarEvent[],
  now: Date = new Date(),
): GroupedCalendarEvents {
  const sorted = sortCalendarEvents(events);
  const today: CalendarEvent[] = [];
  const thisWeek: CalendarEvent[] = [];
  const later: CalendarEvent[] = [];

  for (const event of sorted) {
    if (event.date < localDateKey(now)) continue;
    const horizon = resolveEventHorizon(event.date, now);
    if (horizon === "today") today.push(event);
    else if (horizon === "this_week") thisWeek.push(event);
    else later.push(event);
  }

  return { today, thisWeek, later };
}
