/**
 * Deterministic vector charts for period-report PDFs.
 * Draws only values supplied by PeriodReportBrief — no interpolation, no engines.
 */

import { formatAllocationPercent } from "@/lib/services/classification";
import type { PeriodReportAllocationSlice } from "@/lib/services/periodIntelligence/periodReportBrief";
import type { PeriodReportImpactRow } from "@/lib/services/periodIntelligence/periodReportBrief";
import type { PeriodReportPerformanceChart } from "@/lib/services/periodIntelligence/periodReportBrief";
import type { PeriodReportScenarioBar } from "@/lib/services/periodIntelligence/periodReportBrief";
import type { PdfColor, PdfOp } from "@/lib/services/periodIntelligence/pdf/encodePdf";
import { PDF_PAGE } from "@/lib/services/periodIntelligence/pdf/encodePdf";
import {
  measurePdfText,
  sanitizePdfText,
  wrapPdfText,
} from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  PDF_EXPOSURE_COLOR,
  PDF_THEME,
} from "@/lib/services/periodIntelligence/pdf/pdfVisualSystem";

export type ChartSink = {
  addOp: (op: PdfOp) => void;
};

function pdfY(top: number, fontSize = 0): number {
  return PDF_PAGE.height - top - fontSize;
}

function fill(
  sink: ChartSink,
  x: number,
  top: number,
  w: number,
  h: number,
  color: PdfColor,
) {
  sink.addOp({
    op: "fill",
    x,
    y: PDF_PAGE.height - top - h,
    w,
    h,
    color,
  });
}

function stroke(
  sink: ChartSink,
  x: number,
  top: number,
  w: number,
  h: number,
  color: PdfColor,
  width = 0.6,
) {
  sink.addOp({
    op: "stroke",
    x,
    y: PDF_PAGE.height - top - h,
    w,
    h,
    color,
    width,
  });
}

function text(
  sink: ChartSink,
  value: string,
  x: number,
  top: number,
  size: number,
  color: PdfColor,
  bold = false,
) {
  sink.addOp({
    op: "text",
    x,
    y: pdfY(top, size),
    size,
    bold,
    color,
    text: sanitizePdfText(value),
  });
}

function rightText(
  sink: ChartSink,
  value: string,
  right: number,
  top: number,
  size: number,
  color: PdfColor,
  bold = false,
) {
  text(sink, value, right - measurePdfText(value, size), top, size, color, bold);
}

export function performanceChartHeight(): number {
  return 148;
}

export function drawPerformanceChart(
  sink: ChartSink,
  chart: PeriodReportPerformanceChart,
  box: { x: number; top: number; width: number },
): number {
  const height = performanceChartHeight();
  fill(sink, box.x, box.top, box.width, height, PDF_THEME.paper);
  stroke(sink, box.x, box.top, box.width, height, PDF_THEME.line, 0.7);

  text(sink, "Period performance", box.x + 12, box.top + 8, 9, PDF_THEME.navyMid, true);
  rightText(
    sink,
    chart.endValueLabel,
    box.x + box.width - 12,
    box.top + 8,
    12,
    PDF_THEME.navy,
    true,
  );

  const plotTop = box.top + 28;
  const plotHeight = 82;
  const plotLeft = box.x + 14;
  const plotWidth = box.width - 28;

  const values = chart.points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = chart.points.map((point, index) => {
    const x =
      plotLeft +
      (chart.points.length === 1
        ? plotWidth / 2
        : (index / (chart.points.length - 1)) * plotWidth);
    const yTop = plotTop + plotHeight - ((point.value - min) / span) * plotHeight;
    return { x, yTop, pdfY: PDF_PAGE.height - yTop };
  });

  const area: Array<{ x: number; y: number }> = [
    { x: coords[0]!.x, y: PDF_PAGE.height - (plotTop + plotHeight) },
    ...coords.map((point) => ({ x: point.x, y: point.pdfY })),
    {
      x: coords[coords.length - 1]!.x,
      y: PDF_PAGE.height - (plotTop + plotHeight),
    },
  ];
  sink.addOp({
    op: "polygon",
    points: area,
    color: PDF_THEME.chartFill,
  });

  for (let i = 1; i < coords.length; i += 1) {
    const prev = coords[i - 1]!;
    const next = coords[i]!;
    sink.addOp({
      op: "line",
      x1: prev.x,
      y1: prev.pdfY,
      x2: next.x,
      y2: next.pdfY,
      color: PDF_THEME.cyanDeep,
      width: 1.7,
    });
  }

  const start = coords[0]!;
  const end = coords[coords.length - 1]!;
  fill(sink, start.x - 2.2, start.yTop - 2.2, 4.4, 4.4, PDF_THEME.navy);
  fill(sink, end.x - 2.4, end.yTop - 2.4, 4.8, 4.8, PDF_THEME.cyanDeep);

  text(sink, chart.startLabel, plotLeft, box.top + height - 26, 8, PDF_THEME.muted);
  rightText(
    sink,
    chart.endLabel,
    plotLeft + plotWidth,
    box.top + height - 26,
    8,
    PDF_THEME.muted,
  );
  text(sink, chart.startValueLabel, plotLeft, box.top + height - 12, 8, PDF_THEME.ink, true);
  rightText(
    sink,
    chart.endValueLabel,
    plotLeft + plotWidth,
    box.top + height - 12,
    9,
    PDF_THEME.navy,
    true,
  );
  return height;
}

