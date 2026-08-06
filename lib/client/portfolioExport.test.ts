import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  buildPortfolioExportFilename,
  buildPortfolioWorkbook,
  canExportPortfolio,
  PORTFOLIO_EXPORT_VERSION,
} from "@/lib/client/portfolioExport";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

function entry(
  overrides: Partial<PortfolioContributionEntry> = {},
): PortfolioContributionEntry {
  return {
    id: "1",
    portfolioId: "p1",
    userId: "u1",
    entryType: "contribution",
    amount: 1000,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: 1000,
    fxRateUsed: 1,
    entryDate: "2026-03-01",
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
    ...overrides,
  };
}

const summary: ContributionSummary = {
  totalContributed: 1000,
  totalWithdrawn: 0,
  netContributed: 1000,
  currentValue: 1200,
  valueAboveContributions: 200,
  valueAboveContributionsPercent: 20,
  contributionCount: 1,
  withdrawalCount: 0,
  hasContributionData: true,
};

describe("portfolioExport", () => {
  it("names the workbook Tobailey_Portfolio_YYYY-MM-DD.xlsx", () => {
    expect(
      buildPortfolioExportFilename(new Date("2026-08-06T12:00:00.000Z")),
    ).toBe("Tobailey_Portfolio_2026-08-06.xlsx");
  });

  it("builds one workbook with the core sheets", () => {
    const workbook = buildPortfolioWorkbook({
      summary,
      entries: [entry()],
      holdings: [
        {
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          assetType: "investment",
          quantity: 10,
          marketValue: 1200,
          weightPercent: 100,
        },
      ],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-06T12:00:00.000Z"),
      goals: {
        hasSavedGoal: true,
        goal: {
          targetValue: 100000,
          targetYear: 2035,
          monthlyContribution: 500,
          expectedAnnualReturn: 7,
        },
      },
    });

    expect(workbook.SheetNames).toContain("Dashboard Summary");
    expect(workbook.SheetNames).toContain("Holdings");
    expect(workbook.SheetNames).toContain("Portfolio History");
    expect(workbook.SheetNames).toContain("Contributions");
    expect(workbook.SheetNames).toContain("Goals");
    expect(workbook.SheetNames).not.toContain("Overview");

    const summaryMatrix = XLSX.utils.sheet_to_json<Array<string | number>>(
      workbook.Sheets["Dashboard Summary"],
      { header: 1 },
    );
    expect(summaryMatrix.flat().join(" ")).toContain(PORTFOLIO_EXPORT_VERSION);
  });

  it("allows export with holdings and empty contributions", () => {
    expect(
      canExportPortfolio({
        entries: [],
        holdings: [
          {
            symbol: "VWCE",
            name: "Vanguard",
            assetType: "investment",
            quantity: 1,
            marketValue: 100,
            weightPercent: 100,
          },
        ],
        goals: null,
      }),
    ).toBe(true);

    const workbook = buildPortfolioWorkbook({
      summary: {
        ...summary,
        totalContributed: 0,
        netContributed: 0,
        hasContributionData: false,
        contributionCount: 0,
        valueAboveContributions: null,
        valueAboveContributionsPercent: null,
      },
      entries: [],
      holdings: [
        {
          symbol: "VWCE",
          name: "Vanguard",
          assetType: "investment",
          quantity: 1,
          marketValue: 100,
          weightPercent: 100,
        },
      ],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
    });

    expect(workbook.SheetNames).toContain("Holdings");
    expect(workbook.SheetNames).toContain("Contributions");
  });

  it("omits Goals sheet when unavailable", () => {
    const workbook = buildPortfolioWorkbook({
      summary,
      entries: [entry()],
      holdings: [],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      goals: null,
    });
    expect(workbook.SheetNames).not.toContain("Goals");
  });
});
