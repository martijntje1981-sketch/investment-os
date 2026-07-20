import { unstable_cache } from "next/cache";

import type { EventsDataState, UpcomingMarketEvent } from "@/lib/types/newsContent";

export type UpcomingEventCategory =
  | "earnings"
  | "cpi"
  | "fed"
  | "ecb"
  | "macro";

export type UpcomingEventsResult = {
  events: UpcomingMarketEvent[];
  state: EventsDataState;
  source: string | null;
};

type EodhdEconomicEvent = {
  type?: string;
  country?: string;
  date?: string;
  actual?: number | null;
  previous?: number | null;
  estimate?: number | null;
};

const EODHD_EVENTS_SOURCE = "EODHD Economic Calendar";

const HIGH_IMPACT_KEYWORDS = [
  "interest rate decision",
  "inflation rate",
  "consumer price index",
  "cpi",
  "core inflation",
  "non farm payrolls",
  "nonfarm payrolls",
  "federal reserve",
  "fomc",
  "ecb",
  "gross domestic product",
  "earnings",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "retail sales",
  "pmi",
  "consumer confidence",
  "producer price index",
  "ppi",
  "jobless claims",
];

const CATEGORY_PATTERNS: Array<{
  category: UpcomingEventCategory;
  pattern: RegExp;
}> = [
  { category: "earnings", pattern: /\bearnings\b/i },
  { category: "cpi", pattern: /\b(cpi|consumer price index|inflation rate|core inflation)\b/i },
  { category: "fed", pattern: /\b(fed|federal reserve|fomc)\b/i },
  { category: "ecb", pattern: /\b(ecb|european central bank)\b/i },
];

function createDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function normaliseText(value: string | undefined): string {
  return (value ?? "").trim();
}

function classifyEventCategory(title: string): UpcomingEventCategory {
  for (const entry of CATEGORY_PATTERNS) {
    if (entry.pattern.test(title)) {
      return entry.category;
    }
  }

  return "macro";
}

function getImpact(title: string): "High" | "Medium" | null {
  const normalized = title.toLowerCase();

  if (HIGH_IMPACT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "High";
  }

  if (MEDIUM_IMPACT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "Medium";
  }

  return null;
}

function formatEventDescription(event: EodhdEconomicEvent): string {
  const values = [
    typeof event.estimate === "number" ? `Estimate: ${event.estimate}` : null,
    typeof event.previous === "number" ? `Previous: ${event.previous}` : null,
    typeof event.actual === "number" ? `Actual: ${event.actual}` : null,
  ].filter(Boolean);

  if (values.length === 0) {
    return "Verified economic calendar release from EODHD.";
  }

  return `${values.join(" · ")}. Markets may react if the print differs from expectations.`;
}

function formatTimeLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(date);
}

function mapEodhdEvents(events: EodhdEconomicEvent[]): UpcomingMarketEvent[] {
  return events
    .map((event, index) => {
      const title = normaliseText(event.type);
      const date = normaliseText(event.date);
      const impact = getImpact(title);

      if (!title || !date || !impact) {
        return null;
      }

      const parsed = Date.parse(`${date}T12:00:00.000Z`);
      if (Number.isNaN(parsed)) {
        return null;
      }

      const category = classifyEventCategory(title);

      return {
        id: `${date}-${event.country ?? "global"}-${index}-${title}`,
        title,
        category,
        date,
        timeLabel: formatTimeLabel(date),
        country: normaliseText(event.country) || "Global",
        description: formatEventDescription(event),
        impact,
        source: EODHD_EVENTS_SOURCE,
      };
    })
    .filter((event): event is UpcomingMarketEvent => event !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
}

/** @deprecated Production must not use fabricated fallback events. Tests only. */
export function buildFallbackUpcomingEvents(): UpcomingMarketEvent[] {
  return [];
}

async function fetchEconomicEventsFromEodhd(): Promise<UpcomingEventsResult> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return {
      events: [],
      state: "provider_unavailable",
      source: null,
    };
  }

  const now = new Date();
  const url = new URL("https://eodhd.com/api/economic-events");
  url.searchParams.set("from", createDateString(now));
  url.searchParams.set("to", createDateString(addDays(now, 21)));
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 45 * 60 },
    });

    if (!response.ok) {
      return {
        events: [],
        state: "provider_unavailable",
        source: null,
      };
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return {
        events: [],
        state: "empty",
        source: EODHD_EVENTS_SOURCE,
      };
    }

    const mapped = mapEodhdEvents(data as EodhdEconomicEvent[]);
    return {
      events: mapped,
      state: mapped.length > 0 ? "live" : "empty",
      source: EODHD_EVENTS_SOURCE,
    };
  } catch {
    return {
      events: [],
      state: "provider_unavailable",
      source: null,
    };
  }
}

const getCachedUpcomingEvents = unstable_cache(
  fetchEconomicEventsFromEodhd,
  ["investment-os-news-upcoming-events-v2"],
  { revalidate: 45 * 60 },
);

export async function fetchUpcomingMarketEvents(): Promise<UpcomingEventsResult> {
  return getCachedUpcomingEvents();
}
