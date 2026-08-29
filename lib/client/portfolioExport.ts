/**
 * Unified professional Portfolio Excel export.
 * Data workbook only — not the weekly/monthly PDF report.
 */

import * as XLSX from "xlsx-js-style";

import { BRAND } from "@/lib/brand";
import {
  holdingPriceStatusUserLabel,
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingDisplayPrice";
import { resolveHoldingChangePercent } from "@/lib/client/dailyPerformance";
import { buildHoldingVenuePresentation } from "@/lib/client/holdingVenuePresentation";
import {
  getHoldingCostBasis,
  getHoldingMarketValue,
  getHoldingReturnPercent,
} from "@/lib/client/holdingValuation";
import { buildValuedPositions } from "@/lib/client/portfolioAnalysis";
import {
  altBodyStyle,
  BODY_ROW_HEIGHT_PT,
  bodyStyle,
  EXCEL_DATE_FORMAT,
  EXCEL_MARGINS,
  excelSerialFromIsoDate,
  headerStyle,
  labelStyle,
  landscapePrintSetup,
  moneyFormat,
  noteStyle,
  percentFormat,
  portraitPrintSetup,
  sectionStyle,
  styled,
  subtitleStyle,
  TITLE_ROW_HEIGHT_PT,
  titleStyle,
  valueStyle,
  wrappedRowHeightPt,
  type ExcelCellStyle,
  type StyledExcelCell,
} from "@/lib/client/portfolioExportStyle";
import {
  activitySourceLabel,
  activityTypeLabel,
  mapHoldingsForHistoryExport,
  PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE,
  sanitizeExcelCellValue,
} from "@/lib/client/portfolioHistoryExport";
import {
  buildPortfolioExposureAllocation,
  classifyHoldingExposure,
} from "@/lib/services/classification";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import {
  buildPortfolioFundingHistory,
  fundingCoverageLabel,
  NET_RECORDED_FUNDING_LABEL,
  RECORDED_CONTRIBUTIONS_LABEL,
  RECORDED_WITHDRAWALS_LABEL,
  type PortfolioFundingHistory,
} from "@/lib/services/contributions/portfolioFundingHistory";
import type { PortfolioTimeline } from "@/lib/services/portfolio/timeline";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const PORTFOLIO_EXPORT_VERSION = "18.1";

export const PARTIAL_HISTORY_RETURN_NOTE =
  "Tobailey does not calculate lifetime return from partial contribution history.";

export const PORTFOLIO_EXPORT_EMPTY_MESSAGE =
  "There is nothing to export yet. Add holdings or contribution activity first.";

export const PORTFOLIO_EXPORT_FAILURE_MESSAGE =
  PORTFOLIO_HISTORY_EXPORT_FAILURE_MESSAGE;

export const PORTFOLIO_EXPORT_SUCCESS_MESSAGE = "Portfolio exported.";

export const PORTFOLIO_SUMMARY_SHEET = "Portfolio Summary";
export const HOLDINGS_SHEET = "Holdings";
export const CONTRIBUTIONS_SHEET = "Contributions & Withdrawals";
export const PORTFOLIO_HISTORY_SHEET = "Portfolio History";
export const ALLOCATION_SHEET = "Allocation & Exposure";
export const DATA_NOTES_SHEET = "Data Notes";

export type PortfolioExportGoalSheet = {
  goal: GoalSettings;
  hasSavedGoal: boolean;
  currentProgressPercent?: number | null;
  remainingAmount?: number | null;
  statusLabel?: string | null;
};

export type PortfolioExportInput = {
  holdings: StoredPortfolioHolding[];
  entries: PortfolioContributionEntry[];
  portfolioBaseCurrency: PortfolioBaseCurrency;
  portfolioValueAvailable: boolean;
  exportedAt?: Date;
  portfolioName?: string | null;
  timeline?: PortfolioTimeline | null;
  fundingHistory?: PortfolioFundingHistory | null;
  goals?: PortfolioExportGoalSheet | null;
  convertEur?: (value: number) => number | null;
};

type CellValue = string | number | StyledExcelCell;

function cell(
  value: string | number | null,
  style?: Parameters<typeof styled>[1],
  numFmt?: string,
): CellValue {
  const sanitized =
    typeof value === "string" ? sanitizeExcelCellValue(value) : value;
  if (typeof sanitized === "number") {
    return styled(sanitized, style, numFmt);
  }
  return styled(sanitized, style);
}

function moneyCell(
  value: number | null,
  currency: string,
  style = valueStyle,
): CellValue {
  if (value == null || !Number.isFinite(value)) {
    return styled("Unavailable", style);
  }
  return styled(Math.round(value * 100) / 100, style, moneyFormat(currency));
}

function percentCell(value: number | null, style = bodyStyle): CellValue {
  if (value == null || !Number.isFinite(value)) {
    return styled("Unavailable", style);
  }
  return styled(Math.round(value * 10) / 10, style, percentFormat());
}

function convertValue(
  value: number | null,
  convertEur?: (value: number) => number | null,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (!convertEur) return value;
  const converted = convertEur(value);
  return converted == null || !Number.isFinite(converted) ? null : converted;
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

function cellDisplayText(value: CellValue): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "object" && "v" in value && value.v != null) {
    return String(value.v);
  }
  return "";
}

