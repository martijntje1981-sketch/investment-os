import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";

import {
  ALLOCATION_SHEET,
  buildPortfolioExportFilename,
  buildPortfolioWorkbook,
  CONTRIBUTIONS_SHEET,
  DATA_NOTES_SHEET,
  HOLDINGS_SHEET,
  PARTIAL_HISTORY_RETURN_NOTE,
  PORTFOLIO_HISTORY_SHEET,
  PORTFOLIO_SUMMARY_SHEET,
} from "@/lib/client/portfolioExport";
import {
  EXCEL_DATE_FORMAT,
  excelSerialFromIsoDate,
} from "@/lib/client/portfolioExportStyle";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const FOUR_HUNDRED_RECORDED = 400;

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    isin: overrides.isin,
    exchange: overrides.exchange,
    previousClose: overrides.previousClose,
    changePercent: overrides.changePercent,
  };
}

function entry(
  overrides: Partial<PortfolioContributionEntry> = {},
): PortfolioContributionEntry {
  return {
    id: overrides.id ?? "c1",
    portfolioId: "p1",
    userId: "u1",
    entryType: "contribution",
    amount: overrides.amount ?? FOUR_HUNDRED_RECORDED,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: overrides.baseAmount ?? FOUR_HUNDRED_RECORDED,
    fxRateUsed: 1,
    entryDate: overrides.entryDate ?? "2026-08-01",
    note: overrides.note ?? "Test deposit",
    source: overrides.source ?? "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: overrides.createdAt ?? "2026-08-01T10:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-08-01T10:00:00.000Z",
    ...overrides,
  };
}

function sheetValues(workbook: XLSX.WorkBook, name: string): Array<Array<string | number>> {
  return XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets[name]!, {
    header: 1,
    raw: true,
    defval: "",
  });
}

function sheetText(workbook: XLSX.WorkBook, name: string): string {
  return sheetValues(workbook, name)
    .flat()
    .map((cell) => String(cell))
    .join(" | ");
}

