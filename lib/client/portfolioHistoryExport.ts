/**
 * Portfolio History Excel export — Overview, Activity, Current Holdings, Notes.
 * Cash-flow ledger only (contributions / withdrawals / opening balance).
 */

import * as XLSX from "xlsx";

import {
  formatContributionEntryDate,
} from "@/lib/client/contributionsFormat";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type PortfolioHistoryHoldingRow = {
  symbol: string;
  name: string;
  assetType: string;
  quantity: number;
  marketValue: number | null;
  weightPercent: number | null;
};

export type PortfolioHistoryExportInput = {
  summary: ContributionSummary;
  entries: PortfolioContributionEntry[];
  holdings: PortfolioHistoryHoldingRow[];
  portfolioBaseCurrency: PortfolioBaseCurrency;
  portfolioValueAvailable: boolean;
  exportedAt?: Date;
};

export function activityTypeLabel(
  entry: PortfolioContributionEntry,
): string {
  if (entry.source === "opening_balance") {
    return "Opening contribution";
  }
  if (entry.entryType === "withdrawal") {
    return "Withdrawal";
  }
  if (entry.source === "import") {
    return "Contribution (imported)";
  }
  return "Contribution";
}

export function activitySourceLabel(
  entry: PortfolioContributionEntry,
): string {
  switch (entry.source) {
    case "opening_balance":
      return "Opening balance";
    case "import":
      return "Import";
    default:
      return "Manual";
  }
}

function formatExportTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOptionalNumber(value: number | null): number | string {
  if (value == null || !Number.isFinite(value)) {
    return "Unavailable";
  }
  return Math.round(value * 100) / 100;
}

function setColumnWidths(
  sheet: XLSX.WorkSheet,
  widths: number[],
): void {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

export function buildPortfolioHistoryWorkbook(
  input: PortfolioHistoryExportInput,
): XLSX.WorkBook {
  const exportedAt = input.exportedAt ?? new Date();
  const currency = input.portfolioBaseCurrency;
  const workbook = XLSX.utils.book_new();

  const overviewRows: Array<Array<string | number>> = [
    ["Portfolio History"],
    ["Generated", formatExportTimestamp(exportedAt)],
    ["Base currency", currency],
    [],
    ["Summary", "Amount"],
    [
      "Total contributed",
      formatOptionalNumber(input.summary.totalContributed),
    ],
    [
      "Total withdrawn",
      formatOptionalNumber(input.summary.totalWithdrawn),
    ],
    [
      "Net contributed",
      formatOptionalNumber(input.summary.netContributed),
    ],
    [
      "Current portfolio value",
      input.portfolioValueAvailable
        ? formatOptionalNumber(input.summary.currentValue)
        : "Unavailable",
    ],
    [],
    ["Activity entries", input.entries.length],
    ["Holdings listed", input.holdings.length],
  ];

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  setColumnWidths(overviewSheet, [28, 18]);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

  const activityHeader = [
    "Date",
    "Type",
    "Source",
    "Amount",
    "Currency",
    `Amount (${currency})`,
    "Note",
  ];
  const activityRows = input.entries.map((entry) => [
    entry.entryDate,
    activityTypeLabel(entry),
    activitySourceLabel(entry),
    Math.round(entry.amount * 100) / 100,
    entry.currency,
    Math.round(entry.baseAmount * 100) / 100,
    entry.note ?? "",
  ]);
  const activitySheet = XLSX.utils.aoa_to_sheet([
    activityHeader,
    ...activityRows,
  ]);
  setColumnWidths(activitySheet, [12, 22, 16, 12, 10, 14, 40]);
  XLSX.utils.book_append_sheet(workbook, activitySheet, "Activity");

  const holdingsHeader = [
    "Symbol",
    "Name",
    "Asset type",
    "Quantity",
    `Market value (${currency})`,
    "Weight %",
  ];
  const holdingsRows = input.holdings.map((row) => [
    row.symbol,
    row.name,
    row.assetType,
    row.quantity,
    formatOptionalNumber(row.marketValue),
    row.weightPercent == null || !Number.isFinite(row.weightPercent)
      ? "Unavailable"
      : Math.round(row.weightPercent * 10) / 10,
  ]);
  const holdingsSheet = XLSX.utils.aoa_to_sheet([
    holdingsHeader,
    ...holdingsRows,
  ]);
  setColumnWidths(holdingsSheet, [12, 28, 12, 12, 18, 10]);
  XLSX.utils.book_append_sheet(workbook, holdingsSheet, "Current Holdings");

  const notesRows: Array<Array<string>> = [
    ["Portfolio History export notes"],
    [],
    [
      "This workbook summarises cash contributions and withdrawals recorded in Tobailey, plus a snapshot of current holdings.",
    ],
    [],
    ["Included"],
    ["• Manual contributions and withdrawals"],
    ["• Opening balance entries"],
    ["• Imported contribution entries (when present)"],
    ["• Current holdings with validated market values where available"],
    [],
    ["Not included in v1"],
    ["• Buys, sells, dividends, or corporate actions"],
    ["• FIFO / lot tracking or tax reports"],
    ["• Broker transaction import"],
    ["• Historical performance charts"],
    [],
    ["Interpretation"],
    [
      "Net contributed equals total contributed minus total withdrawn. It does not account for the timing of cash flows.",
    ],
    [
      "Current portfolio value uses validated holding prices. Unpriced positions are omitted from the total and shown as Unavailable in holdings.",
    ],
    [
      `Activity dates are shown as recorded (YYYY-MM-DD). Display dates in the app use en-GB formatting (e.g. ${formatContributionEntryDate("2026-01-15")}).`,
    ],
    [],
    ["Tobailey explains portfolio characteristics. It does not provide personal investment advice."],
  ];
  const notesSheet = XLSX.utils.aoa_to_sheet(notesRows);
  setColumnWidths(notesSheet, [100]);
  XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");

  return workbook;
}

export function buildPortfolioHistoryExportFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `tobailey-portfolio-history-${stamp}.xlsx`;
}

export function downloadPortfolioHistoryWorkbook(
  input: PortfolioHistoryExportInput,
): void {
  const workbook = buildPortfolioHistoryWorkbook(input);
  const filename = buildPortfolioHistoryExportFilename(input.exportedAt);
  XLSX.writeFile(workbook, filename);
}

export function mapHoldingsForHistoryExport(
  holdings: StoredPortfolioHolding[],
  valued: Array<{
    holding: StoredPortfolioHolding;
    value: number;
    weightPercent: number;
  }>,
  unvalued: StoredPortfolioHolding[],
): PortfolioHistoryHoldingRow[] {
  const valuedRows = valued.map(({ holding, value, weightPercent }) => ({
    symbol: holding.symbol,
    name: holding.name,
    assetType: holding.assetType ?? "investment",
    quantity: holding.quantity,
    marketValue: value,
    weightPercent,
  }));

  const unvaluedRows = unvalued.map((holding) => ({
    symbol: holding.symbol,
    name: holding.name,
    assetType: holding.assetType ?? "investment",
    quantity: holding.quantity,
    marketValue: null,
    weightPercent: null,
  }));

  // Prefer valued first (already sorted by value), then unvalued.
  // Keep all holdings from the portfolio list without inventing prices.
  void holdings;
  return [...valuedRows, ...unvaluedRows];
}
