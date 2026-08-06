/**
 * Unified Portfolio Export — one workbook, one click.
 * Reuses contribution ledger, holdings, exposure, cash, goals, and timeline summary.
 */

import * as XLSX from "xlsx";

import {
  activityTypeLabel,
  buildPortfolioHistoryWorkbook,
  mapHoldingsForHistoryExport,
  PORTFOLIO_HISTORY_EMPTY_MESSAGE,
  PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE,
  PORTFOLIO_HISTORY_SHEET_NAME,
  sanitizeExcelCellValue,
  type PortfolioHistoryExportInput,
  type PortfolioHistoryHoldingRow,
} from "@/lib/client/portfolioHistoryExport";
import type {
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { CashIntelligenceSnapshot } from "@/lib/services/cashIntelligence/types";
import type { PortfolioTimelineSummary } from "@/lib/services/portfolio/timeline";
import type { CompanionReview } from "@/lib/services/portfolio/companion";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export const PORTFOLIO_EXPORT_VERSION = "3A.2";

export const PORTFOLIO_EXPORT_EMPTY_MESSAGE =
  "There is nothing to export yet. Add holdings or contribution activity first.";

export const PORTFOLIO_EXPORT_FAILURE_MESSAGE =
  PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE;

export const PORTFOLIO_EXPORT_SUCCESS_MESSAGE = "Portfolio exported.";

/** @deprecated Prefer PORTFOLIO_EXPORT_EMPTY_MESSAGE */
export { PORTFOLIO_HISTORY_EMPTY_MESSAGE };

export type PortfolioExportGoalSheet = {
  goal: GoalSettings;
  hasSavedGoal: boolean;
  currentProgressPercent?: number | null;
  remainingAmount?: number | null;
  statusLabel?: string | null;
};

export type PortfolioExportInput = {
  summary: ContributionSummary;
  entries: PortfolioContributionEntry[];
  holdings: PortfolioHistoryHoldingRow[];
  portfolioBaseCurrency: PortfolioBaseCurrency;
  portfolioValueAvailable: boolean;
  exportedAt?: Date;
  portfolioName?: string | null;
  timelineSummary?: PortfolioTimelineSummary | null;
  exposure?: PortfolioExposureAllocation | null;
  cash?: CashIntelligenceSnapshot | null;
  goals?: PortfolioExportGoalSheet | null;
  /** Optional companion review snapshot (weekly preferred). */
  review?: CompanionReview | null;
};

function formatExportTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatOptionalNumber(value: number | null | undefined): number | string {
  if (value == null || !Number.isFinite(value)) {
    return "Unavailable";
  }
  return Math.round(value * 100) / 100;
}

function setColumnWidths(sheet: XLSX.WorkSheet, widths: number[]): void {
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

export function buildPortfolioExportFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `Tobailey_Portfolio_${stamp}.xlsx`;
}

export function canExportPortfolio(input: Pick<
  PortfolioExportInput,
  "entries" | "holdings" | "goals"
>): boolean {
  if (input.entries.length > 0) return true;
  if (input.holdings.length > 0) return true;
  if (input.goals?.hasSavedGoal) return true;
  return false;
}

function appendDashboardSummarySheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
  exportedAt: Date,
): void {
  const currency = input.portfolioBaseCurrency;
  const timeline = input.timelineSummary;
  const rows: Array<Array<string | number>> = [
    ["Dashboard Summary"],
    ["Export date", formatExportTimestamp(exportedAt)],
    ["Base currency", currency],
    ["Portfolio name", input.portfolioName?.trim() || "Personal portfolio"],
    ["Version", PORTFOLIO_EXPORT_VERSION],
    [],
    ["Metric", "Value"],
    [
      "Current portfolio value",
      input.portfolioValueAvailable
        ? formatOptionalNumber(
            timeline?.currentPortfolioValue ?? input.summary.currentValue,
          )
        : "Unavailable",
    ],
    ["Net contributions", formatOptionalNumber(input.summary.netContributed)],
    [
      "Investment return",
      formatOptionalNumber(
        timeline?.investmentReturn ?? input.summary.valueAboveContributions,
      ),
    ],
    [
      "Portfolio growth",
      formatOptionalNumber(timeline?.portfolioGrowth ?? null),
    ],
    ["Total contributed", formatOptionalNumber(input.summary.totalContributed)],
    ["Total withdrawn", formatOptionalNumber(input.summary.totalWithdrawn)],
    [],
    ["Activity entries", input.entries.length],
    ["Holdings listed", input.holdings.length],
  ].map((row) => row.map((cell) => sanitizeExcelCellValue(cell)));

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(sheet, [28, 22]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Dashboard Summary");
}

function appendHoldingsSheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
): void {
  const currency = input.portfolioBaseCurrency;
  const header = [
    "Symbol",
    "Name",
    "Asset type",
    "Quantity",
    `Market value (${currency})`,
    "Weight %",
  ];
  const rows = input.holdings.map((row) =>
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
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColumnWidths(sheet, [12, 28, 12, 12, 18, 10]);
  freezeHeaderRow(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, "Holdings");
}

function appendPortfolioHistorySheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
): void {
  // Reuse the legacy builder for the cash-flow history sheet content.
  const legacy = buildPortfolioHistoryWorkbook({
    summary: input.summary,
    entries: input.entries,
    holdings: input.holdings,
    portfolioBaseCurrency: input.portfolioBaseCurrency,
    portfolioValueAvailable: input.portfolioValueAvailable,
    exportedAt: input.exportedAt,
  } satisfies PortfolioHistoryExportInput);

  const historySheet = legacy.Sheets[PORTFOLIO_HISTORY_SHEET_NAME];
  if (historySheet) {
    XLSX.utils.book_append_sheet(
      workbook,
      historySheet,
      PORTFOLIO_HISTORY_SHEET_NAME,
    );
  }
}

function appendContributionsSheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
): void {
  const header = [
    "Date",
    "Type",
    "Base amount",
    "Base currency",
    "Destination",
    "Holding symbol",
    "Note",
  ];
  const rows = sortEntriesChronologically(input.entries).map((entry) =>
    [
      entry.entryDate,
      activityTypeLabel(entry),
      Math.round(entry.baseAmount * 100) / 100,
      entry.baseCurrency,
      entry.destinationType === "holding" ? "Holding" : "Cash",
      entry.destinationHoldingSymbol ?? "",
      entry.note ?? "",
    ].map((cell) => sanitizeExcelCellValue(cell)),
  );
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColumnWidths(sheet, [12, 22, 14, 12, 12, 14, 36]);
  freezeHeaderRow(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, "Contributions");
}

function appendExposureSheet(
  workbook: XLSX.WorkBook,
  exposure: PortfolioExposureAllocation,
): void {
  const header = ["Group", "Percent", "Value"];
  const rows = exposure.groups.map((group) =>
    [
      group.displayLabel,
      group.displayPercent,
      formatOptionalNumber(group.value),
    ].map((cell) => sanitizeExcelCellValue(cell)),
  );
  if (exposure.coverageLabel) {
    rows.push(
      ["Coverage", exposure.coverageLabel, ""].map((cell) =>
        sanitizeExcelCellValue(cell),
      ),
    );
  }
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  setColumnWidths(sheet, [28, 12, 16]);
  freezeHeaderRow(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, "Portfolio Exposure");
}

