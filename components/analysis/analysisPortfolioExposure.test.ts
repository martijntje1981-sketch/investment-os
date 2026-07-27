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
  it("places summary cards in one responsive grid with conversion details below", () => {
    const gridStart = analysisPageSource.indexOf(
      'className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]"',
    );
    const totalIdx = analysisPageSource.indexOf('label="Total portfolio value"');
    const compositionIdx = analysisPageSource.indexOf("Portfolio composition");
    const investmentIdx = analysisPageSource.indexOf(
      'label="Investment holdings"',
    );
    const cashIdx = analysisPageSource.indexOf('label="Cash currencies"');
    const largestIdx = analysisPageSource.indexOf('label="Largest position"');
    const conversionIdx = analysisPageSource.indexOf(
      "<ConversionDetailsDisclosure compactTrigger />",
    );
    const exposureIdx = analysisPageSource.indexOf(
      "<PortfolioExposureSection",
    );
    const performanceIdx = analysisPageSource.indexOf(
      "<PortfolioPerformanceSection",
    );

    expect(gridStart).toBeGreaterThan(-1);
    expect(totalIdx).toBeGreaterThan(gridStart);
    expect(compositionIdx).toBeGreaterThan(totalIdx);
    expect(investmentIdx).toBeGreaterThan(compositionIdx);
    expect(cashIdx).toBeGreaterThan(investmentIdx);
    expect(largestIdx).toBeGreaterThan(cashIdx);
    expect(conversionIdx).toBeGreaterThan(largestIdx);
    expect(exposureIdx).toBeGreaterThan(conversionIdx);
    expect(performanceIdx).toBeGreaterThan(exposureIdx);

    const gridSlice = analysisPageSource.slice(gridStart, conversionIdx);
    expect(gridSlice).not.toContain("ConversionDetailsDisclosure");
    expect(analysisPageSource).toMatch(
      /className="mt-3"[\s\S]*?<ConversionDetailsDisclosure compactTrigger \/>/,
    );
  });

  it("renders the portfolio-exposure section with shared allocation wiring", () => {
    expect(analysisPageSource).toContain("buildPortfolioExposureAllocation");
    expect(analysisPageSource).toContain(
      "<PortfolioExposureSection allocation={exposureAllocation}",
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
    expect(exposureSectionSource).toContain("formatEur(group.value)");
    expect(exposureSectionSource).toContain("coverageLabel");
    expect(exposureSectionSource).not.toContain("classifyHoldingExposure");
    expect(exposureSectionSource).not.toContain(
      "buildPortfolioExposureAllocation",
    );
  });

  it("keeps Dashboard Open Analysis pointed at the Analysis exposure anchor", () => {
    expect(dashboardCardSource).toContain("#portfolio-exposure");
    expect(dashboardCardSource).toMatch(
      /ANALYSIS_PATH.*#portfolio-exposure|#portfolio-exposure.*ANALYSIS_PATH/,
    );
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
    expect(analysisPageSource).toContain("Total portfolio value");
    expect(analysisPageSource).toContain("Investment holdings");
    expect(analysisPageSource).toContain("Cash currencies");
    expect(analysisPageSource).toContain("Largest position");
    expect(analysisPageSource).toContain("formatEur(analysis.totalValue)");
    expect(analysisPageSource).toContain("analysis.investmentCount");
    expect(analysisPageSource).toContain("analysis.cashCurrencyCount");
    expect(analysisPageSource).toContain("analysis.largestPosition");
    expect(analysisPageSource).toContain(
      "<ConversionDetailsDisclosure compactTrigger />",
    );

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
