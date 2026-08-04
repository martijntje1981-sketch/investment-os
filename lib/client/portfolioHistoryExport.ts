/**
 * Portfolio History Excel export — Overview, Portfolio History, Current Holdings, Notes.
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

export const PORTFOLIO_HISTORY_SHEET_NAME = "Portfolio History";

export const PORTFOLIO_HISTORY_EXPORT_HEADERS = [
  "Date",
  "Type",
  "Amount",
  "Currency",
  "Destination",
  "Holding symbol",
  "Holding name",
  "Quantity",
  "Price per unit",
  "Fee",
  "Cash interest rate",
  "Note",
  "Created date",
] as const;

export const PORTFOLIO_HISTORY_EMPTY_MESSAGE =
  "There is no Portfolio History to export yet.";

export const PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE =
  "We couldn't create your Excel export. Please try again.";

export const PORTFOLIO_HISTORY_EXPORT_SUCCESS_MESSAGE =
  "Portfolio History downloaded.";

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

/** Prevent formula injection when Excel opens exported cells. */
export function sanitizeExcelCellValue(
  value: string | number | null | undefined,
): string | number {
  if (value == null) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : "";
  }

  const text = String(value);
  if (/^[=+\-@]/.test(text) || text.startsWith("\t")) {
    return `'${text}`;
  }
  return text;
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

function freezeHeaderRow(sheet: XLSX.WorkSheet): void {
  sheet["!views"] = [
    {
      state: "frozen",
      ySplit: 1,
      topLeftCell: "A2",
      activeCell: "A2",
    },
  ];
}

function sortEntriesChronologically(
  entries: PortfolioContributionEntry[],
): PortfolioContributionEntry[] {
  return [...entries].sort((left, right) => {
    const byDate = left.entryDate.localeCompare(right.entryDate);
    if (byDate !== 0) return byDate;
    return left.createdAt.localeCompare(right.createdAt);
  });
}

function resolveHoldingName(
  symbol: string | null,
  holdings: PortfolioHistoryHoldingRow[],
): string {
  if (!symbol) return "";
  const match = holdings.find(
    (row) => row.symbol.toUpperCase() === symbol.toUpperCase(),
  );
  return match?.name ?? "";
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
  ].map((row) => row.map((cell) => sanitizeExcelCellValue(cell)));

  const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
  setColumnWidths(overviewSheet, [28, 18]);
  XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");

  const historyRows = sortEntriesChronologically(input.entries).map((entry) => {
    const symbol =
      entry.destinationType === "holding"
        ? entry.destinationHoldingSymbol ?? ""
        : "";
    return [
      entry.entryDate,
      activityTypeLabel(entry),
      Math.round(entry.amount * 100) / 100,
      entry.currency,
      entry.destinationType === "holding" ? "Holding" : "Cash",
      symbol,
      resolveHoldingName(symbol || null, input.holdings),
      entry.destinationQuantity ?? "",
      entry.destinationPricePerUnit ?? "",
      entry.destinationFee ?? "",
      "", // Cash interest rate — not on contribution schema
      entry.note ?? "",
      entry.createdAt.slice(0, 10),
    ].map((cell) => sanitizeExcelCellValue(cell));
  });

  const historySheet = XLSX.utils.aoa_to_sheet([
    [...PORTFOLIO_HISTORY_EXPORT_HEADERS],
    ...historyRows,
  ]);
  setColumnWidths(historySheet, [
    12, 22, 12, 10, 12, 14, 28, 12, 14, 10, 16, 36, 12,
  ]);
  freezeHeaderRow(historySheet);
  XLSX.utils.book_append_sheet(
    workbook,
    historySheet,
    PORTFOLIO_HISTORY_SHEET_NAME,
  );

  const holdingsHeader = [
    "Symbol",
    "Name",
    "Asset type",
    "Quantity",
    `Market value (${currency})`,
    "Weight %",
  ];
  const holdingsRows = input.holdings.map((row) =>
    [
      row.symbol,
      row.name,
      row.assetType,
      row.quantity,
      formatOptionalNumber(row.marketValue),
      row.weightPercent == null || !Number.isFinite(row.weightPercent)
        ? "Unavailable"
        : Math.round(row.weightPercent * 10) / 10,
    ].map((cell) => sanitizeExcelCellValue(cell)),
  );
  const holdingsSheet = XLSX.utils.aoa_to_sheet([
    holdingsHeader,
    ...holdingsRows,
  ]);
  setColumnWidths(holdingsSheet, [12, 28, 12, 12, 18, 10]);
  freezeHeaderRow(holdingsSheet);
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
    ["• Optional destination detail (cash or one holding allocation)"],
    ["• Imported contribution entries (when present)"],
    ["• Current holdings with validated market values where available"],
    [],
    ["Not included in v1"],
    ["• Buys, sells, dividends, or corporate actions"],
    ["• FIFO / lot tracking or tax reports"],
    ["• Broker transaction import"],
    ["• Historical performance charts"],
    ["• Cash interest rate (column reserved; not stored on contribution rows)"],
    [],
    ["Interpretation"],
    [
      "Net contributed equals total contributed minus total withdrawn. It does not account for the timing of cash flows.",
    ],
    [
      "Destination holding quantity, price and fee are allocation notes only. They do not change holdings or double-count portfolio value.",
    ],
    [
      "Current portfolio value uses validated holding prices. Unpriced positions are omitted from the total and shown as Unavailable in holdings.",
    ],
    [
      `Activity dates are shown as recorded (YYYY-MM-DD). Display dates in the app use en-GB formatting (e.g. ${formatContributionEntryDate("2026-01-15")}).`,
    ],
    [],
    ["Your portfolio data is yours"],
    [
      "You can export your complete Portfolio History to Excel, including when your trial ends.",
    ],
    [],
    ["Tobailey explains portfolio characteristics. It does not provide personal investment advice."],
  ].map((row) => row.map((cell) => String(sanitizeExcelCellValue(cell))));
  const notesSheet = XLSX.utils.aoa_to_sheet(notesRows);
  setColumnWidths(notesSheet, [100]);
  XLSX.utils.book_append_sheet(workbook, notesSheet, "Notes");

  return workbook;
}

export function buildPortfolioHistoryExportFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `tobailey-portfolio-history-${stamp}.xlsx`;
}

/**
 * Browser-safe .xlsx download via Blob + object URL.
 * Avoids fragile writeFile synthetic-click paths in some WebViews.
 */
export function downloadPortfolioHistoryWorkbook(
  input: PortfolioHistoryExportInput,
): string {
  if (input.entries.length === 0) {
    throw new Error(PORTFOLIO_HISTORY_EMPTY_MESSAGE);
  }

  const workbook = buildPortfolioHistoryWorkbook(input);
  const filename = buildPortfolioHistoryExportFilename(input.exportedAt);
  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer | Uint8Array;

  if (typeof document === "undefined") {
    throw new Error(PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE);
  }

  const workbookBytes =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const safeBytes = new Uint8Array(workbookBytes.byteLength);
  safeBytes.set(workbookBytes);
  const blob = new Blob([safeBytes.buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 1_500);
  }

  return filename;
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

  void holdings;
  return [...valuedRows, ...unvaluedRows];
}
