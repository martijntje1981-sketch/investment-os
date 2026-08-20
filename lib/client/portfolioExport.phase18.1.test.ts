import { describe, expect, it } from "vitest";
import * as XLSXStyle from "xlsx-js-style";

import {
  ALLOCATION_SHEET,
  buildPortfolioWorkbook,
  CONTRIBUTIONS_SHEET,
  DATA_NOTES_SHEET,
  HOLDINGS_SHEET,
  PARTIAL_HISTORY_RETURN_NOTE,
  PORTFOLIO_HISTORY_SHEET,
  PORTFOLIO_SUMMARY_SHEET,
} from "@/lib/client/portfolioExport";
import {
  BODY_ROW_HEIGHT_PT,
  EXCEL_DATE_FORMAT,
  excelSerialFromIsoDate,
  MAX_WRAPPED_ROW_HEIGHT_PT,
  wrappedRowHeightPt,
} from "@/lib/client/portfolioExportStyle";
import { INCOMPLETE_HISTORY_NOTE } from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { calculateContributionSummary } from "@/lib/services/contributions/calculateContributionSummary";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    ...overrides,
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
    amount: 400,
    currency: "EUR",
    baseCurrency: "EUR",
    baseAmount: 400,
    fxRateUsed: 1,
    entryDate: "2026-07-15",
    note: "Recorded cash contribution",
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: "2026-07-15T10:00:00.000Z",
    updatedAt: "2026-07-15T10:00:00.000Z",
    ...overrides,
  };
}

function sheetValues(workbook: XLSXStyle.WorkBook, name: string): Array<Array<string | number>> {
  return XLSXStyle.utils.sheet_to_json<Array<string | number>>(workbook.Sheets[name]!, {
    header: 1,
    raw: true,
    defval: "",
  });
}

function sheetText(workbook: XLSXStyle.WorkBook, name: string): string {
  return sheetValues(workbook, name)
    .flat()
    .map((cell) => String(cell))
    .join(" | ");
}

function count(text: string, snippet: string): number {
  return text.split(snippet).length - 1;
}