function appendCashSheet(
  workbook: XLSX.WorkBook,
  cash: CashIntelligenceSnapshot,
  currency: PortfolioBaseCurrency,
): void {
  const rows: Array<Array<string | number>> = [
    ["Cash"],
    ["Base currency", currency],
    [
      "Cash held",
      formatOptionalNumber(cash.totalCashInBase ?? cash.totalCashInEur),
    ],
    [
      "Cash allocation %",
      formatOptionalNumber(cash.portfolioCashWeightPercent),
    ],
    [
      "Benchmark rate %",
      formatOptionalNumber(cash.baseCurrencyBenchmark?.cashBenchmarkPercent),
    ],
    [
      "Benchmark label",
      cash.baseCurrencyBenchmark?.cashBenchmarkLabel ?? "Unavailable",
    ],
    [
      "Indicative annual yield",
      formatOptionalNumber(cash.totalIndicativeAnnualYieldInEur),
    ],
  ].map((row) => row.map((cell) => sanitizeExcelCellValue(cell)));

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(sheet, [28, 22]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Cash");
}

function appendGoalsSheet(
  workbook: XLSX.WorkBook,
  goals: PortfolioExportGoalSheet,
): void {
  const rows: Array<Array<string | number>> = [
    ["Goals"],
    ["Target value", formatOptionalNumber(goals.goal.targetValue)],
    ["Target year", goals.goal.targetYear],
    [
      "Monthly contribution",
      formatOptionalNumber(goals.goal.monthlyContribution),
    ],
    [
      "Expected annual return %",
      formatOptionalNumber(goals.goal.expectedAnnualReturn),
    ],
    [
      "Progress %",
      formatOptionalNumber(goals.currentProgressPercent ?? null),
    ],
    ["Remaining", formatOptionalNumber(goals.remainingAmount ?? null)],
    ["Status", goals.statusLabel ?? ""],
  ].map((row) => row.map((cell) => sanitizeExcelCellValue(cell)));

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(sheet, [28, 22]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Goals");
}

function appendReviewSheet(
  workbook: XLSX.WorkBook,
  review: CompanionReview,
): void {
  if (!review.ready) return;

  const rows: Array<Array<string | number>> = [
    ["Portfolio Review"],
    ["Period", review.periodLabel],
    ["Date range", review.dateRangeLabel],
    ["Lead", review.lead],
    ...review.supportingFacts.map((fact) => [fact.label, fact.value]),
    ["Goal status", review.goalStatusLabel ?? ""],
    ["Milestone", review.milestone?.label ?? ""],
    ["One thing to know", review.focus?.label ?? ""],
    ["Closing", review.closingStatement ?? ""],
  ].map((row) => row.map((cell) => sanitizeExcelCellValue(cell)));

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(sheet, [28, 48]);
  freezeHeaderRow(sheet);
  XLSX.utils.book_append_sheet(workbook, sheet, "Portfolio Review");
}

/**
 * Build the unified Portfolio workbook.
 * Omits Exposure / Cash / Goals sheets when data is unavailable.
 */
export function buildPortfolioWorkbook(input: PortfolioExportInput): XLSX.WorkBook {
  if (!canExportPortfolio(input)) {
    throw new Error(PORTFOLIO_EXPORT_EMPTY_MESSAGE);
  }

  const exportedAt = input.exportedAt ?? new Date();
  const workbook = XLSX.utils.book_new();

  appendDashboardSummarySheet(workbook, input, exportedAt);
  appendHoldingsSheet(workbook, input);
  appendPortfolioHistorySheet(workbook, input);
  appendContributionsSheet(workbook, input);

  if (input.exposure?.hasAnyValue) {
    appendExposureSheet(workbook, input.exposure);
  }
  if (input.cash) {
    appendCashSheet(workbook, input.cash, input.portfolioBaseCurrency);
  }
  if (input.goals?.hasSavedGoal) {
    appendGoalsSheet(workbook, input.goals);
  }
  if (input.review?.ready) {
    appendReviewSheet(workbook, input.review);
  }

  return workbook;
}

export function downloadPortfolioWorkbook(input: PortfolioExportInput): string {
  const workbook = buildPortfolioWorkbook(input);
  const filename = buildPortfolioExportFilename(input.exportedAt);
  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer | Uint8Array;

  if (typeof document === "undefined") {
    throw new Error(PORTFOLIO_EXPORT_FAILURE_MESSAGE);
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

export { mapHoldingsForHistoryExport, activityTypeLabel };
