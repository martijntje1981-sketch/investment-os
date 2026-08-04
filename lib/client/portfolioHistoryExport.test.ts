import * as XLSX from "xlsx";
import { describe, expect, it } from "vitest";

import {
  activitySourceLabel,
  activityTypeLabel,
  buildPortfolioHistoryExportFilename,
  buildPortfolioHistoryWorkbook,
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

  it("builds a polished workbook with the four required sheets", () => {
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
        }),
        entry({
          id: "b",
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
        {
          symbol: "CASH",
          name: "EUR Cash",
          assetType: "cash",
          quantity: 200,
          marketValue: 200,
          weightPercent: 3.8,
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

    const overview = XLSX.utils.sheet_to_json<string[]>(
      workbook.Sheets.Overview,
      { header: 1 },
    );
    expect(overview[0]?.[0]).toBe("Portfolio History");
    expect(overview.some((row) => row[0] === "Total contributed")).toBe(true);
    expect(overview.some((row) => row[0] === "Net contributed")).toBe(true);
    expect(overview.some((row) => row[0] === "Current portfolio value")).toBe(
      true,
    );

    const activity = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets.Activity,
    );
    expect(activity).toHaveLength(2);
    expect(activity[0]?.Type).toBe("Opening contribution");
    expect(activity[1]?.Type).toBe("Withdrawal");

    const holdings = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets["Current Holdings"],
    );
    expect(holdings).toHaveLength(2);
    expect(holdings[0]?.Symbol).toBe("VWCE");

    const notes = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Notes, {
      header: 1,
    });
    const noteText = notes.map((row) => row[0]).join(" ");
    expect(noteText).toContain("Not included in v1");
    expect(noteText).toContain("Buys, sells, dividends");
  });

  it("names the export file with an ISO date stamp", () => {
    expect(
      buildPortfolioHistoryExportFilename(new Date("2026-08-04T12:00:00.000Z")),
    ).toBe("tobailey-portfolio-history-2026-08-04.xlsx");
  });
});