describe("Phase 18 professional portfolio export", () => {
  it("A. audits Excel and PDF as separate products", () => {
    const button = read("components/export/ExportPortfolioButton.tsx");
    const runner = read("lib/client/runPortfolioExport.ts");
    const pdf = read("components/report/PeriodReportPdfAction.tsx");
    const weeklyPdf = read("lib/services/periodIntelligence/pdf/renderPeriodReportPdf.ts");
    const portfolioPage = read("app/portfolio/page.tsx");
    const analysisPage = read("components/analysis/PortfolioAnalysisPage.tsx");

    expect(button).toContain("Export portfolio (.xlsx)");
    expect(runner).toContain("downloadPortfolioWorkbook");
    expect(portfolioPage).toContain("contributionEntries");
    expect(analysisPage).toContain("contributionEntries");
    expect(portfolioPage).not.toMatch(/entries:\s*\[\s*\]/);
    expect(analysisPage).not.toMatch(/entries:\s*\[\s*\]/);
    expect(pdf).toContain("Download weekly report");
    expect(pdf).toContain("Download monthly report");
    expect(weeklyPdf).toContain("Canonical weekly/monthly PDF renderer");
    expect(read("lib/client/portfolioExport.ts")).not.toContain("renderPeriodReportPdf");
  });

  it("B-E. €400 recorded contribution stays €400 and does not invent return", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        providerSymbol: "VWCE.XETRA",
        quantity: 1250,
        purchasePrice: 100,
        currentPrice: 100,
      }),
    ];
    const entries = [
      entry({
        baseAmount: FOUR_HUNDRED_RECORDED,
        amount: FOUR_HUNDRED_RECORDED,
        entryDate: "2026-07-15",
      }),
    ];
    const summary = calculateContributionSummary(entries, 125_000, "EUR");
    expect(summary.contributionBasisReliable).toBe(false);
    expect(summary.valueAboveContributions).toBeNull();

    const workbook = buildPortfolioWorkbook({
      holdings,
      entries,
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
      timeline: buildPortfolioTimeline({
        entries,
        contributionSummary: summary,
        currentPortfolioValue: 125_000,
        portfolioValueAvailable: true,
      }),
    });

    const summaryText = sheetText(workbook, PORTFOLIO_SUMMARY_SHEET);
    const contributionText = sheetText(workbook, CONTRIBUTIONS_SHEET);
    expect(summaryText).toContain("Recorded contributions");
    expect(summaryText).toContain(String(FOUR_HUNDRED_RECORDED));
    expect(summaryText).toContain(INCOMPLETE_HISTORY_NOTE);
    expect(summaryText.split(INCOMPLETE_HISTORY_NOTE).length - 1).toBe(1);
    expect(summaryText).not.toMatch(/Investment return/i);
    expect(summaryText).not.toContain("124600");
    expect(contributionText).toContain("Contribution");
    expect(contributionText).toContain(String(FOUR_HUNDRED_RECORDED));
    expect(contributionText.split(INCOMPLETE_HISTORY_NOTE).length - 1).toBe(1);
    expect(summaryText).toContain(PARTIAL_HISTORY_RETURN_NOTE);
    const contributionDate = excelSerialFromIsoDate("2026-07-15");
    const contributionSheet = workbook.Sheets[CONTRIBUTIONS_SHEET]!;
    const dateCell = Object.entries(contributionSheet).find(
      ([key, cell]) =>
        !key.startsWith("!") &&
        cell?.z === EXCEL_DATE_FORMAT &&
        cell?.v === contributionDate,
    );
    expect(dateCell).toBeDefined();
  });

  it("E. opening balance is only a contribution when stored as one", () => {
    const holdings = [holding({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" })];
    const withoutLedger = buildPortfolioWorkbook({
      holdings,
      entries: [],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
    expect(sheetText(withoutLedger, CONTRIBUTIONS_SHEET)).toContain(
      "No recorded contributions or withdrawals",
    );

    const withOpening = buildPortfolioWorkbook({
      holdings,
      entries: [entry({ source: "opening_balance", baseAmount: 1000, amount: 1000 })],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
    expect(sheetText(withOpening, CONTRIBUTIONS_SHEET)).toContain("Opening contribution");
    expect(sheetText(withOpening, PORTFOLIO_SUMMARY_SHEET)).toContain("1000");
  });

  it("F. withdrawals appear when already supported", () => {
    const workbook = buildPortfolioWorkbook({
      holdings: [holding({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" })],
      entries: [
        entry({ id: "in", baseAmount: 1000, amount: 1000, entryDate: "2026-01-01" }),
        entry({
          id: "out",
          entryType: "withdrawal",
          baseAmount: 200,
          amount: 200,
          entryDate: "2026-02-01",
        }),
      ],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
    const text = sheetText(workbook, CONTRIBUTIONS_SHEET);
    expect(text).toContain("1000");
    expect(text).toContain("200");
    expect(text).toContain("Withdrawal");
    expect(sheetText(workbook, PORTFOLIO_SUMMARY_SHEET)).toContain("800");
  });

  it("G-H. holdings reuse canonical valuation and never turn unavailable into 0", () => {
    const workbook = buildPortfolioWorkbook({
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
          providerSymbol: "VWCE.XETRA",
          isin: "IE00BK5BQT80",
          quantity: 10,
          purchasePrice: 90,
          currentPrice: 100,
          previousClose: 98,
        }),
        holding({
          symbol: "ZZZX",
          name: "Unknown holding",
          quantity: 1,
          purchasePrice: 0,
          currentPrice: 0,
        }),
      ],
      entries: [],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
    const values = sheetValues(workbook, HOLDINGS_SHEET);
    const header = values[1]?.map(String) ?? [];
    expect(header).toEqual(
      expect.arrayContaining([
        "Holding",
        "Ticker",
        "ISIN",
        "Price status",
        "Position value",
      ]),
    );
    const vwce = values.find((row) => row.includes("VWCE"));
    const unknown = values.find((row) => row.includes("ZZZX"));
    expect(vwce?.join(" ")).toContain("IE00BK5BQT80");
    expect(vwce?.join(" ")).not.toMatch(/\bLive\b/);
    expect(unknown?.join(" ")).toContain("Unavailable");
    expect(unknown?.[9]).not.toBe(0);
  });

  it("I-K. allocation uses canonical groups including Precious metals and Unclassified", () => {
    const workbook = buildPortfolioWorkbook({
      holdings: [
        holding({
          symbol: "PPFB",
          name: "WisdomTree Physical Gold",
          providerSymbol: "PPFB.XETRA",
          quantity: 3,
          currentPrice: 100,
        }),
        holding({
          symbol: "ZZZX",
          name: "Mystery",
          quantity: 7,
          currentPrice: 100,
        }),
      ],
      entries: [],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt: new Date("2026-08-20T12:00:00.000Z"),
    });
    const text = sheetText(workbook, ALLOCATION_SHEET);
    expect(text).toContain("Precious metals");
    expect(text).toContain("PPFB");
    expect(text).toContain("Other / Unclassified");
    expect(text).toContain("ZZZX");
  });

  it("L-P. workbook structure, styles, filters, freeze panes, and filename", () => {
    const exportedAt = new Date("2026-08-20T12:00:00.000Z");
    const workbook = buildPortfolioWorkbook({
      holdings: [holding({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" })],
      entries: [entry()],
      portfolioBaseCurrency: "EUR",
      portfolioValueAvailable: true,
      exportedAt,
    });

    expect(workbook.SheetNames).toEqual([
      PORTFOLIO_SUMMARY_SHEET,
      HOLDINGS_SHEET,
      CONTRIBUTIONS_SHEET,
      PORTFOLIO_HISTORY_SHEET,
      ALLOCATION_SHEET,
      DATA_NOTES_SHEET,
    ]);
    expect(workbook.SheetNames).not.toContain("Dashboard Summary");
    expect(workbook.SheetNames).not.toContain("Portfolio Review");

    const summary = workbook.Sheets[PORTFOLIO_SUMMARY_SHEET]!;
    expect(summary.A1?.v).toBe("TOBAILEY");
    expect(summary.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(summary.A1?.s?.font?.color?.rgb).toBe("FFFFFF");
    expect(summary["!views"]?.[0]?.state).toBe("frozen");

    const holdings = workbook.Sheets[HOLDINGS_SHEET]!;
    expect(holdings["!autofilter"]?.ref).toMatch(/^A2:N/);
    expect(holdings["!views"]?.[0]?.ySplit).toBe(2);
    expect(holdings["!pageSetup"]?.orientation).toBe("landscape");
    expect(holdings.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(holdings.N1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(holdings.N1?.v).toBe("");

    expect(buildPortfolioExportFilename(exportedAt)).toBe(
      "Tobailey-Portfolio-2026-08-20.xlsx",
    );
  });

  it("Q-R. does not regress PDF architecture or add paid paths", () => {
    const exportSource = read("lib/client/portfolioExport.ts");
    const runner = read("lib/client/runPortfolioExport.ts");
    const pdfAction = read("components/report/PeriodReportPdfAction.tsx");
    expect(pdfAction).toContain("canDownloadPeriodReportPdf");
    expect(exportSource).not.toContain("fetch(");
    expect(exportSource).not.toMatch(/openai/i);
    expect(exportSource).not.toContain("executeEodhdApiCall");
    expect(exportSource).not.toContain("createClient");
    expect(runner).not.toContain("fetch(");
    expect(runner).not.toContain("setInterval(");
  });
});
