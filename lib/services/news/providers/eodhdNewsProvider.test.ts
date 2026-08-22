import { describe, expect, it, vi } from "vitest";

import {
  fetchEodhdNewsFeed,
  fetchEodhdNewsForSymbol,
} from "@/lib/services/news/providers/eodhdNewsProvider";

describe("eodhdNewsProvider", () => {
  it("returns unavailable state when API key is missing", async () => {
    const result = await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "",
    });

    expect(result.items).toEqual([]);
    expect(result.providerAvailable).toBe(false);
    expect(result.error).toBe("wire_news_unconfigured");
  });

  it("maps valid EODHD articles with publication time and symbols", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            date: "2026-07-20T08:00:00.000Z",
            title: "Apple earnings preview",
            content: "Analysts expect strong iPhone demand.",
            link: "https://example.com/apple-earnings",
            symbols: ["AAPL.US"],
            tags: ["equities"],
          },
        ],
      }),
    );

    const items = await fetchEodhdNewsForSymbol(
      "AAPL.US",
      "test-key",
      "2026-07-20T08:00:00.000Z",
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: "Apple earnings preview",
      sourceName: "EODHD News",
      sourceType: "news",
      canonicalUrl: "https://example.com/apple-earnings",
      articleSymbols: ["AAPL.US"],
    });
    expect(items[0]?.publishedAt).toBeTruthy();
  });

  it("drops incomplete article rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          { title: "Missing link", date: "2026-07-20T08:00:00.000Z" },
          { link: "https://example.com/no-title", date: "2026-07-20T08:00:00.000Z" },
        ],
      }),
    );

    const items = await fetchEodhdNewsForSymbol(
      "AAPL.US",
      "test-key",
      "2026-07-20T08:00:00.000Z",
    );

    expect(items).toEqual([]);
  });

  it("reports provider failure when all requests fail", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network down")),
    );

    const result = await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });

    expect(result.items).toEqual([]);
    expect(result.providerAvailable).toBe(true);
    expect(result.error).toBeTruthy();
  });
});
