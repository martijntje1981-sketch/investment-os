import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: (callback: () => unknown) => callback,
}));

describe("upcomingEvents", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns configuration_missing when EODHD_API_KEY is missing", async () => {
    vi.stubEnv("EODHD_API_KEY", "");

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toEqual([]);
    expect(result.state).toBe("configuration_missing");
    expect(result.source).toBeNull();
    expect(result.diagnostics.warning).toMatch(/EODHD_API_KEY/i);
  });

  it("maps verified EODHD economic events with source attribution", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "US Consumer Price Index",
            country: "United States",
            date: "2026-08-22",
            estimate: 3.1,
            previous: 3.0,
          },
        ],
      }),
    );

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0]).toMatchObject({
      title: "US Consumer Price Index",
      date: "2026-08-22",
      source: "EODHD Economic Calendar",
      impact: "High",
    });
    expect(result.state).toBe("live");
    expect(result.diagnostics.providerRowCount).toBe(1);
    expect(result.diagnostics.mappedEventCount).toBe(1);
  });

  it("keeps general macro events without impact keywords", async () => {
    const { mapEodhdEconomicEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const mapped = mapEodhdEconomicEvents(
      [
        {
          type: "Building Permits",
          country: "US",
          date: "2026-08-10 13:30:00",
        },
        {
          type: "ECB President Lagarde Speaks",
          country: "EU",
          date: "2026-08-11 14:00:00",
        },
      ],
      { now: new Date("2026-08-01T00:00:00.000Z") },
    );

    expect(mapped).toHaveLength(2);
    expect(mapped[0]?.impact).toBe("Low");
    expect(mapped[0]?.date).toBe("2026-08-10");
    expect(mapped[1]?.category).toBe("ecb");
  });

  it("does not convert provider HTTP errors into a successful empty result", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden. Please contact support",
      }),
    );

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toEqual([]);
    expect(result.state).toBe("configuration_missing");
    expect(result.diagnostics.providerHttpStatus).toBe(403);
    expect(result.diagnostics.warning).toMatch(/403/);
  });

  it("returns empty state when provider responds with no qualifying events", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      }),
    );

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toEqual([]);
    expect(result.state).toBe("empty");
  });

  it("filters out past events using date keys across UTC/local boundaries", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [
          {
            type: "US Consumer Price Index",
            country: "United States",
            date: "2020-01-01 08:00:00",
            estimate: 3.1,
            previous: 3.0,
          },
          {
            type: "US Gross Domestic Product",
            country: "United States",
            date: "2026-08-01 23:30:00",
            estimate: 2.4,
            previous: 2.1,
          },
        ],
      }),
    );

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.title).toContain("Gross Domestic Product");
    expect(result.events[0]?.date).toBe("2026-08-01");
  });

  it("requests at least a 14-day lookahead window", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );
    await fetchUpcomingMarketEvents();

    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    const url = new URL(calledUrl);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const fromMs = Date.parse(`${from}T00:00:00.000Z`);
    const toMs = Date.parse(`${to}T00:00:00.000Z`);
    expect((toMs - fromMs) / (24 * 60 * 60 * 1000)).toBeGreaterThanOrEqual(14);
    expect(url.searchParams.get("limit")).toBe("1000");
    expect(url.pathname).toBe("/api/economic-events");
  });
});
