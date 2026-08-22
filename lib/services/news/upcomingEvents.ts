import { unstable_cache } from "next/cache";

import type { EventsDataState, UpcomingMarketEvent } from "@/lib/types/newsContent";

export type UpcomingEventCategory =
  | "earnings"
  | "cpi"
  | "fed"
  | "ecb"
  | "macro";

export type UpcomingEventsDiagnostics = {
  requestedFrom: string;
  requestedTo: string;
  providerHttpStatus: number | null;
  providerRowCount: number;
  mappedEventCount: number;
  warning: string | null;
};

export type UpcomingEventsResult = {
  events: UpcomingMarketEvent[];
  state: EventsDataState;
  source: string | null;
  diagnostics: UpcomingEventsDiagnostics;
};

export type EodhdEconomicEvent = {
  type?: string;
  country?: string;
  date?: string;
  actual?: number | null;
  previous?: number | null;
  estimate?: number | null;
};

const EODHD_EVENTS_SOURCE = "EODHD Economic Calendar";
const LOOKAHEAD_DAYS = 21;
const PROVIDER_LIMIT = 1000;
/** News strip keep-top size; calendar consumers can request a higher limit. */
const DEFAULT_MAP_LIMIT = 120;

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
  "unemployment",
  "gdp",
  "trade balance",
  "industrial production",
  "housing starts",
  "manufacturing",
];

const CATEGORY_PATTERNS: Array<{
  category: UpcomingEventCategory;
  pattern: RegExp;
}> = [
  { category: "earnings", pattern: /\bearnings\b/i },
  {
    category: "cpi",
    pattern: /\b(cpi|consumer price index|inflation rate|core inflation)\b/i,
  },
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

function emptyDiagnostics(
  overrides: Partial<UpcomingEventsDiagnostics> = {},
): UpcomingEventsDiagnostics {
  const now = new Date();
  return {
    requestedFrom: createDateString(now),
    requestedTo: createDateString(addDays(now, LOOKAHEAD_DAYS)),
    providerHttpStatus: null,
    providerRowCount: 0,
    mappedEventCount: 0,
    warning: null,
    ...overrides,
  };
}

function logEventsDiag(
  message: string,
  details: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "production") return;
  console.info(`[upcoming-events] ${message}`, details);
}

/** Extract YYYY-MM-DD from EODHD date (`YYYY-MM-DD` or `YYYY-MM-DD HH:MM:SS`). */
export function extractEventDateKey(dateValue: string): string | null {
  const trimmed = dateValue.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? null;
}

/** Parse EODHD event datetime into a UTC Date. */
export function parseEodhdEventDate(dateValue: string): Date | null {
  const trimmed = dateValue.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(trimmed)) {
    const normalised = trimmed.includes("T")
      ? trimmed
      : trimmed.replace(" ", "T");
    const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalised)
      ? normalised
      : `${normalised}Z`;
    const parsed = new Date(withZone);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

function classifyEventCategory(title: string): UpcomingEventCategory {
  for (const entry of CATEGORY_PATTERNS) {
    if (entry.pattern.test(title)) {
      return entry.category;
    }
  }

  return "macro";
}

function getImpact(title: string): "High" | "Medium" | "Low" {
  const normalized = title.toLowerCase();

  if (HIGH_IMPACT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "High";
  }

  if (MEDIUM_IMPACT_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
    return "Medium";
  }

  return "Low";
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

function formatTimeLabel(dateKey: string, parsed: Date): string {
  const hasClock =
    parsed.getUTCHours() !== 12 ||
    parsed.getUTCMinutes() !== 0 ||
    parsed.getUTCSeconds() !== 0;

  if (hasClock) {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date(`${dateKey}T12:00:00.000Z`));
}

export function mapEodhdEconomicEvents(
  events: EodhdEconomicEvent[],
  options: { now?: Date; limit?: number } = {},
): UpcomingMarketEvent[] {
  const now = options.now ?? new Date();
  const today = createDateString(now);
  const limit = options.limit ?? DEFAULT_MAP_LIMIT;

  return events
    .map((event, index) => {
      const title = normaliseText(event.type);
      const rawDate = normaliseText(event.date);
      if (!title || !rawDate) {
        return null;
      }

      const dateKey = extractEventDateKey(rawDate);
      const parsed = parseEodhdEventDate(rawDate);
      if (!dateKey || !parsed) {
        return null;
      }

      // Compare calendar dates only so local/UTC clock skew cannot drop today.
      if (dateKey < today) {
        return null;
      }

      const category = classifyEventCategory(title);
      const impact = getImpact(title);

      return {
        id: `${dateKey}-${event.country ?? "global"}-${index}-${title}`,
        title,
        category,
        date: dateKey,
        timeLabel: formatTimeLabel(dateKey, parsed),
        country: normaliseText(event.country) || "Global",
        description: formatEventDescription(event),
        impact,
        source: EODHD_EVENTS_SOURCE,
      };
    })
    .filter((event): event is UpcomingMarketEvent => event !== null)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const impactRank = (value: UpcomingMarketEvent["impact"]) =>
        value === "High" ? 0 : value === "Medium" ? 1 : 2;
      const impactDiff = impactRank(a.impact) - impactRank(b.impact);
      if (impactDiff !== 0) return impactDiff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, limit);
}