function representativeWorkbook() {
  const holdings = [
    holding({
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      providerSymbol: "VWCE.XETRA",
      quantity: 800,
      currentPrice: 110,
      priceDataStatus: "stale",
    }),
    holding({
      symbol: "EUNA",
      name: "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
      providerSymbol: "EUNA.XETRA",
      quantity: 200,
      currentPrice: 50,
      priceDataStatus: "delayed",
    }),
    holding({
      symbol: "PPFB",
      name: "WisdomTree Physical Gold",
      providerSymbol: "PPFB.XETRA",
      quantity: 20,
      currentPrice: 250,
    }),
    holding({
      symbol: "ZZZX",
      name: "Unclassified private note",
      quantity: 10,
      purchasePrice: 280,
      currentPrice: 0,
    }),
  ];
  const entries = [entry()];
  const summary = calculateContributionSummary(entries, 125_000, "EUR");
  return buildPortfolioWorkbook({
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
}

describe("Phase 18.1 Excel export polish", () => {
  it("uses Excel serial calendar dates, not timezone-shifted JS Dates", () => {
    expect(excelSerialFromIsoDate("2026-07-15")).toBe(46218);
    expect(excelSerialFromIsoDate("not-a-date")).toBeNull();

    const workbook = representativeWorkbook();
    const contributions = workbook.Sheets[CONTRIBUTIONS_SHEET]!;
    const dateCell = Object.values(contributions).find(
      (cell) =>
        cell &&
        typeof cell === "object" &&
        "z" in cell &&
        cell.z === EXCEL_DATE_FORMAT &&
        cell.v === 46218,
    );
    expect(dateCell).toBeDefined();
    expect(dateCell).not.toHaveProperty("t", "d");
  });

  it("does not repeat the incomplete-history warning", () => {
    const workbook = representativeWorkbook();
    const summary = sheetText(workbook, PORTFOLIO_SUMMARY_SHEET);
    const contributions = sheetText(workbook, CONTRIBUTIONS_SHEET);
    const history = sheetText(workbook, PORTFOLIO_HISTORY_SHEET);

    expect(count(summary, INCOMPLETE_HISTORY_NOTE)).toBe(1);
    expect(count(contributions, INCOMPLETE_HISTORY_NOTE)).toBe(1);
    expect(count(history, INCOMPLETE_HISTORY_NOTE)).toBe(1);
    expect(summary).toContain(PARTIAL_HISTORY_RETURN_NOTE);
    expect(contributions).toContain(PARTIAL_HISTORY_RETURN_NOTE);
    expect(history).not.toContain(PARTIAL_HISTORY_RETURN_NOTE);
  });

  it("spans the navy title band across the used sheet width", () => {
    const workbook = representativeWorkbook();
    const holdings = workbook.Sheets[HOLDINGS_SHEET]!;
    const history = workbook.Sheets[PORTFOLIO_HISTORY_SHEET]!;
    const allocation = workbook.Sheets[ALLOCATION_SHEET]!;
    const notes = workbook.Sheets[DATA_NOTES_SHEET]!;

    expect(holdings.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(holdings.N1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(history.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(history.E1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(allocation.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(allocation.D1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(notes.A1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
    expect(notes.B1?.s?.fill?.fgColor?.rgb).toBe("0D243F");
  });

  it("gives long wrapped content extra height without creating huge rows", () => {
    expect(wrappedRowHeightPt("short", 36)).toBe(BODY_ROW_HEIGHT_PT);
    expect(
      wrappedRowHeightPt(
        "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
        36,
      ),
    ).toBeGreaterThan(BODY_ROW_HEIGHT_PT);
    expect(wrappedRowHeightPt("x".repeat(400), 14)).toBe(MAX_WRAPPED_ROW_HEIGHT_PT);

    const workbook = representativeWorkbook();
    const holdings = workbook.Sheets[HOLDINGS_SHEET]!;
    const notes = workbook.Sheets[DATA_NOTES_SHEET]!;
    const eunaRow = sheetValues(workbook, HOLDINGS_SHEET).findIndex((row) =>
      row.includes("EUNA"),
    );
    expect(eunaRow).toBeGreaterThan(0);
    expect(holdings["!rows"]?.[eunaRow]?.hpt).toBeGreaterThan(BODY_ROW_HEIGHT_PT);
    expect(holdings["!rows"]?.[eunaRow]?.hpt).toBeLessThanOrEqual(
      MAX_WRAPPED_ROW_HEIGHT_PT,
    );
    expect(holdings["!cols"]?.[0]?.wch).toBeGreaterThanOrEqual(36);

    const longNoteRow = sheetValues(workbook, DATA_NOTES_SHEET).findIndex((row) =>
      String(row[0]).includes("ledger entries"),
    );
    expect(longNoteRow).toBeGreaterThan(0);
    expect(notes["!merges"]?.some((range) => range.s.r === longNoteRow)).toBe(true);
  });

  it("makes the History intro span the table width instead of a 14-character column", () => {
    const workbook = representativeWorkbook();
    const history = workbook.Sheets[PORTFOLIO_HISTORY_SHEET]!;
    expect(history["!cols"]?.[0]?.wch).toBeGreaterThan(14);
    expect(history["!merges"]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          s: { r: 1, c: 0 },
          e: { r: 1, c: 4 },
        }),
      ]),
    );
    expect(history["!autofilter"]?.ref).toMatch(/^A5:E/);
    expect(history["!rows"]?.[1]?.hpt).toBeLessThanOrEqual(MAX_WRAPPED_ROW_HEIGHT_PT);
  });

  it("keeps freeze metadata in memory and still serializes filters, not panes", () => {
    const workbook = representativeWorkbook();
    expect(workbook.Sheets[HOLDINGS_SHEET]?.["!views"]?.[0]?.state).toBe("frozen");
    expect(workbook.Sheets[CONTRIBUTIONS_SHEET]?.["!views"]?.[0]?.state).toBe(
      "frozen",
    );
    expect(workbook.Sheets[PORTFOLIO_HISTORY_SHEET]?.["!views"]?.[0]?.state).toBe(
      "frozen",
    );
    expect(workbook.Sheets[ALLOCATION_SHEET]?.["!views"]?.[0]?.state).toBe("frozen");

    const bytes = XLSXStyle.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
      cellStyles: true,
    }) as Buffer;
    const reloaded = XLSXStyle.read(bytes, {
      type: "buffer",
      cellStyles: true,
    });
    expect(reloaded.Sheets[HOLDINGS_SHEET]?.["!autofilter"]?.ref).toMatch(/^A2:N/);
    expect(reloaded.Sheets[CONTRIBUTIONS_SHEET]?.["!autofilter"]?.ref).toMatch(
      /^A\d+:E/,
    );
    expect(reloaded.Sheets[PORTFOLIO_HISTORY_SHEET]?.["!autofilter"]?.ref).toMatch(
      /^A5:E/,
    );
    expect(reloaded.Sheets[ALLOCATION_SHEET]?.["!autofilter"]?.ref).toMatch(/^A4:D/);
    expect(reloaded.Sheets[HOLDINGS_SHEET]?.["!views"]?.[0]?.ySplit).toBeUndefined();
    expect(reloaded.Sheets[HOLDINGS_SHEET]?.["!pageSetup"]?.orientation).toBeUndefined();
  });
});
