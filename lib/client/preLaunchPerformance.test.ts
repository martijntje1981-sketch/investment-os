/**
 * Pre-launch performance batch contracts.
 * Source + focused behavioral checks. No new APIs.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("pre-launch performance batch", () => {
  const providers = read("components/providers/AppProviders.tsx");
  const layout = read("app/layout.tsx");
  const hook = read("lib/client/useUserPortfolio.ts");
  const dashboard = read("app/dashboard/page.tsx");
  const liveRefresh = read("lib/client/livePortfolioPriceRefresh.ts");
  const liveHook = read("lib/client/useLivePortfolioPriceRefresh.ts");
  const historyHook = read("lib/client/usePortfolioPerformanceHistory.ts");
  const exportRunner = read("lib/client/runPortfolioExport.ts");
  const historySection = read(
    "components/dashboard/DashboardPortfolioHistorySection.tsx",
  );
  const perspectives = read(
    "components/dashboard/DashboardPerspectivesWidget.tsx",
  );
  const bottomNav = read("components/home/BottomNav.tsx");
  const newsPage = read("app/news/page.tsx");
  const brief = read(
    "lib/services/periodIntelligence/buildPeriodReportBrief.ts",
  );

  it("A/B. one UserPortfolioProvider hydrates; descendants reuse context", () => {
    expect(providers).toContain("UserPortfolioProvider");
    expect(layout).toContain("AppProviders");
    expect(hook).toContain("function useUserPortfolioState()");
    expect(hook).toContain("useUserPortfolio must be used within UserPortfolioProvider");
    expect(dashboard).toContain("useUserPortfolio()");
    expect(bottomNav).toContain("useUserPortfolio()");
    expect(perspectives).toContain("useUserPortfolio()");
    expect(providers).toContain("<UserPortfolioProvider>");
  });

  it("C. logout / missing user clears holdings", () => {
    expect(hook).toContain("if (!userSub)");
    expect(hook).toContain("setHoldings([])");
    expect(hook).toContain("[authReady, hydrateFromRemote, userSub]");
  });

  it("D. cache-first path renders last-known-good then refreshes in background", () => {
    expect(hook).toContain("applyCachedPrices(userSub, localHoldings)");
    expect(hook).toContain("markAppEntryCachedPortfolioReady");
    expect(liveHook).toContain("cacheFirst: true");
    expect(liveRefresh).toContain("cacheFirst");
    expect(liveRefresh).toContain("forceRefresh: !cacheFirst");
  });

  it("E. cache-first does not record a live refresh timestamp", () => {
    expect(liveRefresh).toContain("if (cacheFirst)");
    const cacheFirstBlock = liveRefresh.slice(
      liveRefresh.indexOf("if (cacheFirst) {"),
    );
    expect(cacheFirstBlock).not.toMatch(
      /if \(cacheFirst\) \{[\s\S]{0,1800}recordLastLivePriceRefreshAt/,
    );
  });

  it("F/G. live refresh still applies quotes; failures keep last-known-good", () => {
    expect(liveRefresh).toContain("applyPricesToHoldings");
    expect(liveRefresh).toContain("applyCachedPrices(userSub, preparedHoldings)");
    expect(liveRefresh).toContain(
      "Live prices could not be refreshed. Your last available prices remain visible.",
    );
  });

  it("H/I. Dashboard defers EOD history until after first paint", () => {
    expect(dashboard).toContain("useAfterFirstPaint");
    expect(dashboard).toContain("historyEnabled");
    expect(dashboard).toContain("historyEnabled && scopedHoldings.length > 0 && hasSavedGoal");
    expect(historyHook).toContain("enabled = true");
    expect(historyHook).toContain("if (!enabled || period === \"1D\")");
    expect(dashboard).toContain("usePortfolioPerformanceHistory");
  });

  it("J. Dashboard entry does not statically import xlsx-js-style", () => {
    expect(dashboard).not.toContain("xlsx-js-style");
    expect(historySection).not.toContain("xlsx-js-style");
    expect(exportRunner).not.toContain("xlsx-js-style");
    expect(exportRunner).toMatch(
      /await import\(\s*"@\/lib\/client\/portfolioExport"/,
    );
  });

  it("K. Excel export still uses the canonical workbook builder", () => {
    expect(exportRunner).toContain("downloadPortfolioWorkbook");
    expect(exportRunner).toContain("canExportPortfolio");
    expect(historySection).toContain("runPortfolioExport");
  });

  it("L. duplicate page-level BottomNav is removed; layout keeps the one nav", () => {
    expect(layout).toContain("<BottomNav />");
    expect(dashboard).not.toContain("BottomNavigation");
    expect(newsPage).not.toContain("BottomNavigation");
    expect(newsPage).not.toContain("BottomNav");
  });

  it("M. Demo / access wiring is unchanged", () => {
    expect(dashboard).toContain("useExampleActiveStatus");
    expect(dashboard).toContain("useProductAccess");
    expect(dashboard).toContain("intelligenceDepth");
  });

  it("N. PDF Goal/funding availability helper remains", () => {
    expect(brief).toContain("resolvePortfolioTotalValueAvailability");
    expect(brief).toContain("resolvePeriodReportCurrentPortfolioContext");
  });

  it("O. no new API/provider/DB/cron/polling path", () => {
    const files = [
      hook,
      liveRefresh,
      liveHook,
      exportRunner,
      dashboard,
      providers,
    ];
    for (const source of files) {
      expect(source).not.toMatch(
        /openai|setInterval|new cron|puppeteer|playwright|createAdminClient|redis/i,
      );
    }
    expect(liveRefresh).toContain('fetch("/api/prices"');
    expect(historyHook).toContain('fetch("/api/portfolio/performance"');
  });
});
