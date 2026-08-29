import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  ALLOCATION_SHEET,
  buildPortfolioExportFilename,
  buildPortfolioWorkbook,
  canExportPortfolio,
  CONTRIBUTIONS_SHEET,
  HOLDINGS_SHEET,
  PORTFOLIO_EXPORT_VERSION,
  PORTFOLIO_SUMMARY_SHEET,
} from "@/lib/client/portfolioExport";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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
    currentPrice: overrides.currentPrice ?? 120,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
  };
}

describe("portfolioExport", () => {
  it("names the workbook Tobailey-Portfolio-YYYY-MM-DD.xlsx", () => {
    expect(
      buildPortfolioExportFilename(new Date("2026-08-06T12:00:00.000Z")),
    ).toBe("Tobailey-Portfolio-2026-08-06.xlsx");
  });

  it("builds one workbook with the supported professional sheets", () => {
    const workbook = buildPortfolioWorkbook({
      entries: [entry()],
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.XETRA",
        }),
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

    expect(workbook.SheetNames).toContain(PORTFOLIO_SUMMARY_SHEET);
    expect(workbook.SheetNames).toContain(HOLDINGS_SHEET);
    expect(workbook.SheetNames).toContain("Portfolio History");
    expect(workbook.SheetNames).toContain(CONTRIBUTIONS_SHEET);
    expect(workbook.SheetNames).toContain(ALLOCATION_SHEET);
    expect(workbook.SheetNames).not.toContain("Goals");
    expect(workbook.SheetNames).not.toContain("Overview");

    const summaryMatrix = XLSX.utils.sheet_to_json<Array<string | number>>(
      workbook.Sheets[PORTFOLIO_SUMMARY_SHEET]!,
      { header: 1 },
    );
    const notesMatrix = XLSX.utils.sheet_to_json<Array<string | number>>(
      workbook.Sheets["Data Notes"]!,
      { header: 1 },
    );
    expect(notesMatrix.flat().join(" ")).toContain(PORTFOLIO_EXPORT_VERSION);
    expect(summaryMatrix.flat().join(" ")).toContain("Goal");
  });

  it("allows export with holdings and empty contributions", () => {
    expect(
      canExportPortfolio({
        entries: [],
        holdings: [
          holding({
            symbol: "VWCE",
            name: "Vanguard",
            quantity: 1,
            currentPrice: 100,
          }),
        ],
        goals: null,
      }),
    ).toBe(true);

    const workbook = buildPortfolioWorkbook({
      entries: [],
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard",
          quantity: 1,
          currentPrice: 100,
        }),
      ],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
    });

    expect(workbook.SheetNames).toContain(HOLDINGS_SHEET);
    expect(workbook.SheetNames).toContain(CONTRIBUTIONS_SHEET);
  });

  it("omits a separate Goals sheet when a goal is saved on Summary instead", () => {
    const workbook = buildPortfolioWorkbook({
      entries: [entry()],
      holdings: [],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      goals: null,
    });
    expect(workbook.SheetNames).not.toContain("Goals");
  });
});
