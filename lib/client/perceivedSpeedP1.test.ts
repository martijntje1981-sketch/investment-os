/**
 * Perceived-speed P1: keep last-known portfolio visible while access and
 * secondary intelligence update in the background.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { notifyExampleStatusChanged } from "@/lib/client/exampleFirstRun";
import {
  __countExampleStatusFetchesForTests,
  __resetExamplePortfolioStatusCacheForTests,
  fetchExamplePortfolioStatus,
  peekExamplePortfolioStatus,
  productAccessFromStatusPayload,
} from "@/lib/client/examplePortfolioStatusCache";
import { newsCacheKey } from "@/lib/client/portfolioStorageKeys";
import {
  isNewsCacheFresh,
  readNewsCache,
  tryRefreshPortfolioNews,
  writeNewsCache,
} from "@/lib/client/portfolioNews";
import {
  __countPerformanceHistoryPostsForTests,
  __resetPortfolioPerformanceHistoryRequestsForTests,
  holdingsFingerprint,
  peekPortfolioPerformanceHistory,
  requestPortfolioPerformanceHistory,
} from "@/lib/client/portfolioPerformanceHistoryRequest";
import { shouldRunExamplePortfolioActivator } from "@/components/examplePortfolio/ExamplePortfolioActivator";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function statusResponse(status: Record<string, unknown>) {
  return {
    ok: true,
    json: async () => ({ success: true, status }),
  };
}

function holding(overrides?: Partial<StoredPortfolioHolding>): StoredPortfolioHolding {
  return {
    id: "vwce",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 2,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
    ...overrides,
  };
}

function newsPayload(): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-08-20T08:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: null,
      sourceCount: 1,
      activeSourceNames: ["EODHD News"],
      unavailableSourceCount: 0,
    },
    sourceErrors: [],
    fetchedAt: "2026-08-20T08:00:00.000Z",
  };
}

describe("perceived speed P1 — dashboard loading gates", () => {
  const dashboard = read("app/dashboard/page.tsx");

  it("1. still blocks on unresolved portfolio identity", () => {
    expect(dashboard).toMatch(
      /if \(!portfolioReady\) \{\s*return <AppPageLoading/,
    );
    expect(dashboard).not.toContain(
      "!portfolioReady || (Boolean(userSub) && !productAccess.accessReady)",
    );
  });

  it("2. renders cached portfolio core while access is pending", () => {
    expect(dashboard).toContain("<DashboardSummary");
    expect(dashboard).toContain("<HoldingsToday");
    expect(dashboard).toContain("dashboard-access-pending");
    const loaderIdx = dashboard.indexOf("if (!portfolioReady)");
    const accessPendingIdx = dashboard.indexOf("dashboard-access-pending");
    expect(loaderIdx).toBeGreaterThan(-1);
    expect(accessPendingIdx).toBeGreaterThan(loaderIdx);
  });

  it("3–5. access-dependent sections wait; no Complete/Free flash", () => {
    const gated = dashboard.slice(dashboard.lastIndexOf("{accessReady ? ("));
    expect(gated).toContain("CompleteTrialIndicator");
    expect(gated).toContain("FreeIntelligenceNote");
    expect(gated).toContain("DashboardPersonalIntelligence");
    expect(gated).toContain("dashboard-access-pending");

    const beforeGated = dashboard.slice(
      0,
      dashboard.lastIndexOf("{accessReady ? ("),
    );
    expect(beforeGated).not.toContain("<CompleteTrialIndicator");
    expect(beforeGated).not.toContain("<FreeIntelligenceNote");
    expect(beforeGated).not.toContain("<DashboardPersonalIntelligence");
    expect(dashboard).toContain("exampleActive && accessReady");
  });
});

describe("perceived speed P1 — shared example status cache", () => {
  beforeEach(() => {
    __resetExamplePortfolioStatusCacheForTests();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetExamplePortfolioStatusCacheForTests();
  });

  it("6. concurrent consumers share one GET", async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetchMock = vi.fn(async () => {
      await gate;
      return statusResponse({ kind: "none", showBanner: false });
    });
    vi.stubGlobal("fetch", fetchMock);

    const first = fetchExamplePortfolioStatus({ userSub: "user-a" });
    const second = fetchExamplePortfolioStatus({ userSub: "user-a" });
    const third = fetchExamplePortfolioStatus({ userSub: "user-a" });

    expect(__countExampleStatusFetchesForTests()).toBe(1);
    release?.();
    await Promise.all([first, second, third]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/example-portfolio/status");
  });

  it("7. remounts reuse the current user-scoped result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => statusResponse({ kind: "converted", showBanner: false })),
    );

    await fetchExamplePortfolioStatus({ userSub: "user-a" });
    expect(__countExampleStatusFetchesForTests()).toBe(1);

    const reused = await fetchExamplePortfolioStatus({ userSub: "user-a" });
    expect(__countExampleStatusFetchesForTests()).toBe(1);
    expect(reused.status?.kind).toBe("converted");
    expect(peekExamplePortfolioStatus("user-a")?.status?.kind).toBe("converted");
  });

  it("8. logout and user change clear shared status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => statusResponse({ kind: "converted", showBanner: false })),
    );

    await fetchExamplePortfolioStatus({ userSub: "user-a" });
    expect(peekExamplePortfolioStatus("user-a")).not.toBeNull();

    await fetchExamplePortfolioStatus({ userSub: null });
    expect(peekExamplePortfolioStatus("user-a")).toBeNull();
    expect(__countExampleStatusFetchesForTests()).toBe(1);

    await fetchExamplePortfolioStatus({ userSub: "user-a" });
    expect(__countExampleStatusFetchesForTests()).toBe(2);

    await fetchExamplePortfolioStatus({ userSub: "user-b" });
    expect(peekExamplePortfolioStatus("user-a")).toBeNull();
    expect(peekExamplePortfolioStatus("user-b")).not.toBeNull();
    expect(__countExampleStatusFetchesForTests()).toBe(3);
  });

  it("9. status-change notification forces revalidation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        statusResponse({ kind: "active", showBanner: true, trialKind: "demo" }),
      )
      .mockResolvedValueOnce(
        statusResponse({ kind: "converted", showBanner: false }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await fetchExamplePortfolioStatus({ userSub: "user-a" });
    expect(peekExamplePortfolioStatus("user-a")?.status?.kind).toBe("active");

    notifyExampleStatusChanged();
    await vi.waitFor(() => {
      expect(peekExamplePortfolioStatus("user-a")?.status?.kind).toBe(
        "converted",
      );
    });
    expect(__countExampleStatusFetchesForTests()).toBe(2);
  });

  it("does not persist entitlement status in localStorage", () => {
    const cache = read("lib/client/examplePortfolioStatusCache.ts");
    const accessHook = read("lib/client/useProductAccess.ts");
    const exampleHook = read("lib/client/useExampleActiveStatus.ts");
    expect(cache).not.toMatch(/localStorage\.(get|set|remove)Item/);
    expect(accessHook).not.toMatch(/localStorage\.(get|set|remove)Item/);
    expect(exampleHook).not.toMatch(/localStorage\.(get|set|remove)Item/);
  });

  it("keeps last-known access when a later status fetch fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        statusResponse({ kind: "converted", showBanner: false }),
      )
      .mockRejectedValueOnce(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    await fetchExamplePortfolioStatus({ userSub: "user-a" });
    const failed = await fetchExamplePortfolioStatus({
      userSub: "user-a",
      force: true,
    });

    expect(failed.success).toBe(true);
    expect(failed.status?.kind).toBe("converted");
    expect(productAccessFromStatusPayload(failed).tier).toBe("complete");
    expect(peekExamplePortfolioStatus("user-a")?.status?.kind).toBe("converted");
  });
});

describe("perceived speed P1 — activator and public routes", () => {
  it("10. Demo/personal activation callbacks still run", () => {
    const activator = read(
      "components/examplePortfolio/ExamplePortfolioActivator.tsx",
    );
    const callback = read("app/auth/callback/route.ts");
    const home = read("app/page.tsx");

    expect(activator).toContain("/api/example-portfolio/activate");
    expect(activator).toContain("notifyExampleStatusChanged");
    expect(callback).toContain("activateExamplePortfolioForUser");
    expect(callback).toContain("forceFromCallback: true");
    expect(home).toContain("redirect(`/auth/callback?${forward.toString()}`)");
  });

  it("11. public homepage/login skip example status/activation", () => {
    expect(shouldRunExamplePortfolioActivator("/", false)).toBe(false);
    expect(shouldRunExamplePortfolioActivator("/", true)).toBe(false);
    expect(shouldRunExamplePortfolioActivator("/login", true)).toBe(false);
    expect(shouldRunExamplePortfolioActivator("/signup", true)).toBe(false);
    expect(shouldRunExamplePortfolioActivator("/dashboard", false)).toBe(false);
    expect(shouldRunExamplePortfolioActivator("/dashboard", true)).toBe(true);

    const activator = read(
      "components/examplePortfolio/ExamplePortfolioActivator.tsx",
    );
    expect(activator).toContain("isMarketingPath(pathname)");
    expect(activator.indexOf("isMarketingPath(pathname)")).toBeLessThan(
      activator.indexOf("supabase.auth.getUser()"),
    );

    const banner = read(
      "components/examplePortfolio/ExamplePortfolioBanner.tsx",
    );
    expect(banner).toContain("if (!userSub)");
  });
});

describe("perceived speed P1 — history and news last-known content", () => {
  beforeEach(() => {
    __resetPortfolioPerformanceHistoryRequestsForTests();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetPortfolioPerformanceHistoryRequestsForTests();
    localStorage.clear();
  });

  it("12. history and news keep cached content visible during refresh", () => {
    const historyHook = read("lib/client/usePortfolioPerformanceHistory.ts");
    const historyPage = read(
      "components/portfolioHistory/PortfolioHistoryPage.tsx",
    );
    const newsHook = read("lib/client/usePortfolioNews.ts");
    const newsHub = read("components/news/NewsHubContent.tsx");

    expect(historyHook).toContain("peekPortfolioPerformanceHistory");
    expect(historyHook).toContain("if (!dataRef.current && !cached)");
    expect(historyPage).toContain("history.isLoading && !history.data");
    expect(historyPage).toContain("aria-busy={history.isLoading || undefined}");
    expect(newsHook).toContain("hasCachedContent");
    expect(newsHook).toContain("readNewsCache(userSub)");
    expect(newsHub).toContain("isRefreshing && !hasBriefingContent");
    expect(newsHub).toContain("aria-busy={isRefreshing || undefined}");
  });

  it("13. history and news cache never cross user or holdings identity", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          period: "1Y",
          investmentReturnPercent: 1.2,
          startingValue: 100,
          endingValue: 101.2,
          chartPoints: [{ date: "2026-01-01", value: 100 }],
          dataAvailability: "full",
          coveredHoldingCount: 1,
          skippedHoldingCount: 0,
        }),
      })),
    );

    await requestPortfolioPerformanceHistory({
      userSub: "user-a",
      period: "1Y",
      holdings: [holding()],
    });

    expect(
      peekPortfolioPerformanceHistory(
        "user-a",
        "1Y",
        holdingsFingerprint([holding()]),
      ),
    ).not.toBeNull();
    expect(
      peekPortfolioPerformanceHistory(
        "user-b",
        "1Y",
        holdingsFingerprint([holding()]),
      ),
    ).toBeNull();
    expect(
      peekPortfolioPerformanceHistory(
        "user-a",
        "1Y",
        holdingsFingerprint([holding({ quantity: 9 })]),
      ),
    ).toBeNull();
    expect(__countPerformanceHistoryPostsForTests()).toBe(1);

    writeNewsCache("user-a", newsPayload());
    expect(readNewsCache("user-a")?.response.success).toBe(true);
    expect(readNewsCache("user-b")).toBeNull();
    expect(newsCacheKey("user-a")).not.toBe(newsCacheKey("user-b"));

    const newsHook = read("lib/client/usePortfolioNews.ts");
    const historyHook = read("lib/client/usePortfolioPerformanceHistory.ts");
    expect(newsHook).toContain("scopedUserSub !== userSub");
    expect(historyHook).toContain("scopedIdentity !== identityKey");
  });

  it("14. refresh failure retains last-known-good content", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            period: "1Y",
            investmentReturnPercent: 1.2,
            startingValue: 100,
            endingValue: 101.2,
            chartPoints: [{ date: "2026-01-01", value: 100 }],
            dataAvailability: "full",
            coveredHoldingCount: 1,
            skippedHoldingCount: 0,
          }),
        })
        .mockRejectedValueOnce(new Error("history down")),
    );

    await requestPortfolioPerformanceHistory({
      userSub: "user-a",
      period: "1Y",
      holdings: [holding()],
    });
    const failed = await requestPortfolioPerformanceHistory({
      userSub: "user-a",
      period: "1Y",
      holdings: [holding({ id: "other", symbol: "IWDA", providerSymbol: "IWDA.XETRA" })],
    });
    expect(failed.ok).toBe(false);
    expect(
      peekPortfolioPerformanceHistory(
        "user-a",
        "1Y",
        holdingsFingerprint([holding()]),
      )?.endingValue,
    ).toBe(101.2);

    writeNewsCache("user-a", {
      ...newsPayload(),
      fetchedAt: "2020-01-01T00:00:00.000Z",
    });
    localStorage.setItem(
      newsCacheKey("user-a"),
      JSON.stringify({
        response: newsPayload(),
        cachedAt: "2020-01-01T00:00:00.000Z",
      }),
    );
    expect(isNewsCacheFresh("2020-01-01T00:00:00.000Z")).toBe(false);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("news down")),
    );
    const news = await tryRefreshPortfolioNews("user-a", [holding()]);
    expect(news.fromCache).toBe(true);
    expect(news.isStale).toBe(true);
    expect(news.response.success).toBe(true);

    const historyHook = read("lib/client/usePortfolioPerformanceHistory.ts");
    const newsHook = read("lib/client/usePortfolioNews.ts");
    const historyPage = read(
      "components/portfolioHistory/PortfolioHistoryPage.tsx",
    );
    expect(historyHook).toContain("setError(result.error)");
    expect(newsHook).toContain("fallback?.response ?? EMPTY_NEWS_RESPONSE");
    expect(historyPage).toContain("history.error");
    expect(historyPage).toContain('role="alert"');
  });
});
