import { unstable_cache } from "next/cache";

export type UpcomingEventCategory =
  | "earnings"
  | "cpi"
  | "fed"
  | "ecb"
  | "macro";

export type UpcomingMarketEvent = {
  id: string;
  title: string;
  category: UpcomingEventCategory;
  date: string;
  timeLabel: string;
  country: string;
  description: string;
  impact: "High" | "Medium";
};

type EodhdEconomicEvent = {
  type?: string;
  country?: string;
  date?: string;
  actual?: number | null;
  previous?: number | null;
  estimate?: number | null;
};

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
    return "This release may influence rates, currencies, and risk appetite across global markets.";
  }

  return `${values.join(" · ")}. Markets may react if the print differs from expectations.`;
}

function formatTimeLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Date TBC";

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
      };
    })
    .filter((event): event is UpcomingMarketEvent => event !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
}

export function buildFallbackUpcomingEvents(now = new Date()): UpcomingMarketEvent[] {
  const templates: Array<Omit<UpcomingMarketEvent, "id" | "date" | "timeLabel">> = [
    {
      title: "US Consumer Price Index (CPI)",
      category: "cpi",
      country: "United States",
      description:
        "Inflation data can shift rate expectations and affect both equity and bond positioning.",
      impact: "High",
    },
    {
      title: "Federal Reserve interest rate decision",
      category: "fed",
      country: "United States",
      description:
        "Policy guidance and the rate decision often set the tone for global risk assets.",
      impact: "High",
    },
    {
      title: "ECB monetary policy announcement",
      category: "ecb",
      country: "Euro Area",
      description:
        "European rate expectations can move EUR assets and broader continental equity markets.",
      impact: "High",
    },
    {
      title: "Major index constituents earnings updates",
      category: "earnings",
      country: "Global",
      description:
        "Corporate earnings releases help investors assess growth, margins, and sector leadership.",
      impact: "Medium",
    },
  ];

  return templates.map((template, index) => {
    const date = createDateString(addDays(now, index + 2));
    return {
      ...template,
      id: `fallback-${template.category}-${date}`,
      date,
      timeLabel: formatTimeLabel(date),
    };
  });
}

async function fetchEconomicEventsFromEodhd(): Promise<UpcomingMarketEvent[]> {
  const apiKey = process.env.EODHD_API_KEY;
  if (!apiKey) {
    return buildFallbackUpcomingEvents();
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
      return buildFallbackUpcomingEvents(now);
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return buildFallbackUpcomingEvents(now);
    }

    const mapped = mapEodhdEvents(data as EodhdEconomicEvent[]);
    return mapped.length > 0 ? mapped : buildFallbackUpcomingEvents(now);
  } catch {
    return buildFallbackUpcomingEvents(now);
  }
}

const getCachedUpcomingEvents = unstable_cache(
  fetchEconomicEventsFromEodhd,
  ["investment-os-news-upcoming-events-v1"],
  { revalidate: 45 * 60 },
);

export async function fetchUpcomingMarketEvents(): Promise<UpcomingMarketEvent[]> {
  return getCachedUpcomingEvents();
}