/** @deprecated Production must not use fabricated fallback events. Tests only. */
export function buildFallbackUpcomingEvents(): UpcomingMarketEvent[] {
  return [];
}

async function fetchEconomicEventsFromEodhd(): Promise<UpcomingEventsResult> {
  const now = new Date();
  const requestedFrom = createDateString(now);
  const requestedTo = createDateString(addDays(now, LOOKAHEAD_DAYS));
  const baseDiagnostics = emptyDiagnostics({
    requestedFrom,
    requestedTo,
  });

  const apiKey = process.env.EODHD_API_KEY?.trim();
  if (!apiKey) {
    const diagnostics = {
      ...baseDiagnostics,
      warning: "EODHD_API_KEY is missing.",
    };
    logEventsDiag("configuration_missing", {
      reason: "missing_api_key",
      from: requestedFrom,
      to: requestedTo,
    });
    return {
      events: [],
      state: "configuration_missing",
      source: null,
      diagnostics,
    };
  }

  const url = new URL("https://eodhd.com/api/economic-events");
  url.searchParams.set("from", requestedFrom);
  url.searchParams.set("to", requestedTo);
  url.searchParams.set("limit", String(PROVIDER_LIMIT));
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  logEventsDiag("request", {
    endpoint: `${url.origin}${url.pathname}`,
    from: requestedFrom,
    to: requestedTo,
    limit: PROVIDER_LIMIT,
    fmt: "json",
  });

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 45 * 60 },
    });

    if (!response.ok) {
      const bodyPreview = (await response.text()).slice(0, 180);
      const isForbidden = response.status === 403 || response.status === 401;
      const state: EventsDataState = isForbidden
        ? "configuration_missing"
        : "provider_unavailable";
      const warning = isForbidden
        ? `EODHD economic-events returned HTTP ${response.status} (subscription or token cannot access this feed).`
        : `EODHD economic-events returned HTTP ${response.status}.`;

      logEventsDiag(state, {
        httpStatus: response.status,
        from: requestedFrom,
        to: requestedTo,
        bodyPreview,
      });

      return {
        events: [],
        state,
        source: null,
        diagnostics: {
          ...baseDiagnostics,
          providerHttpStatus: response.status,
          warning,
        },
      };
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      const warning =
        "EODHD economic-events returned a non-array payload (treated as provider error).";
      logEventsDiag("provider_unavailable", {
        httpStatus: response.status,
        shape: typeof data,
      });
      return {
        events: [],
        state: "provider_unavailable",
        source: EODHD_EVENTS_SOURCE,
        diagnostics: {
          ...baseDiagnostics,
          providerHttpStatus: response.status,
          warning,
        },
      };
    }

    const mapped = mapEodhdEconomicEvents(data as EodhdEconomicEvent[], {
      now,
      limit: DEFAULT_MAP_LIMIT,
    });

    logEventsDiag("mapped", {
      httpStatus: response.status,
      providerRowCount: data.length,
      mappedEventCount: mapped.length,
      from: requestedFrom,
      to: requestedTo,
    });

    return {
      events: mapped,
      state: mapped.length > 0 ? "live" : "empty",
      source: EODHD_EVENTS_SOURCE,
      diagnostics: {
        ...baseDiagnostics,
        providerHttpStatus: response.status,
        providerRowCount: data.length,
        mappedEventCount: mapped.length,
        warning:
          data.length > 0 && mapped.length === 0
            ? "Provider returned rows but none mapped into upcoming events."
            : null,
      },
    };
  } catch (error) {
    const warning =
      error instanceof Error
        ? `EODHD economic-events request failed: ${error.message}`
        : "EODHD economic-events request failed.";
    logEventsDiag("provider_unavailable", { warning });
    return {
      events: [],
      state: "provider_unavailable",
      source: null,
      diagnostics: {
        ...baseDiagnostics,
        warning,
      },
    };
  }
}

const getCachedUpcomingEvents = unstable_cache(
  fetchEconomicEventsFromEodhd,
  ["investment-os-news-upcoming-events-v3"],
  { revalidate: 45 * 60 },
);

export async function fetchUpcomingMarketEvents(): Promise<UpcomingEventsResult> {
  // Avoid sticky cached 403/empty while iterating on provider access locally.
  if (process.env.NODE_ENV === "development") {
    return fetchEconomicEventsFromEodhd();
  }
  return getCachedUpcomingEvents();
}