function cellFontSize(value: CellValue): number {
  if (typeof value === "object" && value && "s" in value) {
    return value.s?.font?.sz ?? 11;
  }
  return 11;
}

function cellWraps(value: CellValue): boolean {
  if (typeof value === "object" && value && "s" in value) {
    return Boolean(value.s?.alignment?.wrapText);
  }
  return false;
}

function titleBand(title: string, columnCount: number): CellValue[] {
  return Array.from({ length: columnCount }, (_, index) =>
    cell(index === 0 ? title : "", titleStyle),
  );
}

function fillRow(
  row: CellValue[],
  columnCount: number,
  fill: ExcelCellStyle,
): CellValue[] {
  const next = row.slice(0, columnCount);
  while (next.length < columnCount) {
    next.push(cell("", fill));
  }
  return next;
}

function calendarDateCell(isoDate: string, style: ExcelCellStyle): CellValue {
  const serial = excelSerialFromIsoDate(isoDate);
  if (serial == null) {
    return cell(isoDate, style);
  }
  return styled(serial, style, EXCEL_DATE_FORMAT);
}

function mergeWidth(
  widths: number[],
  startCol: number,
  endCol: number,
): number {
  return widths.slice(startCol, endCol + 1).reduce((sum, width) => sum + width, 0);
}

function heightForRow(
  row: CellValue[],
  widths: number[],
  merges: XLSX.Range[] | undefined,
  rowIndex: number,
  isTitle: boolean,
): number {
  if (isTitle) return TITLE_ROW_HEIGHT_PT;

  const rowMerges = (merges ?? []).filter(
    (range) => range.s.r === rowIndex && range.e.r === rowIndex,
  );
  let tallest = BODY_ROW_HEIGHT_PT;

  for (const [index, value] of row.entries()) {
    const text = cellDisplayText(value);
    if (!text || !cellWraps(value)) continue;
    const merge = rowMerges.find(
      (range) => index >= range.s.c && index <= range.e.c,
    );
    const width = merge
      ? mergeWidth(widths, merge.s.c, merge.e.c)
      : (widths[index] ?? 12);
    tallest = Math.max(
      tallest,
      wrappedRowHeightPt(text, width, cellFontSize(value)),
    );
  }

  return tallest;
}

type SheetLayoutOptions = {
  freezeRows?: number;
  filterRange?: string;
  landscape?: boolean;
  titleRows?: number[];
  merges?: XLSX.Range[];
};

function finishSheet(
  sheet: XLSX.WorkSheet,
  rows: CellValue[][],
  widths: number[],
  options: SheetLayoutOptions = {},
): void {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  sheet["!rows"] = rows.map((row, index) => ({
    hpt: heightForRow(
      row,
      widths,
      options.merges,
      index,
      Boolean(options.titleRows?.includes(index)),
    ),
  }));
  if (options.merges && options.merges.length > 0) {
    sheet["!merges"] = options.merges;
  }
  // xlsx-js-style 1.2.0 writes <sheetView workbookViewId="0"/> only.
  // Freeze metadata is kept in memory but is not serialized. Do not patch XML.
  if (options.freezeRows && options.freezeRows > 0) {
    sheet["!views"] = [
      {
        state: "frozen",
        ySplit: options.freezeRows,
        topLeftCell: `A${options.freezeRows + 1}`,
        activeCell: `A${options.freezeRows + 1}`,
      },
    ];
  }
  if (options.filterRange) {
    sheet["!autofilter"] = { ref: options.filterRange };
  }
  // Page orientation / fit-to-page is also not serialized by xlsx-js-style.
  sheet["!pageSetup"] = options.landscape
    ? landscapePrintSetup()
    : portraitPrintSetup();
  sheet["!margins"] = EXCEL_MARGINS;
}

