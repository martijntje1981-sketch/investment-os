import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

const analysisPageSource = readFileSync(
  path.resolve(process.cwd(), "components/analysis/PortfolioAnalysisPage.tsx"),
  "utf8",
);
const analysisDetailSource = readFileSync(
  path.resolve(process.cwd(), "components/analysis/glance/AnalysisDetailView.tsx"),
  "utf8",
);
const exposureSectionSource = readFileSync(
  path.resolve(
    process.cwd(),
    "components/analysis/PortfolioExposureSection.tsx",
  ),
  "utf8",
);
const dashboardCardSource = readFileSync(
  path.resolve(
    process.cwd(),
    "components/dashboard/DashboardPortfolioExposureCard.tsx",
  ),
  "utf8",
);

describe("Analysis portfolio exposure section", () => {
  it("keeps Performance, Top performers, Exposure, and Scenario stress reachable once each", () => {
    const performanceIdx = analysisDetailSource.indexOf(
      "<PortfolioPerformanceSection",
    );
    const topPerformersIdx = analysisDetailSource.indexOf(
      "<TopPerformersByCategorySection",
    );
    const exposureIdx = analysisDetailSource.indexOf("<PortfolioExposureSection");
    const scenarioIdx = analysisDetailSource.indexOf("<ScenarioStressSection");

    expect(performanceIdx).toBeGreaterThan(-1);
    expect(topPerformersIdx).toBeGreaterThan(performanceIdx);
    expect(exposureIdx).toBeGreaterThan(-1);
    expect(scenarioIdx).toBeGreaterThan(-1);

    expect(analysisDetailSource).not.toContain('label="Total portfolio value"');
    expect(analysisDetailSource).not.toContain("Portfolio composition");
    expect(analysisDetailSource).not.toContain(
      'className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]"',
    );

    const performanceCount = (
      analysisDetailSource.match(/<PortfolioPerformanceSection/g) ?? []
    ).length;
    const topPerformersCount = (
      analysisDetailSource.match(/<TopPerformersByCategorySection/g) ?? []
    ).length;
    const exposureCount = (
      analysisDetailSource.match(/<PortfolioExposureSection/g) ?? []
    ).length;
    const scenarioCount = (
      analysisDetailSource.match(/<ScenarioStressSection/g) ?? []
    ).length;
    expect(performanceCount).toBe(1);
    expect(topPerformersCount).toBe(1);
    expect(exposureCount).toBe(1);
    expect(scenarioCount).toBe(1);

    expect(analysisDetailSource).toContain("<ScenarioStressSection");
    expect(analysisDetailSource).toContain("goal={goal}");
    expect(analysisDetailSource).toContain("hasSavedGoal={hasSavedGoal}");
    expect(analysisPageSource).toContain("useUserGoal");
    expect(analysisDetailSource).toContain("compositionMeta={{");
  });

  it("renders the portfolio-exposure section with shared allocation wiring", () => {
    expect(analysisPageSource).toContain("buildPortfolioExposureAllocation");
    expect(analysisDetailSource).toContain("<PortfolioExposureSection");
    expect(analysisDetailSource).toContain("allocation={exposureAllocation}");
    expect(analysisDetailSource).toContain(
      'showSubgroups={productAccess.intelligenceDepth === "complete"}',
    );
    expect(exposureSectionSource).toContain('id="portfolio-exposure"');
    expect(exposureSectionSource).toContain("scroll-mt-24");
    expect(exposureSectionSource).toContain("Portfolio exposure");
    expect(exposureSectionSource).toContain(
      "How your portfolio is distributed across verified exposure categories.",
    );
    expect(exposureSectionSource).toContain("EXPOSURE_GROUP_BAR_CLASS");
    expect(exposureSectionSource).toContain("EXPOSURE_GROUP_DOT_CLASS");
    expect(exposureSectionSource).toContain("group.displayPercent");
    expect(exposureSectionSource).toContain("formatAllocationPercent");
    expect(exposureSectionSource).toContain("group.rawPercent");
    expect(exposureSectionSource).toContain("formatEur(group.value)");
    expect(exposureSectionSource).toContain("coverageLabel");
    expect(exposureSectionSource).toContain("buildFixedIncomeRateEducation");
    expect(exposureSectionSource).toContain(
      'data-testid="fixed-income-rate-education"',
    );
    expect(exposureSectionSource).not.toContain("classifyHoldingExposure");
    expect(exposureSectionSource).not.toContain(
      "buildPortfolioExposureAllocation",
    );
  });

  it("keeps Dashboard allocation CTA pointed at the Analysis exposure anchor", () => {
    expect(dashboardCardSource).toContain(
      "DASHBOARD_DEEP_LINKS.portfolioExposure",
    );
    expect(dashboardCardSource).toContain("View allocation");
  });

  it("shows contributing holdings with accessible Show all / Show less", () => {
    expect(exposureSectionSource).toContain("Show all");
    expect(exposureSectionSource).toContain("Show less");
    expect(exposureSectionSource).toContain("aria-expanded");
    expect(exposureSectionSource).toContain("aria-controls");
    expect(exposureSectionSource).toContain("holding.symbol");
    expect(exposureSectionSource).toContain("holding.name");
    expect(exposureSectionSource).not.toContain("Dialog");
    expect(exposureSectionSource).not.toContain("modal");
  });

  it("does not render an empty allocation bar when there is no valued exposure", () => {
    expect(exposureSectionSource).toContain("!allocation.hasAnyValue");
    expect(exposureSectionSource).toContain(
      "Add valued holdings to see portfolio exposure.",
    );
    expect(exposureSectionSource).toContain(
      "Exposure requires available holding values.",
    );

    const empty = buildPortfolioExposureAllocation([]);
    expect(empty.hasAnyValue).toBe(false);
    expect(empty.groups).toEqual([]);

    const unvalued = buildPortfolioExposureAllocation([
      holding({
        symbol: "BAD",
        currentPrice: 0,
        purchasePrice: 0,
        quantity: 1,
      }),
    ]);
    expect(unvalued.hasAnyValue).toBe(false);
    expect(unvalued.groups).toEqual([]);
    expect(unvalued.coverageLabel).toMatch(/requires available/i);
  });

  it("keeps category percentages and holdings aligned with the shared allocator", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 200,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 100,
        currentPrice: 1,
      }),
      holding({
        symbol: "MISS",
        currentPrice: 0,
        purchasePrice: 0,
        quantity: 1,
      }),
    ]);

    expect(
      allocation.groups.reduce((sum, group) => sum + group.displayPercent, 0),
    ).toBe(100);
    expect(allocation.excludedHoldingCount).toBe(1);
    expect(allocation.coverageLabel).toMatch(/excluded/i);

    const diversified = allocation.groups.find(
      (group) => group.groupId === "diversified_equity",
    );
    expect(diversified?.displayPercent).toBe(77);
    expect(diversified?.holdings.map((row) => row.symbol)).toEqual(["VWCE"]);
    expect(diversified?.value).toBe(1000);

    const cash = allocation.groups.find((group) => group.groupId === "cash");
    expect(cash?.holdings[0]?.name).toBe("Euro cash");
  });

  it("preserves summary values and conversion-details expand behavior", () => {
    const performanceSource = readFileSync(
      path.resolve(
        process.cwd(),
        "components/analysis/performance/PortfolioPerformanceSection.tsx",
      ),
      "utf8",
    );

    expect(performanceSource).toContain("Total portfolio value");
    expect(performanceSource).toContain("Holdings ·");
    expect(performanceSource).toContain("Cash currencies ·");
    expect(performanceSource).toContain("Largest ·");
    expect(performanceSource).toContain(
      '<ConversionDetailsDisclosure compactTrigger tone="dark" />',
    );

    expect(analysisDetailSource).toContain("analysis.investmentCount");
    expect(analysisDetailSource).toContain("analysis.cashCurrencyCount");
    expect(analysisDetailSource).toContain("analysis.largestPosition");
    expect(analysisDetailSource).toContain("compositionMeta={{");

    const conversionSource = readFileSync(
      path.resolve(
        process.cwd(),
        "components/currency/ConversionDetailsDisclosure.tsx",
      ),
      "utf8",
    );
    expect(conversionSource).toContain("aria-expanded");
    expect(conversionSource).toContain("View conversion details");
    expect(conversionSource).toContain("Hide conversion details");
  });
});