export function impactChartHeight(
  contributors: PeriodReportImpactRow[],
  detractors: PeriodReportImpactRow[],
): number {
  const rows = contributors.length + detractors.length;
  if (rows === 0) return 0;
  const headingBlocks = (contributors.length > 0 ? 16 : 0) + (detractors.length > 0 ? 16 : 0);
  return 8 + headingBlocks + rows * 38;
}

export function drawImpactChart(
  sink: ChartSink,
  contributors: PeriodReportImpactRow[],
  detractors: PeriodReportImpactRow[],
  box: { x: number; top: number; width: number },
): number {
  const height = impactChartHeight(contributors, detractors);
  if (height === 0) return 0;
  const all = [...contributors, ...detractors];
  const maxAbs = Math.max(...all.map((row) => Math.abs(row.contributionPp)), 0.1);
  const barMax = box.width - 132;
  let cursor = box.top;

  const drawGroup = (title: string, rows: PeriodReportImpactRow[], positive: boolean) => {
    if (rows.length === 0) return;
    text(sink, title, box.x, cursor, 8, positive ? PDF_THEME.mint : PDF_THEME.negative, true);
    cursor += 16;
    for (const row of rows) {
      const barWidth = Math.max(8, (Math.abs(row.contributionPp) / maxAbs) * barMax);
      text(sink, row.symbol, box.x, cursor, 10, PDF_THEME.ink, true);
      rightText(
        sink,
        row.contributionPpLabel,
        box.x + box.width,
        cursor,
        10,
        positive ? PDF_THEME.green : PDF_THEME.negative,
        true,
      );
      const move =
        row.holdingMoveLabel != null ? `${row.holdingMoveLabel} holding move` : "";
      if (move) {
        text(sink, move, box.x, cursor + 12, 8, PDF_THEME.muted);
      }
      fill(
        sink,
        box.x,
        cursor + 24,
        barWidth,
        8,
        positive ? PDF_THEME.mint : PDF_THEME.negative,
      );
      cursor += 38;
    }
  };

  drawGroup("TOP CONTRIBUTORS", contributors, true);
  drawGroup("DETRACTORS", detractors, false);
  return height;
}

export function allocationChartHeight(slices: PeriodReportAllocationSlice[]): number {
  if (slices.length === 0) return 0;
  return 12 + slices.length * 24;
}

export function drawAllocationChart(
  sink: ChartSink,
  slices: PeriodReportAllocationSlice[],
  box: { x: number; top: number; width: number },
): number {
  const height = allocationChartHeight(slices);
  if (height === 0) return 0;
  const max = Math.max(
    ...slices.map((slice) => (slice.rawPercent > 0 ? slice.rawPercent : slice.displayPercent)),
    0.1,
  );
  const labelWidth = 156;
  const valueWidth = 52;
  const barWidth = box.width - labelWidth - valueWidth - 8;
  let cursor = box.top;
  for (const slice of slices) {
    const color = PDF_EXPOSURE_COLOR[slice.groupId] ?? PDF_THEME.unclassified;
    const weight = slice.rawPercent > 0 ? slice.rawPercent : slice.displayPercent;
    const width = Math.max(4, (weight / max) * barWidth);
    const pct =
      slice.percentLabel ?? formatAllocationPercent(slice.rawPercent);
    text(sink, slice.label, box.x, cursor, 9, PDF_THEME.ink, true);
    fill(sink, box.x + labelWidth, cursor + 3, width, 10, color);
    rightText(sink, pct, box.x + box.width, cursor, 9, PDF_THEME.ink, true);
    cursor += 24;
  }
  return height;
}

