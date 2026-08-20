import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildPortfolioExposureAllocation,
  classifyHoldingExposure,
  EQUITY_EXPOSURE_GROUP_IDS,
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_IDS,
  EXPOSURE_GROUP_LABELS,
  PRECIOUS_METALS_EXPOSURE_GROUP_ID,
} from "@/lib/services/classification";
import { DIVERSIFICATION_COUNTABLE_GROUPS } from "@/lib/services/portfolio/healthScore/config";
import {
  isHoldingAffectedByShock,
  SCENARIO_DEFINITIONS,
  selectAffectedHoldings,
} from "@/lib/services/scenarioEngine";
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
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("precious metals canonical taxonomy", () => {
  it("adds Precious metals as a canonical exposure group, not an equity shock sleeve", () => {
    expect(EXPOSURE_GROUP_IDS).toContain("precious_metals");
    expect(EXPOSURE_GROUP_LABELS.precious_metals).toBe("Precious metals");
    expect(PRECIOUS_METALS_EXPOSURE_GROUP_ID).toBe("precious_metals");
    expect(EQUITY_EXPOSURE_GROUP_IDS).not.toContain("precious_metals");
    expect(DIVERSIFICATION_COUNTABLE_GROUPS).toContain("precious_metals");
    expect(DIVERSIFICATION_COUNTABLE_GROUPS).not.toContain("other_unclassified");
    expect(EXPOSURE_GROUP_BAR_CLASS.precious_metals).toBe("bg-yellow-700");
    expect(EXPOSURE_GROUP_BAR_CLASS.precious_metals).not.toBe(
      EXPOSURE_GROUP_BAR_CLASS.industrials_resources,
    );
    expect(EXPOSURE_GROUP_BAR_CLASS.precious_metals).not.toBe(
      EXPOSURE_GROUP_BAR_CLASS.fixed_income,
    );
    expect(EXPOSURE_GROUP_BAR_CLASS.precious_metals).not.toBe(
      EXPOSURE_GROUP_BAR_CLASS.cash,
    );
    expect(EXPOSURE_GROUP_BAR_CLASS.precious_metals).not.toBe(
      EXPOSURE_GROUP_BAR_CLASS.crypto,
    );
  });

  it("classifies PPFB-style physical gold via verified research metadata", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "PPFB",
        name: "WisdomTree Physical Gold",
        providerSymbol: "PPFB.XETRA",
      }),
    );
    expect(result.normalizedGroupId).toBe("precious_metals");
    expect(result.displayLabel).toBe("Precious metals");
    expect(result.classificationSource).toBe("research_profile");
    expect(result.confidence).toBe("high");
  });

  it("classifies IGLN-style physical gold via the tight vehicle heuristic", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "IGLN",
        name: "iShares Physical Gold ETC",
        providerInstrumentType: "ETC",
      }),
    );
    expect(result.normalizedGroupId).toBe("precious_metals");
    expect(result.classificationSource).toBe("name_heuristic");
  });

  it("classifies physical silver bullion vehicles as Precious metals", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "PSLV",
        name: "Physical Silver ETC",
        providerInstrumentType: "ETC",
      }),
    );
    expect(result.normalizedGroupId).toBe("precious_metals");
  });

  it("does not classify a verified gold/copper miners ETF as Precious metals", () => {
    const miners = classifyHoldingExposure(
      holding({
        symbol: "4COP",
        name: "WisdomTree Copper Miners UCITS ETF",
        providerSymbol: "4COP.XETRA",
        providerInstrumentType: "ETF",
      }),
    );
    expect(miners.normalizedGroupId).toBe("industrials_resources");
    expect(miners.normalizedGroupId).not.toBe("precious_metals");

    const goldMinersEtf = classifyHoldingExposure(
      holding({
        symbol: "GDX",
        name: "VanEck Gold Miners ETF",
        providerInstrumentType: "ETF",
      }),
    );
    expect(goldMinersEtf.normalizedGroupId).not.toBe("precious_metals");
  });

  it("does not classify a gold mining company as Precious metals", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "GOLD",
        name: "Barrick Gold Corporation",
        providerInstrumentType: "Common Stock",
      }),
    );
    expect(result.normalizedGroupId).not.toBe("precious_metals");
    expect(result.normalizedGroupId).toBe("other_unclassified");
  });

  it("fails closed on ambiguous Gold securities", () => {
    expect(
      classifyHoldingExposure(holding({ symbol: "GLD", name: "Gold" }))
        .normalizedGroupId,
    ).toBe("other_unclassified");
    expect(
      classifyHoldingExposure(
        holding({ symbol: "GLDX", name: "Gold ETF", providerInstrumentType: "ETF" }),
      ).normalizedGroupId,
    ).toBe("other_unclassified");
    expect(
      classifyHoldingExposure(
        holding({
          symbol: "PPFB",
          name: "WisdomTree Physical Gold",
        }),
      ).normalizedGroupId,
    ).toBe("other_unclassified");
  });

  it("excludes Precious metals from equity shocks and does not add gold/silver scenarios", () => {
    const ppf = holding({
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      providerSymbol: "PPFB.XETRA",
      quantity: 3,
      currentPrice: 100,
    });
    const vwce = holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World",
      providerSymbol: "VWCE.XETRA",
      quantity: 7,
      currentPrice: 100,
    });

    expect(isHoldingAffectedByShock(ppf, "equity_classified")).toBe(false);
    const affected = selectAffectedHoldings([ppf, vwce], "equity_classified");
    expect(affected.map((row) => row.holding.symbol)).toEqual(["VWCE"]);

    expect(
      SCENARIO_DEFINITIONS.some((row) =>
        /gold|silver|precious/i.test(`${row.id} ${row.name}`),
      ),
    ).toBe(false);
  });

  it("moves identified bullion out of Unclassified and keeps allocation percentages reconciling", () => {
    const vwce = holding({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 7,
      currentPrice: 100,
    });
    const mystery = holding({
      symbol: "ZZZX",
      name: "Unknown holding",
      quantity: 3,
      currentPrice: 100,
    });
    const ppf = holding({
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      providerSymbol: "PPFB.XETRA",
      quantity: 3,
      currentPrice: 100,
    });

    const before = buildPortfolioExposureAllocation([vwce, mystery]);
    const after = buildPortfolioExposureAllocation([vwce, ppf]);

    expect(
      before.groups.find((group) => group.groupId === "other_unclassified")
        ?.displayPercent,
    ).toBe(30);
    expect(
      after.groups.find((group) => group.groupId === "other_unclassified"),
    ).toBeUndefined();
    const metals = after.groups.find(
      (group) => group.groupId === "precious_metals",
    );
    expect(metals?.displayPercent).toBe(30);
    expect(metals?.holdings.map((row) => row.symbol)).toEqual(["PPFB"]);
    expect(
      after.groups.reduce((sum, group) => sum + group.displayPercent, 0),
    ).toBe(100);
    expect(after.unclassifiedHoldingCount).toBeLessThan(
      before.unclassifiedHoldingCount,
    );
  });

  it("Dashboard and Analysis consume the same canonical allocation groups", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const dashboardCard = read(
      "components/dashboard/DashboardPortfolioExposureCard.tsx",
    );
    const analysis = read("components/analysis/PortfolioExposureSection.tsx");
    const intelligence = read(
      "lib/services/allocationIntelligence/buildAllocationIntelligence.ts",
    );

    expect(dashboard).toContain("buildPortfolioExposureAllocation");
    expect(dashboardCard).toContain("buildAllocationIntelligence");
    expect(dashboardCard).toContain("intelligence.groups");
    expect(dashboardCard).toContain("EXPOSURE_GROUP_BAR_CLASS");
    expect(analysis).toContain("allocation.groups");
    expect(analysis).toContain("EXPOSURE_GROUP_BAR_CLASS");
    expect(intelligence).toContain("allocation.groups");
    expect(dashboardCard).not.toContain('groupId === "precious_metals"');
    expect(analysis).not.toContain('groupId === "precious_metals"');
  });

  it("does not add API, provider, OpenAI, DB, cron, or polling paths", () => {
    const files = [
      "lib/services/classification/classifyHoldingExposure.ts",
      "lib/services/classification/types.ts",
      "lib/services/discover/instrumentResearchMetadata.ts",
      "lib/services/allocationIntelligence/buildAllocationIntelligence.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain("fetch(");
      expect(source).not.toMatch(/openai/i);
      expect(source).not.toContain("executeEodhdApiCall");
      expect(source).not.toContain("createClient");
      expect(source).not.toContain("setInterval(");
      expect(source).not.toContain("cron");
    }
  });
});
