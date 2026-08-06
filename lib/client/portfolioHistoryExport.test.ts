import { readFileSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  activitySourceLabel,
  activityTypeLabel,
  buildPortfolioHistoryExportFilename,
  buildPortfolioHistoryWorkbook,
  downloadPortfolioHistoryWorkbook,
  PORTFOLIO_HISTORY_EMPTY_MESSAGE,
  PORTFOLIO_HISTORY_EXPORT_HEADERS,
  PORTFOLIO_HISTORY_SHEET_NAME,
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

const sampleInput = {
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
      createdAt: "2026-01-01T10:00:00.000Z",
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
      createdAt: "2026-02-01T11:00:00.000Z",
    }),
    entry({
      id: "c",
      entryType: "withdrawal",
      entryDate: "2026-02-01",
      baseAmount: 500,
      amount: 500,
      createdAt: "2026-02-01T12:00:00.000Z",
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
  portfolioBaseCurrency: "EUR" as const,
  portfolioValueAvailable: true,
  exportedAt: new Date("2026-08-04T12:00:00.000Z"),
};

describe("portfolioHistoryExport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("builds Portfolio History sheet with expected headers and values", () => {
    const workbook = buildPortfolioHistoryWorkbook(sampleInput);

    expect(workbook.SheetNames).toContain(PORTFOLIO_HISTORY_SHEET_NAME);
    expect(workbook.SheetNames).toEqual([
      "Overview",
      "Portfolio History",
      "Current Holdings",
      "Notes",
    ]);

    const historyMatrix = XLSX.utils.sheet_to_json<Array<string | number>>(
      workbook.Sheets[PORTFOLIO_HISTORY_SHEET_NAME],
      { header: 1 },
    );
    expect(historyMatrix[0]).toEqual([...PORTFOLIO_HISTORY_EXPORT_HEADERS]);

    const history = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[PORTFOLIO_HISTORY_SHEET_NAME],
      { defval: "" },
    );
    expect(history).toHaveLength(3);
    expect(history[0]?.Date).toBe("2026-01-01");
    expect(history[1]?.Destination).toBe("Holding");
    expect(history[1]?.["Holding symbol"]).toBe("VWCE");
    expect(history[1]?.["Holding name"]).toBe("Vanguard FTSE All-World");
    expect(history[1]?.Quantity).toBe(12.4);
    expect(history[1]?.["Price per unit"]).toBe(120.97);
    expect(history[1]?.Fee).toBe(2.5);
    expect(history[1]?.["Created date"]).toBe("2026-02-01");
    expect(typeof history[1]?.Amount).toBe("number");
  });

  it("sanitizes formula-like Excel cell values", () => {
    expect(sanitizeExcelCellValue("=1+1")).toBe("'=1+1");
    expect(sanitizeExcelCellValue("+cmd")).toBe("'+cmd");
    expect(sanitizeExcelCellValue("VWCE")).toBe("VWCE");
    expect(sanitizeExcelCellValue(12.4)).toBe(12.4);
  });

  it("names the export file with an ISO date stamp and .xlsx extension", () => {
    expect(
      buildPortfolioHistoryExportFilename(new Date("2026-08-04T12:00:00.000Z")),
    ).toBe("tobailey-portfolio-history-2026-08-04.xlsx");
  });

  it("rejects empty history with a useful message", () => {
    expect(() =>
      downloadPortfolioHistoryWorkbook({
        ...sampleInput,
        entries: [],
      }),
    ).toThrow(PORTFOLIO_HISTORY_EMPTY_MESSAGE);
  });

  it("invokes workbook download via blob without opening a blank tab", () => {
    const click = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild").mockImplementation(
      (node) => node,
    );
    const removeChild = vi.spyOn(document.body, "removeChild").mockImplementation(
      (node) => node,
    );
    const createElement = vi.spyOn(document, "createElement").mockImplementation(
      ((tag: string) => {
        if (tag === "a") {
          return {
            href: "",
            download: "",
            rel: "",
            style: { display: "" },
            click,
          } as unknown as HTMLAnchorElement;
        }
        return document.createElement(tag);
      }) as typeof document.createElement,
    );
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:mock");
    const revokeObjectURL = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);

    const filename = downloadPortfolioHistoryWorkbook(sampleInput);

    expect(filename.endsWith(".xlsx")).toBe(true);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalled();
    expect(removeChild).toHaveBeenCalled();
    expect(createElement).toHaveBeenCalledWith("a");

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });
});

describe("portfolio history export UI wiring", () => {
  it("guards duplicate clicks and surfaces unified Export Portfolio copy", () => {
    const page = readFileSync(
      path.resolve(
        process.cwd(),
        "components/portfolioHistory/PortfolioHistoryPage.tsx",
      ),
      "utf8",
    );
    expect(page).toContain("if (isExporting)");
    expect(page).toContain("PORTFOLIO_EXPORT_EMPTY_MESSAGE");
    expect(page).toContain("PORTFOLIO_EXPORT_SUCCESS_MESSAGE");
    expect(page).toContain("PORTFOLIO_EXPORT_FAILURE_MESSAGE");
    expect(page).toContain("Export Portfolio");
    expect(page).toContain("Export Portfolio");
  });
});