export function goalChartHeight(): number {
  return 88;
}

export function drawGoalProgress(
  sink: ChartSink,
  input: {
    progressPercent: number;
    currentLabel: string;
    targetLabel: string;
  },
  box: { x: number; top: number; width: number },
): number {
  const height = goalChartHeight();
  fill(sink, box.x, box.top, box.width, height, PDF_THEME.paperOrange);
  stroke(sink, box.x, box.top, box.width, height, PDF_THEME.line, 0.6);
  text(sink, "GOAL PROGRESS", box.x + 12, box.top + 8, 8, PDF_THEME.orange, true);
  const pct = `${Math.round(input.progressPercent)}%`;
  text(sink, pct, box.x + 12, box.top + 22, 22, PDF_THEME.navy, true);
  text(sink, "of target", box.x + 12 + measurePdfText(pct, 22) + 8, box.top + 32, 9, PDF_THEME.muted);

  fill(sink, box.x + 12, box.top + 52, box.width - 24, 12, PDF_THEME.line);
  const fillWidth = Math.max(
    4,
    Math.min(
      box.width - 24,
      (Math.max(0, Math.min(input.progressPercent, 100)) / 100) * (box.width - 24),
    ),
  );
  fill(sink, box.x + 12, box.top + 52, fillWidth, 12, PDF_THEME.orange);
  text(sink, `Current ${input.currentLabel}`, box.x + 12, box.top + 70, 8, PDF_THEME.muted);
  rightText(
    sink,
    `Target ${input.targetLabel}`,
    box.x + box.width - 12,
    box.top + 70,
    8,
    PDF_THEME.muted,
  );
  return height;
}

export function scenarioChartHeight(rows: PeriodReportScenarioBar[]): number {
  if (rows.length === 0) return 0;
  return 40 + rows.length * 30;
}

export function drawScenarioChart(
  sink: ChartSink,
  rows: PeriodReportScenarioBar[],
  box: { x: number; top: number; width: number },
): number {
  const height = scenarioChartHeight(rows);
  if (height === 0) return 0;
  fill(sink, box.x, box.top, box.width, height, PDF_THEME.paperMint);
  stroke(sink, box.x, box.top, box.width, height, PDF_THEME.line, 0.6);
  text(sink, "MODELED SCENARIOS", box.x + 12, box.top + 8, 8, PDF_THEME.mint, true);
  text(
    sink,
    "MODELED SCENARIO  -  NOT FORECAST",
    box.x + 12,
    box.top + 20,
    8,
    PDF_THEME.muted,
    true,
  );
  const maxAbs = Math.max(...rows.map((row) => Math.abs(row.impactPercent)), 0.1);
  const labelWidth = 168;
  const barMax = box.width - labelWidth - 72;
  let cursor = box.top + 36;
  for (const row of rows) {
    const barWidth = Math.max(8, (Math.abs(row.impactPercent) / maxAbs) * barMax);
    text(sink, row.name, box.x + 12, cursor, 9, PDF_THEME.ink, true);
    fill(
      sink,
      box.x + labelWidth,
      cursor + 3,
      barWidth,
      11,
      row.impactPercent < 0 ? PDF_THEME.negative : PDF_THEME.mint,
    );
    rightText(
      sink,
      row.impactLabel,
      box.x + box.width - 12,
      cursor,
      9,
      row.impactPercent < 0 ? PDF_THEME.negative : PDF_THEME.mint,
      true,
    );
    cursor += 30;
  }
  return height;
}

export function wrappedBlockHeight(
  value: string,
  size: number,
  width: number,
  lineGap: number,
): number {
  const lines = wrapPdfText(value, size, width);
  if (lines.length === 0) return 0;
  return lines.length * (size + lineGap);
}
