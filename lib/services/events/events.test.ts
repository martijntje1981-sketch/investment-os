import { describe, expect, it } from "vitest";

import {
  applyPortfolioRelevance,
  buildDividendCalendarEvents,
  groupEventsByHorizon,
  localDateKey,
  selectDashboardWeekEvents,
  sortCalendarEvents,
  type CalendarEvent,
} from "@/lib/services/events";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function event(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, "id" | "title" | "date">,
): CalendarEvent {
  return {
    timeLabel: "Mon 01 Aug",
    datetime: `${overrides.date}T12:00:00.000Z`,
    category: "macro",
    country: "United States",
    market: "United States",
    ticker: null,
    instrumentName: null,
    portfolioRelevant: false,
    relevanceReason: null,
    source: "EODHD Economic Calendar",
    sourceUrl: null,
    impact: "High",
    description: null,
    ...overrides,
  };
}

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    name: overrides.name ?? overrides.symbol,
    quantity: 1,
    purchasePrice: 10,
    currentPrice: 10,
    currency: "EUR",
    assetType: "investment",
    ...overrides,
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
  };
}

describe("event grouping and ordering", () => {
  it("groups into today, this week and later by local calendar", () => {
    const now = new Date(2026, 7, 5); // Wed 5 Aug 2026 local
    const today = localDateKey(now);
    const grouped = groupEventsByHorizon(
      [
        event({ id: "1", title: "Today CPI", date: today }),
        event({ id: "2", title: "Friday payrolls", date: "2026-08-07" }),
        event({ id: "3", title: "Next month GDP", date: "2026-09-01" }),
        event({ id: "past", title: "Past", date: "2026-08-01" }),
      ],
      now,
    );

    expect(grouped.today.map((item) => item.id)).toEqual(["1"]);
    expect(grouped.thisWeek.map((item) => item.id)).toEqual(["2"]);
    expect(grouped.later.map((item) => item.id)).toEqual(["3"]);
  });

  it("orders by date then portfolio relevance then impact", () => {
    const sorted = sortCalendarEvents([
      event({
        id: "b",
        title: "B",
        date: "2026-08-10",
        portfolioRelevant: false,
        impact: "High",
      }),
      event({
        id: "a",
        title: "A",
        date: "2026-08-10",
        portfolioRelevant: true,
        impact: "Medium",
      }),
      event({
        id: "c",
        title: "C",
        date: "2026-08-09",
        portfolioRelevant: false,
        impact: "Medium",
      }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["c", "a", "b"]);
  });
});

describe("portfolio relevance", () => {
  it("keeps general macro events visible without portfolio relevance", () => {
    const events = applyPortfolioRelevance(
      [
        event({
          id: "macro-1",
          title: "Building Permits",
          date: "2026-08-12",
          category: "macro",
          impact: "Low",
        }),
        event({
          id: "ecb",
          title: "ECB Interest Rate Decision",
          date: "2026-08-12",
          category: "central_banks",
          country: "Euro Area",
        }),
      ],
      [holding({ symbol: "VWCE", quoteCurrency: "EUR", providerSymbol: "VWCE.XETRA" })],
    );

    expect(events).toHaveLength(2);
    expect(events.find((item) => item.id === "macro-1")?.portfolioRelevant).toBe(
      false,
    );
    expect(events.find((item) => item.id === "ecb")?.portfolioRelevant).toBe(true);
  });

  it("marks Fed events relevant for USD-linked holdings only", () => {
    const withUsd = applyPortfolioRelevance(
      [
        event({
          id: "fed",
          title: "FOMC Interest Rate Decision",
          date: "2026-08-12",
          category: "central_banks",
          country: "United States",
        }),
      ],
      [holding({ symbol: "AAPL", quoteCurrency: "USD", providerSymbol: "AAPL.US" })],
    );
    expect(withUsd[0]?.portfolioRelevant).toBe(true);

    const eurOnly = applyPortfolioRelevance(
      [
        event({
          id: "fed",
          title: "FOMC Interest Rate Decision",
          date: "2026-08-12",
          category: "central_banks",
          country: "United States",
        }),
      ],
      [holding({ symbol: "VWCE", quoteCurrency: "EUR", providerSymbol: "VWCE.XETRA" })],
    );
    expect(eurOnly[0]?.portfolioRelevant).toBe(false);
  });

  it("does not claim relevance for generic macro releases", () => {
    const events = applyPortfolioRelevance(
      [
        event({
          id: "cpi",
          title: "US Consumer Price Index",
          date: "2026-08-12",
          category: "macro",
        }),
      ],
      [holding({ symbol: "AAPL", quoteCurrency: "USD", providerSymbol: "AAPL.US" })],
    );
    expect(events[0]?.portfolioRelevant).toBe(false);
    expect(events[0]?.relevanceReason).toBeNull();
  });

  it("builds dividend events as portfolio relevant", () => {
    const events = buildDividendCalendarEvents({
      quotes: [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          paysDividends: true,
          dividendYield: 1,
          forwardAnnualDividendRate: 1,
          estimatedAnnualDividendEur: 1,
          estimatedNextPaymentEur: 1,
          nextExDate: "2099-01-15",
          nextPaymentDate: "2099-02-01",
          frequency: "quarterly",
          currency: "EUR",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      holdings: [holding({ symbol: "VWCE", name: "Vanguard FTSE All-World" })],
      now: new Date("2026-08-01T12:00:00.000Z"),
    });

    expect(events).toHaveLength(2);
    expect(events.every((item) => item.category === "dividends")).toBe(true);
    expect(events.every((item) => item.portfolioRelevant)).toBe(true);
  });
});

describe("dashboard week selection", () => {
  it("prioritises portfolio-relevant events and caps at five", () => {
    const now = new Date();
    const today = localDateKey(now);
    const events = Array.from({ length: 8 }, (_, index) =>
      event({
        id: `e-${index}`,
        title: `Event ${index}`,
        date: today,
        portfolioRelevant: index < 2,
        impact: index === 0 ? "Medium" : "High",
      }),
    );

    const selected = selectDashboardWeekEvents(events, 5);
    expect(selected).toHaveLength(5);
    expect(selected.filter((item) => item.portfolioRelevant)).toHaveLength(2);
    expect(selected[0]?.portfolioRelevant).toBe(true);
  });

  it("does not drop general events when filling the dashboard week card", () => {
    const now = new Date();
    const today = localDateKey(now);
    const selected = selectDashboardWeekEvents(
      [
        event({
          id: "relevant",
          title: "ECB Decision",
          date: today,
          category: "central_banks",
          portfolioRelevant: true,
        }),
        event({
          id: "general-1",
          title: "Building Permits",
          date: today,
          portfolioRelevant: false,
          impact: "Low",
        }),
        event({
          id: "general-2",
          title: "Retail Sales",
          date: today,
          portfolioRelevant: false,
        }),
      ],
      5,
    );

    expect(selected.map((item) => item.id)).toEqual([
      "relevant",
      "general-2",
      "general-1",
    ]);
  });
});

describe("UTC/local date boundaries", () => {
  it("keeps same calendar date across late UTC timestamps", () => {
    const now = new Date(2026, 7, 1, 1, 0, 0); // local 1 Aug
    const grouped = groupEventsByHorizon(
      [
        event({
          id: "late-utc",
          title: "Late print",
          date: "2026-08-01",
          datetime: "2026-08-01T23:30:00.000Z",
        }),
      ],
      now,
    );

    expect(grouped.today.map((item) => item.id)).toEqual(["late-utc"]);
  });
});
