import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EODHD_NEWS_PROVIDER_ID } from "@/lib/services/instruments/eodhdNewsGuard";
import { resetEodhdNewsGuardForTests } from "@/lib/services/instruments/eodhdNewsGuard";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import {
  buildEodhdNewsCacheKey,
  resetEodhdNewsCacheForTests,
  writeEodhdNewsCache,
} from "@/lib/services/news/cache/eodhdNewsCache";
import { fetchEodhdNewsFeed } from "@/lib/services/news/providers/eodhdNewsProvider";
import {
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import type { NewsContentItem } from "@/lib/types/newsContent";

function wireItem(id: string): NewsContentItem {
  return {
    id,
    title: `Headline ${id}`,
    sourceName: "EODHD News",
    sourceType: "news",
    canonicalUrl: `https://example.com/${id}`,
    thumbnailUrl: null,
    publishedAt: "2026-07-20T08:00:00.000Z",
    description: "Body",
    summary: "",
    interpretation: "",
    impactLevel: "Low Impact",
    matchedHoldingIds: [],
    matchedSymbols: [],
    matchedHoldings: [],
    relevanceLabel: null,
    category: "markets",
    marketCategory: "macro",
    contentTypeLabel: "News",
    fetchedAt: "2026-07-20T08:00:00.000Z",
    relevanceScore: 0,
  };
}

describe("eodhd news resilience", () => {
  beforeEach(() => {
    resetEodhdNewsCacheForTests();
    resetEodhdNewsGuardForTests();
    resetProviderCircuitForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("serves stale cached wire headlines when the news circuit breaker is open", async () => {
    const cacheKey = buildEodhdNewsCacheKey(["AAPL.US"]);
    writeEodhdNewsCache(cacheKey, [wireItem("cached-1")], "2026-07-19T08:00:00.000Z");

    recordProviderCircuitFailure(
      EODHD_NEWS_PROVIDER_ID,
      new Error("EODHD News returned 402"),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });

    expect(result.items).toHaveLength(1);
    expect(result.servedFromCache).toBe(true);
    expect(result.lastSuccessfulUpdate).toBe("2026-07-19T08:00:00.000Z");
    expect(result.diagnostics.providerCalls).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not block news fetches when only the live-price circuit is open", async () => {
    recordProviderCircuitFailure(
      EODHD_QUOTE_PROVIDER_ID,
      new Error("EODHD quotes returned 402"),
    );

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });

    expect(fetchMock).toHaveBeenCalled();
  });

  it("does not call EODHD again on repeated visits while the news circuit is open", async () => {
    recordProviderCircuitFailure(
      EODHD_NEWS_PROVIDER_ID,
      new Error("EODHD News returned 402"),
    );

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });
    await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:01:00.000Z",
      apiKey: "test-key",
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to cached headlines after quota exhaustion instead of surfacing provider errors", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T09:00:00.000Z"));

    const cacheKey = buildEodhdNewsCacheKey(["AAPL.US"]);
    writeEodhdNewsCache(cacheKey, [wireItem("cached-2")], "2026-07-19T09:00:00.000Z");

    vi.setSystemTime(new Date("2026-07-20T08:00:00.000Z"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 402,
      }),
    );

    const result = await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });

    expect(result.items).toHaveLength(1);
    expect(result.servedFromCache).toBe(true);
    expect(result.error).toBe("wire_news_quota_exhausted");
    expect(result.diagnostics.quotaExhausted).toBe(true);

    vi.useRealTimers();
  });

  it("deduplicates provider symbols before issuing requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal("fetch", fetchMock);

    await fetchEodhdNewsFeed({
      providerSymbols: ["AAPL.US", "aapl.us", "AAPL.US"],
      fetchedAt: "2026-07-20T08:00:00.000Z",
      apiKey: "test-key",
    });

    const symbolRequests = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("s=AAPL.US"),
    );
    expect(symbolRequests).toHaveLength(1);
  });
});
