import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  activitySourceLabel,
  activityTypeLabel,
  buildPortfolioHistoryExportFilename,
  buildPortfolioHistoryWorkbook,
  sanitizeExcelCellValue,
} from "@/lib/client/portfolioHistoryExport";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";

function entry(
  overrides: Partial<PortfolioContributionEntry>,
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
  totalContributed: 5000,
  totalWithdrawn: 500,
  netContributed: 4500,
  currentValue: 5200,
  valueAboveContributions: 700,
  valueAboveContributionsPercent: 15.555,
  contributionCount: 2,
  withdrawalCount: 1,
  hasContributionData: true,
};

describe("portfolioHistoryExport", () => {
  it("labels opening balance, withdrawal, and imported contributions", () => {
    expect(
      activityTypeLabel(entry({ source: "opening_balance" })),
    ).toBe("Opening contribution");
    expect(
      activityTypeLabel(entry({ entryType: "withdrawal", source: "manual" })),
    ).toBe("Withdrawal");
    expect(activityTypeLabel(entry({ source: "import" }))).toBe(
      "Contribution (imported)",
    );
    expect(activitySourceLabel(entry({ source: "opening_balance" }))).toBe(
      "Opening balance",
    );
  });

  it("builds a polished workbook with destination Activity columns", () => {
    const workbook = buildPortfolioHistoryWorkbook({
      summary,
      entries: [
        entry({
          id: "a",
          source: "opening_balance",
          entryDate: "2026-01-01",
          baseAmount: 4000,
          amount: 4000,
          note: "Start",
          destinationType: "cash",
        }),
        entry({
          id: "b",
          entryDate: "2026-02-01",
          baseAmount: 1502.53,
          amount: 1502.53,
          destinationType: "holding",
          destinationHoldingId: "h1",
          destinationHoldingSymbol: "VWCE",
          destinationQuantity: 12.4,
          destinationPricePerUnit: 120.97,
          destinationFee: 2.5,
        }),
        entry({
          id: "c",
          entryType: "withdrawal",
          entryDate: "2026-02-01",
          baseAmount: 500,
          amount: 500,
        }),
      ],
      holdings: [
        {
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          assetType: "investment",
          quantity: 10,
          marketValue: 1200,
          weightPercent: 23.1,
        },
      ],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-04T12:00:00.000Z"),
    });

    expect(workbook.SheetNames).toEqual([
      "Overview",
      "Activity",
      "Current Holdings",
      "Notes",
    ]);

    const activity = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.Activity,
    );
    expect(activity).toHaveLength(3);
    expect(activity[0]?.["Destination type"]).toBe("Cash");
    expect(activity[1]?.["Destination type"]).toBe("Holding");
    expect(activity[1]?.Holding).toBe("VWCE");
    expect(activity[1]?.Quantity).toBe(12.4);
    expect(activity[1]?.["Price per unit"]).toBe(120.97);
    expect(activity[1]?.Fee).toBe(2.5);
  });

  it("sanitizes formula-like Excel cell values", () => {
    expect(sanitizeExcelCellValue("=1+1")).toBe("'=1+1");
    expect(sanitizeExcelCellValue("+cmd")).toBe("'+cmd");
    expect(sanitizeExcelCellValue("VWCE")).toBe("VWCE");
    expect(sanitizeExcelCellValue(12.4)).toBe(12.4);
  });

  it("names the export file with an ISO date stamp", () => {
    expect(
      buildPortfolioHistoryExportFilename(new Date("2026-08-04T12:00:00.000Z")),
    ).toBe("tobailey-portfolio-history-2026-08-04.xlsx");
  });
});