function appendAoA(
  workbook: XLSX.WorkBook,
  name: string,
  rows: CellValue[][],
  widths: number[],
  options?: SheetLayoutOptions,
): void {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  finishSheet(sheet, rows, widths, options);
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatAsOf(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function venueLabel(holding: StoredPortfolioHolding): string {
  const venue = buildHoldingVenuePresentation({
    exchange: holding.exchange,
    pricingExchange: holding.pricingExchange,
    providerSymbol: holding.providerSymbol,
    instrumentName: holding.instrumentName,
    name: holding.name,
  });
  return (
    venue.pricingExchangeLabel ||
    venue.purchaseExchangeLabel ||
    holding.exchange ||
    ""
  );
}

export function buildPortfolioExportFilename(exportedAt = new Date()): string {
  const stamp = exportedAt.toISOString().slice(0, 10);
  return `Tobailey-Portfolio-${stamp}.xlsx`;
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

function resolveFunding(
  input: PortfolioExportInput,
  currentValue: number | null,
): PortfolioFundingHistory {
  return (
    input.fundingHistory ??
    buildPortfolioFundingHistory({
      entries: input.entries,
      currentPortfolioValueBase: currentValue,
      portfolioBaseCurrency: input.portfolioBaseCurrency,
    })
  );
}

function appendSummarySheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
  exportedAt: Date,
  funding: PortfolioFundingHistory,
  currentValue: number | null,
): void {
  const currency = input.portfolioBaseCurrency;
  const valued = buildValuedPositions(input.holdings);
  const exposure = buildPortfolioExposureAllocation(input.holdings);
  const cashGroup = exposure.groups.find((group) => group.groupId === "cash");
  const largestHolding = valued.valuedPositions[0] ?? null;
  const largestGroup = exposure.groups[0] ?? null;
  const incomplete = funding.historyCoverage === "partial";
  const widths = [36, 42];

  const rows: CellValue[][] = [
    titleBand(BRAND.name.toUpperCase(), widths.length),
    fillRow([cell("Portfolio Summary", subtitleStyle)], widths.length, subtitleStyle),
    [cell("Portfolio value", labelStyle), moneyCell(currentValue, currency)],
    [cell("As of", labelStyle), cell(formatAsOf(exportedAt), valueStyle)],
    [cell("Base currency", labelStyle), cell(currency, valueStyle)],
    [
      cell("Portfolio name", labelStyle),
      cell(input.portfolioName?.trim() || "Personal portfolio", valueStyle),
    ],
    [],
    fillRow([cell("Snapshot", sectionStyle)], widths.length, sectionStyle),
    [cell("Holdings count", labelStyle), styled(input.holdings.length, valueStyle)],
    [
      cell("Cash", labelStyle),
      moneyCell(
        cashGroup ? convertValue(cashGroup.value, input.convertEur) : 0,
        currency,
      ),
    ],
    [
      cell("Largest holding", labelStyle),
      cell(
        largestHolding
          ? `${largestHolding.holding.symbol} · ${largestHolding.holding.name}`
          : "—",
        valueStyle,
      ),
    ],
    [
      cell("Largest allocation", labelStyle),
      cell(
        largestGroup
          ? `${largestGroup.displayLabel} · ${largestGroup.displayPercent}%`
          : "—",
        valueStyle,
      ),
    ],
    [],
    fillRow([cell("Recorded funding", sectionStyle)], widths.length, sectionStyle),
    [
      cell(RECORDED_CONTRIBUTIONS_LABEL, labelStyle),
      moneyCell(funding.contributions, currency),
    ],
    [
      cell(RECORDED_WITHDRAWALS_LABEL, labelStyle),
      moneyCell(funding.withdrawals, currency),
    ],
    [
      cell(NET_RECORDED_FUNDING_LABEL, labelStyle),
      moneyCell(funding.netRecordedContributions, currency),
    ],
    [
      cell("History coverage", labelStyle),
      cell(fundingCoverageLabel(funding.historyCoverage), incomplete ? noteStyle : valueStyle),
    ],
    [
      cell("Recorded activity", labelStyle),
      cell(
        funding.activityCount === 0
          ? "None"
          : `${funding.activityCount} ${funding.activityCount === 1 ? "entry" : "entries"}`,
        valueStyle,
      ),
    ],
  ];

  const merges: XLSX.Range[] = [];
  if (incomplete) {
    const returnNoteRow = rows.length;
    rows.push(
      fillRow(
        [cell(PARTIAL_HISTORY_RETURN_NOTE, noteStyle)],
        widths.length,
        noteStyle,
      ),
    );
    merges.push({
      s: { r: returnNoteRow, c: 0 },
      e: { r: returnNoteRow, c: widths.length - 1 },
    });
  }

  if (input.goals?.hasSavedGoal) {
    rows.push(
      [],
      fillRow([cell("Goal", sectionStyle)], widths.length, sectionStyle),
      [
        cell("Target value", labelStyle),
        moneyCell(input.goals.goal.targetValue, currency),
      ],
      [cell("Target year", labelStyle), styled(input.goals.goal.targetYear, valueStyle)],
      [
        cell("Status", labelStyle),
        cell(input.goals.statusLabel ?? "Saved", valueStyle),
      ],
    );
  }

  if (exposure.hasAnyValue) {
    rows.push([], fillRow([cell("Allocation", sectionStyle)], widths.length, sectionStyle));
    rows.push([
      cell("Group", headerStyle),
      cell("Portfolio %", headerStyle),
    ]);
    for (const [index, group] of exposure.groups.entries()) {
      const rowStyle = index % 2 === 1 ? altBodyStyle : bodyStyle;
      rows.push([
        cell(group.displayLabel, rowStyle),
        percentCell(group.rawPercent, rowStyle),
      ]);
    }
  }

  appendAoA(workbook, PORTFOLIO_SUMMARY_SHEET, rows, widths, {
    freezeRows: 2,
    landscape: false,
    titleRows: [0, 1],
    merges,
  });
}

function appendHoldingsSheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
): void {
  const currency = input.portfolioBaseCurrency;
  const valued = buildValuedPositions(input.holdings);
  const valueById = new Map(
    valued.valuedPositions.map((row) => [row.holding.id, row]),
  );
  const widths = [36, 10, 14, 18, 22, 10, 16, 12, 14, 16, 14, 12, 12, 10];
  const header = [
    "Holding",
    "Ticker",
    "ISIN",
    "Exchange / venue",
    "Exposure category",
    "Units",
    "Average purchase price",
    "Price",
    "Price status",
    "Position value",
    "Portfolio weight",
    "Day move",
    "Total return",
    "Currency",
  ].map((label) => cell(label, headerStyle));

  const rows: CellValue[][] = [
    titleBand(`${BRAND.name} · Holdings`, widths.length),
    header,
  ];

  for (const [index, holding] of input.holdings.entries()) {
    const rowStyle = index % 2 === 1 ? altBodyStyle : bodyStyle;
    const display = resolveHoldingDisplayPrice(holding);
    const classified = classifyHoldingExposure(holding);
    const valuedRow = valueById.get(holding.id);
    const marketValue = convertValue(
      valuedRow?.value ?? getHoldingMarketValue(holding),
      input.convertEur,
    );
    const purchasePrice =
      Number.isFinite(holding.purchasePrice) && holding.purchasePrice > 0
        ? holding.purchasePrice
        : null;
    const displayPrice = display.price;
    const dayMove = resolveHoldingChangePercent(holding);
    const includeReturn =
      display.source !== "estimated" &&
      display.source !== "unavailable" &&
      getHoldingCostBasis(holding) > 0 &&
      marketValue != null;
    const totalReturn = includeReturn ? getHoldingReturnPercent(holding) : null;

    rows.push([
      cell(holding.name, rowStyle),
      cell(holding.symbol, rowStyle),
      cell(holding.isin?.trim() || "", rowStyle),
      cell(venueLabel(holding), rowStyle),
      cell(classified.displayLabel, rowStyle),
      styled(holding.quantity, rowStyle),
      purchasePrice == null
        ? styled("Unavailable", rowStyle)
        : styled(purchasePrice, rowStyle, moneyFormat(currency)),
      displayPrice == null || display.source === "unavailable"
        ? styled("Unavailable", rowStyle)
        : styled(displayPrice, rowStyle, moneyFormat(holding.quoteCurrency ?? currency)),
      cell(holdingPriceStatusUserLabel(display.source), rowStyle),
      moneyCell(marketValue, currency, rowStyle),
      percentCell(valuedRow?.weightPercent ?? null, rowStyle),
      percentCell(dayMove, rowStyle),
      percentCell(totalReturn, rowStyle),
      cell(holding.currency, rowStyle),
    ]);
  }

  const lastRow = rows.length;
  appendAoA(workbook, HOLDINGS_SHEET, rows, widths, {
    freezeRows: 2,
    filterRange: lastRow > 2 ? `A2:N${lastRow}` : undefined,
    landscape: true,
    titleRows: [0],
  });
}

function appendContributionsSheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
  funding: PortfolioFundingHistory,
): void {
  const currency = input.portfolioBaseCurrency;
  const widths = [16, 22, 14, 12, 42];
  const rows: CellValue[][] = [
    titleBand(`${BRAND.name} · Contributions & Withdrawals`, widths.length),
    [cell(RECORDED_CONTRIBUTIONS_LABEL, labelStyle), moneyCell(funding.contributions, currency)],
    [cell(RECORDED_WITHDRAWALS_LABEL, labelStyle), moneyCell(funding.withdrawals, currency)],
    [cell(NET_RECORDED_FUNDING_LABEL, labelStyle), moneyCell(funding.netRecordedContributions, currency)],
    [
      cell("History coverage", labelStyle),
      cell(fundingCoverageLabel(funding.historyCoverage), noteStyle),
    ],
  ];

  if (funding.historyCoverage === "partial") {
    rows.push(
      fillRow(
        [cell(PARTIAL_HISTORY_RETURN_NOTE, noteStyle)],
        widths.length,
        noteStyle,
      ),
    );
  }

  rows.push([]);
  const headerRowIndex = rows.length + 1;
  rows.push(
    [
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Note / source",
    ].map((label) => cell(label, headerStyle)),
  );

  const sorted = sortEntriesChronologically(input.entries);
  if (sorted.length === 0) {
    rows.push([
      cell("No recorded contributions or withdrawals.", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
    ]);
  } else {
    for (const [index, entry] of sorted.entries()) {
      const rowStyle = index % 2 === 1 ? altBodyStyle : bodyStyle;
      const note = [entry.note, activitySourceLabel(entry)]
        .filter((part) => part && String(part).trim())
        .join(" · ");
      rows.push([
        calendarDateCell(entry.entryDate, rowStyle),
        cell(activityTypeLabel(entry), rowStyle),
        styled(Math.round(entry.baseAmount * 100) / 100, rowStyle, moneyFormat(entry.baseCurrency)),
        cell(entry.baseCurrency, rowStyle),
        cell(note, rowStyle),
      ]);
    }
  }

  const lastRow = rows.length;
  const contributionMerges: XLSX.Range[] = [];
  if (funding.historyCoverage === "partial") {
    contributionMerges.push({
      s: { r: 5, c: 0 },
      e: { r: 5, c: widths.length - 1 },
    });
  }
  appendAoA(workbook, CONTRIBUTIONS_SHEET, rows, widths, {
    freezeRows: headerRowIndex,
    filterRange: sorted.length > 0 ? `A${headerRowIndex}:E${lastRow}` : undefined,
    landscape: true,
    titleRows: [0],
    merges: contributionMerges.length > 0 ? contributionMerges : undefined,
  });
}

function appendHistorySheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
  funding: PortfolioFundingHistory,
): void {
  const currency = input.portfolioBaseCurrency;
  const timeline = input.timeline;
  const widths = [16, 18, 36, 28, 24];
  const lastCol = widths.length - 1;
  const rows: CellValue[][] = [
    titleBand(`${BRAND.name} · Portfolio History`, widths.length),
    fillRow(
      [
        cell(
          "Sparse recorded history only. Tobailey does not manufacture daily values or infer deposits from current holdings.",
          noteStyle,
        ),
      ],
      widths.length,
      noteStyle,
    ),
    fillRow(
      [
        cell("History coverage", labelStyle),
        cell(fundingCoverageLabel(funding.historyCoverage), noteStyle),
      ],
      widths.length,
      noteStyle,
    ),
    [],
    [
      "Date",
      "Portfolio value",
      "Contribution / withdrawal activity",
      "Milestone / context",
      "Data coverage",
    ].map((label) => cell(label, headerStyle)),
  ];

  const valuePoints = timeline?.valueSeries ?? [];
  const eventsByDate = new Map<string, string[]>();
  for (const event of timeline?.events ?? []) {
    const current = eventsByDate.get(event.date) ?? [];
    current.push(event.title);
    eventsByDate.set(event.date, current);
  }

  const dates = new Set<string>([
    ...valuePoints.map((point) => point.date),
    ...[...eventsByDate.keys()],
  ]);
  const ordered = [...dates].sort();

  if (ordered.length === 0) {
    rows.push([
      cell("No trustworthy historical portfolio values are available yet.", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
      cell("", noteStyle),
    ]);
  } else {
    for (const [index, date] of ordered.entries()) {
      const rowStyle = index % 2 === 1 ? altBodyStyle : bodyStyle;
      const point = valuePoints.find((row) => row.date === date);
      const activity = (eventsByDate.get(date) ?? [])
        .filter((title) => title !== "Portfolio history started")
        .join("; ");
      const milestone = (eventsByDate.get(date) ?? []).includes(
        "Portfolio history started",
      )
        ? "Portfolio history started"
        : "";
      rows.push([
        calendarDateCell(date, rowStyle),
        point
          ? moneyCell(
              convertValue(point.portfolioValue, input.convertEur),
              currency,
              rowStyle,
            )
          : styled("", rowStyle),
        cell(activity, rowStyle),
        cell(milestone, rowStyle),
        cell(
          point ? "Recorded value snapshot" : "Recorded activity only",
          rowStyle,
        ),
      ]);
    }
  }

  const lastRow = rows.length;
  appendAoA(workbook, PORTFOLIO_HISTORY_SHEET, rows, widths, {
    freezeRows: 5,
    filterRange: ordered.length > 0 ? `A5:E${lastRow}` : undefined,
    landscape: true,
    titleRows: [0],
    merges: [
      { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
      { s: { r: 2, c: 1 }, e: { r: 2, c: lastCol } },
    ],
  });
}

function appendAllocationSheet(
  workbook: XLSX.WorkBook,
  input: PortfolioExportInput,
): void {
  const currency = input.portfolioBaseCurrency;
  const exposure = buildPortfolioExposureAllocation(input.holdings);
  const widths = [28, 16, 14, 48];
  const lastCol = widths.length - 1;
  const rows: CellValue[][] = [
    titleBand(`${BRAND.name} · Allocation & Exposure`, widths.length),
    fillRow(
      [
        cell(
          "Whole-instrument classification from Tobailey's canonical exposure groups. Other / Unclassified remains visible.",
          noteStyle,
        ),
      ],
      widths.length,
      noteStyle,
    ),
    [],
    ["Allocation group", "Value", "Portfolio %", "Holdings contributing to group"].map(
      (label) => cell(label, headerStyle),
    ),
  ];

  if (!exposure.hasAnyValue) {
    rows.push([
      cell("No valued holdings are available for allocation.", noteStyle),
    ]);
  } else {
    for (const [index, group] of exposure.groups.entries()) {
      const rowStyle = index % 2 === 1 ? altBodyStyle : bodyStyle;
      rows.push([
        cell(group.displayLabel, rowStyle),
        moneyCell(convertValue(group.value, input.convertEur), currency, rowStyle),
        percentCell(group.rawPercent, rowStyle),
        cell(group.holdings.map((row) => row.symbol).join(", "), rowStyle),
      ]);
    }
  }

  const lastRow = rows.length;
  appendAoA(workbook, ALLOCATION_SHEET, rows, widths, {
    freezeRows: 4,
    filterRange: exposure.hasAnyValue ? `A4:D${lastRow}` : undefined,
    landscape: true,
    titleRows: [0],
    merges: [{ s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } }],
  });
}

function appendNotesSheet(
  workbook: XLSX.WorkBook,
  exportedAt: Date,
): void {
  const widths = [28, 72];
  const lastCol = widths.length - 1;
  const paragraph = (text: string): CellValue[] =>
    fillRow([cell(text, noteStyle)], widths.length, noteStyle);
  const section = (text: string): CellValue[] =>
    fillRow([cell(text, sectionStyle)], widths.length, sectionStyle);

  const rows: CellValue[][] = [
    titleBand(`${BRAND.name} · Data Notes`, widths.length),
    [cell("Generated by", labelStyle), cell(BRAND.name, valueStyle)],
    [cell("Generated at", labelStyle), cell(formatTimestamp(exportedAt), valueStyle)],
    [cell("Portfolio as-of", labelStyle), cell(formatAsOf(exportedAt), valueStyle)],
    [cell("Workbook version", labelStyle), cell(PORTFOLIO_EXPORT_VERSION, valueStyle)],
    [],
    section("Price status"),
    [cell("Current", labelStyle), cell("A usable current market price.", bodyStyle)],
    [cell("Delayed", labelStyle), cell("A delayed market quote. Never labelled Live.", bodyStyle)],
    [cell("Last session", labelStyle), cell("Most recent exchange session price.", bodyStyle)],
    [cell("Estimated", labelStyle), cell("Fallback estimate, not a live quote.", bodyStyle)],
    [
      cell("Price unavailable", labelStyle),
      cell("No usable price. The export never turns this into €0.", bodyStyle),
    ],
    [],
    section("Recorded contributions"),
    paragraph(
      "Recorded contributions are ledger entries Tobailey knows about. They are not automatically complete lifetime contributions.",
    ),
    paragraph(
      "Partial history is never used to invent portfolio return or a lifetime gain figure.",
    ),
    paragraph(
      "Opening balance appears only when it was explicitly stored as an opening contribution.",
    ),
    [],
    section("Allocation"),
    paragraph(
      "Allocation uses the same classifyHoldingExposure → buildPortfolioExposureAllocation path as Dashboard and Analysis.",
    ),
    [],
    paragraph(
      "This workbook is a professional data export. It is not the Weekly or Monthly Tobailey PDF report.",
    ),
    paragraph(
      "Tobailey explains portfolio characteristics. It does not provide personal investment advice.",
    ),
  ];

  appendAoA(workbook, DATA_NOTES_SHEET, rows, widths, {
    freezeRows: 1,
    landscape: false,
    titleRows: [0],
    merges: [14, 15, 16, 19, 21, 22].map((rowIndex) => ({
      s: { r: rowIndex, c: 0 },
      e: { r: rowIndex, c: lastCol },
    })),
  });
}

export function buildPortfolioWorkbook(input: PortfolioExportInput): XLSX.WorkBook {
  if (!canExportPortfolio(input)) {
    throw new Error(PORTFOLIO_EXPORT_EMPTY_MESSAGE);
  }

  const exportedAt = input.exportedAt ?? new Date();
  const currentValue = input.portfolioValueAvailable
    ? convertValue(
        input.timeline?.summary.currentPortfolioValue ??
          buildValuedPositions(input.holdings).totalValue,
        input.convertEur,
      )
    : null;
  const funding = resolveFunding(input, currentValue);
  const workbook = XLSX.utils.book_new();

  appendSummarySheet(workbook, input, exportedAt, funding, currentValue);
  appendHoldingsSheet(workbook, input);
  appendContributionsSheet(workbook, input, funding);
  appendHistorySheet(workbook, input, funding);
  appendAllocationSheet(workbook, input);
  appendNotesSheet(workbook, exportedAt);

  return workbook;
}

export function downloadPortfolioWorkbook(input: PortfolioExportInput): string {
  const workbook = buildPortfolioWorkbook(input);
  const filename = buildPortfolioExportFilename(input.exportedAt);
  const bytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
    cellStyles: true,
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
