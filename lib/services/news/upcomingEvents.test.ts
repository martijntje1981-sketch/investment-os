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

  it("returns provider_unavailable when EODHD_API_KEY is missing", async () => {
    vi.stubEnv("EODHD_API_KEY", "");

    const { fetchUpcomingMarketEvents } = await import(
      "@/lib/services/news/upcomingEvents"
    );

    const result = await fetchUpcomingMarketEvents();
    expect(result.events).toEqual([]);
    expect(result.state).toBe("provider_unavailable");
    expect(result.source).toBeNull();
  });

  it("maps verified EODHD economic events with source attribution", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            type: "US Consumer Price Index",
            country: "United States",
            date: "2026-07-22",
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
      date: "2026-07-22",
      source: "EODHD Economic Calendar",
      impact: "High",
    });
    expect(result.state).toBe("live");
  });

  it("returns empty state when provider responds with no qualifying events", async () => {
    vi.stubEnv("EODHD_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
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
});
