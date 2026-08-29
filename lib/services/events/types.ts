import type { EventsDataState } from "@/lib/types/newsContent";

/** User-facing calendar categories for Tobailey Events. */
export type CalendarEventCategory =
  | "macro"
  | "central_banks"
  | "earnings"
  | "dividends"
  | "crypto";

export const CALENDAR_EVENT_CATEGORIES: CalendarEventCategory[] = [
  "macro",
  "central_banks",
  "earnings",
  "dividends",
  "crypto",
];

export const CALENDAR_EVENT_CATEGORY_LABELS: Record<
  CalendarEventCategory,
  string
> = {
  macro: "Macro",
  central_banks: "Central Banks",
  earnings: "Earnings",
  dividends: "Dividends",
  crypto: "Crypto",
};

/**
 * Categories not yet backed by a live provider calendar for Phase 1.
 * Earnings may still appear if the economic calendar title mentions earnings.
 */
export const CALENDAR_CATEGORIES_UNAVAILABLE: CalendarEventCategory[] = [
  "crypto",
];

export type CalendarEvent = {
  id: string;
  title: string;
  date: string;
  timeLabel: string;
  datetime: string | null;
  category: CalendarEventCategory;
  country: string | null;
  market: string | null;
  ticker: string | null;
  instrumentName: string | null;
  portfolioRelevant: boolean;
  relevanceReason: string | null;
  source: string;
  sourceUrl: string | null;
  impact: "High" | "Medium" | "Low" | null;
  description: string | null;
};

export type CalendarEventHorizon = "today" | "this_week" | "later";

export type GroupedCalendarEvents = {
  today: CalendarEvent[];
  thisWeek: CalendarEvent[];
  later: CalendarEvent[];
};

export type CalendarEventsDiagnostics = {
  source: string | null;
  requestedFrom: string | null;
  requestedTo: string | null;
  providerHttpStatus: number | null;
  providerRowCount: number;
  mappedEventCount: number;
  economicEventCount: number;
  dividendEventCount: number;
  warnings: string[];
  unavailableCategories: CalendarEventCategory[];
};

export type CalendarEventsPayload = {
  events: CalendarEvent[];
  grouped: GroupedCalendarEvents;
  state: EventsDataState;
  source: string | null;
  unavailableCategories: CalendarEventCategory[];
  diagnostics: CalendarEventsDiagnostics;
};
