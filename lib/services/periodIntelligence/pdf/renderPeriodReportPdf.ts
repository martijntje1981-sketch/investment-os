/**
 * Canonical weekly/monthly PDF renderer.
 * Consumes PeriodIntelligenceReview via toPersonalReportViewModel (+ optional brief).
 * No performance, change, goal, resilience, or fixed-income calculations.
 */

import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";
import {
  PERIOD_Q2_QUIET_COPY,
  PERIOD_Q4_QUIET_COPY,
} from "@/lib/services/periodIntelligence/config";
import type {
  PeriodReportBrief,
  PeriodReportCoverHighlight,
} from "@/lib/services/periodIntelligence/periodReportBrief";
import { toPersonalReportViewModel } from "@/lib/services/periodIntelligence/reportViewModel";
import type {
  PersonalReportAccent,
  PersonalReportSectionView,
  PersonalReportViewModel,
} from "@/lib/services/periodIntelligence/reportViewModel";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import {
  encodePdfPages,
  PDF_PAGE,
  type PdfColor,
  type PdfOp,
  type PdfPageOps,
} from "@/lib/services/periodIntelligence/pdf/encodePdf";
import {
  drawAllocationChart,
  allocationChartHeight,
  drawGoalProgress,
  drawImpactChart,
  drawPerformanceChart,
  drawScenarioChart,
  goalChartHeight,
  impactChartHeight,
  performanceChartHeight,
  scenarioChartHeight,
} from "@/lib/services/periodIntelligence/pdf/pdfCharts";
import {
  measurePdfText,
  sanitizePdfText,
  wrapPdfText,
} from "@/lib/services/periodIntelligence/pdf/pdfText";
import {
  PDF_LAYOUT,
  PDF_QUESTION_ACCENT,
  PDF_QUESTION_TINT,
  PDF_SECTION_ACCENT,
  PDF_THEME,
} from "@/lib/services/periodIntelligence/pdf/pdfVisualSystem";

const MARGIN_X = PDF_LAYOUT.marginX;
const MARGIN_BOTTOM = PDF_LAYOUT.marginBottom;
const CONTENT_WIDTH = PDF_PAGE.width - MARGIN_X * 2;

export { sanitizePdfText, measurePdfText, wrapPdfText };

function topToPdfY(topY: number, fontSize = 0): number {
  return PDF_PAGE.height - topY - fontSize;
}

type Painter = {
  pages: PdfPageOps[];
  pageIndex: number;
  y: number;
  header: { brand: string; period: string } | null;
};

function currentPage(painter: Painter): PdfPageOps {
  return painter.pages[painter.pageIndex]!;
}

function addOp(painter: Painter, op: PdfOp) {
  currentPage(painter).push(op);
}

function remaining(painter: Painter): number {
  return PDF_PAGE.height - MARGIN_BOTTOM - painter.y;
}

function drawRunningHeader(painter: Painter) {
  if (!painter.header) return;
  addOp(painter, {
    op: "fill",
    x: 0,
    y: PDF_PAGE.height - 24,
    w: PDF_PAGE.width,
    h: 24,
    color: PDF_THEME.paper,
  });
  addOp(painter, {
    op: "text",
    x: MARGIN_X,
    y: topToPdfY(7, 8),
    size: 8,
    bold: true,
    color: PDF_THEME.navy,
    text: sanitizePdfText(painter.header.brand),
  });
  addOp(painter, {
    op: "text",
    x: PDF_PAGE.width - MARGIN_X - measurePdfText(painter.header.period, 8),
    y: topToPdfY(7, 8),
    size: 8,
    bold: false,
    color: PDF_THEME.muted,
    text: sanitizePdfText(painter.header.period),
  });
}

function drawFooter(painter: Painter, pageNumber: number, periodLabel: string) {
  addOp(painter, {
    op: "line",
    x1: MARGIN_X,
    y1: MARGIN_BOTTOM - 8,
    x2: PDF_PAGE.width - MARGIN_X,
    y2: MARGIN_BOTTOM - 8,
    color: PDF_THEME.line,
    width: 0.5,
  });
  addOp(painter, {
    op: "text",
    x: MARGIN_X,
    y: 20,
    size: 7.5,
    bold: false,
    color: PDF_THEME.muted,
    text: sanitizePdfText(
      `Tobailey  -  ${periodLabel}  -  Information and analysis only - not financial advice.`,
    ),
  });
  const label = String(pageNumber);
  addOp(painter, {
    op: "text",
    x: PDF_PAGE.width - MARGIN_X - measurePdfText(label, 8),
    y: 20,
    size: 8,
    bold: false,
    color: PDF_THEME.muted,
    text: label,
  });
}

function beginPage(painter: Painter, withHeader: boolean, periodLabel: string) {
  painter.pages.push([]);
  painter.pageIndex = painter.pages.length - 1;
  painter.y = withHeader ? 36 : PDF_LAYOUT.contentTop;
  drawFooter(painter, painter.pages.length, periodLabel);
  if (withHeader) drawRunningHeader(painter);
}

function ensureSpace(painter: Painter, needed: number, periodLabel: string) {
  if (remaining(painter) >= needed) return;
  beginPage(painter, true, periodLabel);
}

function fillRect(
  painter: Painter,
  x: number,
  top: number,
  w: number,
  h: number,
  color: PdfColor,
) {
  addOp(painter, {
    op: "fill",
    x,
    y: PDF_PAGE.height - top - h,
    w,
    h,
    color,
  });
}

function drawRaw(
  painter: Painter,
  value: string,
  x: number,
  size: number,
  bold: boolean,
  color: PdfColor,
) {
  addOp(painter, {
    op: "text",
    x,
    y: topToPdfY(painter.y, size),
    size,
    bold,
    color,
    text: sanitizePdfText(value),
  });
}

function drawText(
  painter: Painter,
  value: string,
  opts: {
    size: number;
    bold?: boolean;
    color: PdfColor;
    x?: number;
    maxWidth?: number;
    lineGap?: number;
    periodLabel: string;
  },
): number {
  const size = opts.size;
  const x = opts.x ?? MARGIN_X;
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
  const lineGap = opts.lineGap ?? size * 0.32;
  const lines = wrapPdfText(value, size, maxWidth);
  for (const line of lines) {
    ensureSpace(painter, size + lineGap, opts.periodLabel);
    addOp(painter, {
      op: "text",
      x,
      y: topToPdfY(painter.y, size),
      size,
      bold: Boolean(opts.bold),
      color: opts.color,
      text: line,
    });
    painter.y += size + lineGap;
  }
  return lines.length;
}

function questionMeta(id: FourQuestionId) {
  const def = FOUR_QUESTIONS.find((row) => row.id === id)!;
  return {
    number: def.numberLabel,
    title: def.question.toUpperCase(),
    accent: PDF_QUESTION_ACCENT[id],
    tint: PDF_QUESTION_TINT[id],
  };
}

function drawQuestionHeader(
  painter: Painter,
  id: FourQuestionId,
  periodLabel: string,
) {
  const meta = questionMeta(id);
  ensureSpace(painter, 110, periodLabel);
  fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 30, meta.tint);
  fillRect(painter, MARGIN_X, painter.y, 4, 30, meta.accent);
  addOp(painter, {
    op: "line",
    x1: MARGIN_X,
    y1: topToPdfY(painter.y, 0),
    x2: MARGIN_X + CONTENT_WIDTH,
    y2: topToPdfY(painter.y, 0),
    color: meta.accent,
    width: 1.1,
  });
  painter.y += 8;
  drawText(painter, `${meta.number}  ${meta.title}`, {
    size: 10,
    bold: true,
    color: meta.accent,
    x: MARGIN_X + 14,
    periodLabel,
  });
  painter.y += 8;
}

function drawNarrative(
  painter: Painter,
  section: PersonalReportSectionView | undefined,
  accent: PersonalReportAccent,
  periodLabel: string,
) {
  if (!section) return;
  drawText(painter, section.headline, {
    size: 12,
    bold: true,
    color: PDF_THEME.ink,
    lineGap: 4,
    periodLabel,
  });
  if (section.whyItMatters) {
    painter.y += 3;
    drawText(painter, section.whyItMatters, {
      size: 10,
      color: PDF_THEME.muted,
      lineGap: 3.5,
      periodLabel,
    });
  }
  if (section.evidence.length > 0) {
    painter.y += 6;
    for (const item of section.evidence) {
      ensureSpace(painter, 16, periodLabel);
      addOp(painter, {
        op: "fill",
        x: MARGIN_X,
        y: topToPdfY(painter.y + 6, 0) - 1.5,
        w: 3,
        h: 3,
        color: PDF_SECTION_ACCENT[accent],
      });
      drawText(painter, item, {
        size: 10,
        color: PDF_THEME.ink,
        x: MARGIN_X + 12,
        maxWidth: CONTENT_WIDTH - 12,
        lineGap: 3,
        periodLabel,
      });
      painter.y += 2;
    }
  }
  painter.y += 8;
}

function splitTakeaway(point: string): { primary: string; secondary: string | null } {
  const trimmed = point.trim();
  const match = trimmed.match(/^(.+?[.!?])\s+(.+)$/);
  if (match?.[1] && match[2] && match[1].length >= 18) {
    return { primary: match[1], secondary: match[2] };
  }
  return { primary: trimmed, secondary: null };
}

function drawCoverHighlights(
  painter: Painter,
  chips: PeriodReportCoverHighlight[],
  top: number,
): number {
  if (chips.length === 0) return 0;
  const gap = 8;
  const width = (CONTENT_WIDTH - gap * (chips.length - 1)) / chips.length;
  const height = 54;
  chips.forEach((chip, index) => {
    const x = MARGIN_X + index * (width + gap);
    fillRect(painter, x, top, width, height, PDF_THEME.navyMid);
    fillRect(painter, x, top, width, 3, index === 0 ? PDF_THEME.cyan : index === 1 ? PDF_THEME.purple : PDF_THEME.orange);
    addOp(painter, {
      op: "text",
      x: x + 10,
      y: topToPdfY(top + 8, 7),
      size: 7,
      bold: true,
      color: PDF_THEME.whiteSoft,
      text: sanitizePdfText(chip.label.toUpperCase()),
    });
    const valueLines = wrapPdfText(chip.value, 10, width - 20);
    addOp(painter, {
      op: "text",
      x: x + 10,
      y: topToPdfY(top + 20, 10),
      size: 10,
      bold: true,
      color: PDF_THEME.white,
      text: valueLines[0] ?? "",
    });
    if (chip.detail) {
      addOp(painter, {
        op: "text",
        x: x + 10,
        y: topToPdfY(top + 36, 8),
        size: 8,
        bold: false,
        color: PDF_THEME.whiteMuted,
        text: sanitizePdfText(chip.detail).slice(0, 42),
      });
    }
  });
  return height;
}

function drawCover(
  painter: Painter,
  review: PeriodIntelligenceReview,
  view: PersonalReportViewModel,
  brief: PeriodReportBrief | null,
  periodLabel: string,
) {
  const navyHeight =
    (brief?.coverHighlights?.length ? 292 : 236) +
    (brief?.portfolioValueCaption ? 14 : 0);
  fillRect(painter, 0, 0, PDF_PAGE.width, navyHeight, PDF_THEME.navy);
  fillRect(painter, 0, 0, 7, navyHeight, PDF_THEME.cyan);
  fillRect(painter, 7, 0, 4, navyHeight, PDF_THEME.purple);

  addOp(painter, {
    op: "line",
    x1: PDF_PAGE.width - 92,
    y1: PDF_PAGE.height - 28,
    x2: PDF_PAGE.width - 28,
    y2: PDF_PAGE.height - 28,
    color: PDF_THEME.cyan,
    width: 1.2,
  });
  addOp(painter, {
    op: "line",
    x1: PDF_PAGE.width - 28,
    y1: PDF_PAGE.height - 28,
    x2: PDF_PAGE.width - 28,
    y2: PDF_PAGE.height - 86,
    color: PDF_THEME.purple,
    width: 1.2,
  });

  let cursor = 34;
  const write = (
    value: string,
    size: number,
    bold: boolean,
    color: PdfColor,
    gap = 3,
  ) => {
    const lines = wrapPdfText(value, size, CONTENT_WIDTH);
    for (const line of lines) {
      addOp(painter, {
        op: "text",
        x: MARGIN_X,
        y: topToPdfY(cursor, size),
        size,
        bold,
        color,
        text: line,
      });
      cursor += size + gap;
    }
  };

  write("TOBAILEY", 9, true, PDF_THEME.cyan, 5);
  cursor += 6;
  write(
    brief?.coverTitle ??
      (review.kind === "monthly" ? "Your Monthly Review" : "Your Weekly Review"),
    24,
    true,
    PDF_THEME.white,
    5,
  );
  cursor += 4;
  write(view.dateRangeLabel, 11, false, PDF_THEME.whiteMuted, 3);
  if (view.isDemo) {
    cursor += 6;
    write("Demo Portfolio - example data only", 9, true, PDF_THEME.demo, 3);
  }

  const valueLabel = brief?.portfolioValueLabel ?? view.metrics[0]?.value ?? null;
  const changeLabel =
    brief?.periodChangeLabel ??
    view.metrics.find((row) => /return|movement/i.test(row.label))?.value ??
    null;
  cursor += 14;
  if (valueLabel) {
    write("YOUR PORTFOLIO", 8, true, PDF_THEME.cyan, 2);
    write(valueLabel, 28, true, PDF_THEME.white, 3);
    if (brief?.portfolioValueCaption) {
      write(brief.portfolioValueCaption, 8, false, PDF_THEME.whiteMuted, 2);
    }
  }
  if (changeLabel) {
    cursor += 4;
    write("PERIOD CHANGE", 8, true, PDF_THEME.whiteSoft, 2);
    write(changeLabel, 16, true, PDF_THEME.cyan, 3);
  }

  if (brief && (brief.coverHighlights?.length ?? 0) > 0) {
    cursor += 10;
    const chipHeight = drawCoverHighlights(painter, brief.coverHighlights, cursor);
    cursor += chipHeight;
  }

  painter.y = navyHeight + 16;
  drawText(painter, brief?.headline ?? view.conclusion, {
    size: 12,
    bold: true,
    color: PDF_THEME.ink,
    lineGap: 4,
    periodLabel,
  });
  painter.y += 8;
  if (brief?.generatedAtLabel) {
    drawText(painter, brief.generatedAtLabel, {
      size: 8,
      color: PDF_THEME.muted,
      periodLabel,
    });
  }
  if (brief?.dataAsOfLabel || view.dataAsOf) {
    drawText(painter, brief?.dataAsOfLabel ?? view.dataAsOf ?? "", {
      size: 8,
      color: PDF_THEME.muted,
      periodLabel,
    });
  }
  painter.y += 10;
}

function drawThirtySeconds(
  painter: Painter,
  points: string[],
  periodLabel: string,
) {
  if (points.length === 0) return;
  const items = points.slice(0, 3).map(splitTakeaway);
  const accents = [PDF_THEME.cyan, PDF_THEME.purple, PDF_THEME.orange];
  ensureSpace(painter, 56, periodLabel);
  fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 22, PDF_THEME.navy);
  painter.y += 6;
  drawText(painter, "YOUR PORTFOLIO IN 30 SECONDS", {
    size: 8,
    bold: true,
    color: PDF_THEME.white,
    x: MARGIN_X + 12,
    periodLabel,
  });
  painter.y += 8;
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]!;
    const accent = accents[i] ?? PDF_THEME.cyan;
    ensureSpace(painter, 28, periodLabel);
    fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 4, PDF_THEME.paper);
    fillRect(painter, MARGIN_X, painter.y, 4, 18, accent);
    drawText(painter, item.primary, {
      size: 11,
      bold: true,
      color: PDF_THEME.ink,
      x: MARGIN_X + 14,
      maxWidth: CONTENT_WIDTH - 18,
      lineGap: 3,
      periodLabel,
    });
    if (item.secondary) {
      drawText(painter, item.secondary, {
        size: 9,
        color: PDF_THEME.muted,
        x: MARGIN_X + 14,
        maxWidth: CONTENT_WIDTH - 18,
        lineGap: 3,
        periodLabel,
      });
    }
    painter.y += 8;
  }
  painter.y += 4;
}

function sectionById(
  view: PersonalReportViewModel,
  id: string,
): PersonalReportSectionView | undefined {
  return view.sections.find((row) => row.id === id);
}

function drawHoldingsTable(
  painter: Painter,
  brief: PeriodReportBrief,
  periodLabel: string,
) {
  if (!brief.showHoldings || brief.holdings.length === 0) return;
  ensureSpace(painter, 72, periodLabel);
  drawText(painter, "HOLDINGS SNAPSHOT", {
    size: 9,
    bold: true,
    color: PDF_THEME.navyMid,
    periodLabel,
  });
  if (brief.currentContextLabel) {
    drawText(painter, brief.currentContextLabel, {
      size: 8,
      color: PDF_THEME.muted,
      periodLabel,
    });
  }
  painter.y += 6;
  const cols = {
    weight: MARGIN_X + CONTENT_WIDTH - 210,
    move: MARGIN_X + CONTENT_WIDTH - 148,
    impact: MARGIN_X + CONTENT_WIDTH - 86,
    status: MARGIN_X + CONTENT_WIDTH,
  };
  const headerTop = painter.y;
  fillRect(painter, MARGIN_X, headerTop, CONTENT_WIDTH, 16, PDF_THEME.navy);
  const headerY = painter.y + 4;
  addOp(painter, {
    op: "text",
    x: MARGIN_X + 8,
    y: topToPdfY(headerY, 8),
    size: 8,
    bold: true,
    color: PDF_THEME.white,
    text: "Holding",
  });
  const headers: Array<[string, number]> = [
    ["Weight", cols.weight],
    ["Move", cols.move],
    ["Impact", cols.impact],
    ["Status", cols.status],
  ];
  for (const [label, right] of headers) {
    addOp(painter, {
      op: "text",
      x: right - measurePdfText(label, 8),
      y: topToPdfY(headerY, 8),
      size: 8,
      bold: true,
      color: PDF_THEME.white,
      text: label,
    });
  }
  painter.y += 20;

  brief.holdings.forEach((row, index) => {
    const nameLines = wrapPdfText(row.name, 8, CONTENT_WIDTH - 230);
    const category = row.exposureLabel?.trim() ?? "";
    const rowHeight = 16 + (nameLines.length > 0 ? nameLines.length * 10 : 0) + (category ? 10 : 0);
    ensureSpace(painter, rowHeight, periodLabel);
    if (index % 2 === 0) {
      fillRect(painter, MARGIN_X, painter.y - 2, CONTENT_WIDTH, rowHeight, PDF_THEME.paper);
    }
    const rowTop = painter.y;
    addOp(painter, {
      op: "text",
      x: MARGIN_X + 8,
      y: topToPdfY(rowTop, 9),
      size: 9,
      bold: true,
      color: PDF_THEME.ink,
      text: sanitizePdfText(row.symbol),
    });
    const values: Array<[string, number]> = [
      [row.weightLabel, cols.weight],
      [row.periodMoveLabel ?? "-", cols.move],
      [row.impactLabel ?? "-", cols.impact],
      [row.statusLabel, cols.status],
    ];
    for (const [label, right] of values) {
      addOp(painter, {
        op: "text",
        x: right - measurePdfText(label, 8),
        y: topToPdfY(rowTop, 8),
        size: 8,
        bold: false,
        color: PDF_THEME.ink,
        text: sanitizePdfText(label),
      });
    }
    painter.y += 12;
    for (const line of nameLines) {
      addOp(painter, {
        op: "text",
        x: MARGIN_X + 8,
        y: topToPdfY(painter.y, 8),
        size: 8,
        bold: false,
        color: PDF_THEME.muted,
        text: line,
      });
      painter.y += 10;
    }
    if (category) {
      addOp(painter, {
        op: "text",
        x: MARGIN_X + 8,
        y: topToPdfY(painter.y, 8),
        size: 8,
        bold: false,
        color: PDF_THEME.muted,
        text: sanitizePdfText(category),
      });
      painter.y += 10;
    }
    painter.y += 4;
  });
  painter.y += 4;
  drawText(painter, "View or export your complete portfolio in Tobailey.", {
    size: 8,
    color: PDF_THEME.muted,
    periodLabel,
  });
  painter.y += 8;
}

export function renderPeriodReportPdf(
  review: PeriodIntelligenceReview,
): Uint8Array {
  const view = toPersonalReportViewModel(review);
  const brief = review.brief ?? null;
  const periodLabel = view.dateRangeLabel;
  const painter: Painter = {
    pages: [[]],
    pageIndex: 0,
    y: 0,
    header: {
      brand: `TOBAILEY  -  ${brief?.coverTitle ?? (review.kind === "monthly" ? "Your Monthly Review" : "Your Weekly Review")}`,
      period: periodLabel,
    },
  };
  drawFooter(painter, 1, periodLabel);
  drawCover(painter, review, view, brief, periodLabel);

  const thirty = (
    brief?.thirtySeconds?.length ? brief.thirtySeconds : view.executiveSummary
  ).slice(0, 3);
  drawThirtySeconds(painter, thirty, periodLabel);

  const happened = sectionById(view, "happened");
  const changed = sectionById(view, "changed");
  drawQuestionHeader(painter, "what_happened", periodLabel);
  drawNarrative(painter, happened, "cyan", periodLabel);
  if (changed) {
    drawText(painter, changed.title.toUpperCase(), {
      size: 8,
      bold: true,
      color: PDF_THEME.muted,
      periodLabel,
    });
    painter.y += 3;
    drawNarrative(painter, changed, "slate", periodLabel);
  }
  if (brief?.performanceChart) {
    const height = performanceChartHeight();
    ensureSpace(painter, height + 10, periodLabel);
    drawPerformanceChart(
      { addOp: (op) => addOp(painter, op) },
      brief.performanceChart,
      { x: MARGIN_X, top: painter.y, width: CONTENT_WIDTH },
    );
    painter.y += height + 12;
  }
  if (brief && (brief.contributors.length > 0 || brief.detractors.length > 0)) {
    const height = impactChartHeight(brief.contributors, brief.detractors);
    ensureSpace(painter, height + 8, periodLabel);
    drawImpactChart(
      { addOp: (op) => addOp(painter, op) },
      brief.contributors,
      brief.detractors,
      { x: MARGIN_X, top: painter.y, width: CONTENT_WIDTH },
    );
    painter.y += height + 10;
  }
  if (brief?.funding?.periodActivityLabel) {
    drawText(painter, brief.funding.periodActivityLabel, {
      size: 10,
      bold: true,
      color: PDF_THEME.ink,
      periodLabel,
    });
    painter.y += 8;
  }

  const matters = sectionById(view, "matters");
  drawQuestionHeader(painter, "what_matters_now", periodLabel);
  if (matters) {
    drawNarrative(painter, matters, "violet", periodLabel);
  }
  if (view.context) {
    ensureSpace(painter, 40, periodLabel);
    drawText(painter, "Why it matters to your portfolio", {
      size: 8,
      bold: true,
      color: PDF_THEME.purple,
      periodLabel,
    });
    painter.y += 3;
    drawText(painter, view.context.headline, {
      size: 12,
      bold: true,
      color: PDF_THEME.ink,
      lineGap: 4,
      periodLabel,
    });
    painter.y += 3;
    drawText(painter, view.context.detail, {
      size: 10,
      color: PDF_THEME.ink,
      lineGap: 3.5,
      periodLabel,
    });
    painter.y += 3;
    drawText(painter, view.context.channelLabel, {
      size: 8,
      color: PDF_THEME.muted,
      periodLabel,
    });
    painter.y += 8;
  }
  if (!matters && !view.context) {
    drawText(painter, PERIOD_Q2_QUIET_COPY, {
      size: 11,
      bold: true,
      color: PDF_THEME.ink,
      periodLabel,
    });
    painter.y += 10;
  }

  const goal = sectionById(view, "goal");
  drawQuestionHeader(painter, "am_i_on_track", periodLabel);
  drawNarrative(painter, goal, "amber", periodLabel);
  if (brief?.goal.hasGoal && brief.showGoalVisual) {
    const height = goalChartHeight();
    ensureSpace(painter, height + 36, periodLabel);
    if (brief.currentContextLabel) {
      drawText(painter, brief.currentContextLabel, {
        size: 8,
        color: PDF_THEME.muted,
        periodLabel,
      });
      painter.y += 4;
    }
    drawGoalProgress(
      { addOp: (op) => addOp(painter, op) },
      {
        progressPercent: brief.goal.progressPercent,
        currentLabel: brief.goal.currentLabel,
        targetLabel: brief.goal.targetLabel,
      },
      { x: MARGIN_X, top: painter.y, width: CONTENT_WIDTH },
    );
    painter.y += height + 8;
    if (brief.goal.statusLabel) {
      drawText(painter, brief.goal.statusLabel, {
        size: 10,
        bold: true,
        color: PDF_THEME.ink,
        periodLabel,
      });
    }
    if (brief.goal.projectedLabel) {
      drawText(painter, `Projected completion: ${brief.goal.projectedLabel}`, {
        size: 9,
        color: PDF_THEME.muted,
        periodLabel,
      });
    }
    if (brief.goal.contributionAssumption) {
      drawText(painter, brief.goal.contributionAssumption, {
        size: 9,
        color: PDF_THEME.muted,
        periodLabel,
      });
    }
    if (brief.goal.stressedLabel) {
      drawText(painter, brief.goal.stressedLabel, {
        size: 9,
        color: PDF_THEME.muted,
        periodLabel,
      });
    }
    painter.y += 8;
  } else if (brief && !brief.goal.hasGoal && brief.goal.prompt) {
    drawText(painter, brief.goal.prompt, {
      size: 10,
      color: PDF_THEME.muted,
      periodLabel,
    });
    painter.y += 10;
  }
  if (brief?.showResilience && brief.resilience) {
    ensureSpace(painter, 64, periodLabel);
    const scoreLabel =
      brief.resilience.score != null ? String(brief.resilience.score) : "-";
    fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 36, PDF_THEME.paper);
    drawRaw(painter, scoreLabel, MARGIN_X + 12, 20, true, PDF_THEME.navy);
    drawRaw(
      painter,
      "/100",
      MARGIN_X + 12 + measurePdfText(scoreLabel, 20) + 4,
      9,
      false,
      PDF_THEME.muted,
    );
    const band = brief.resilience.bandLabel ?? "Resilience";
    addOp(painter, {
      op: "text",
      x: MARGIN_X + 100,
      y: topToPdfY(painter.y + 8, 11),
      size: 11,
      bold: true,
      color: PDF_THEME.ink,
      text: sanitizePdfText(band),
    });
    painter.y += 40;
    for (const factor of brief.resilience.factors.slice(0, 3)) {
      ensureSpace(painter, 20, periodLabel);
      fillRect(painter, MARGIN_X, painter.y, 3, 12, PDF_THEME.mint);
      drawText(painter, `${factor.label}. ${factor.explanation}`, {
        size: 9,
        color: PDF_THEME.muted,
        x: MARGIN_X + 12,
        maxWidth: CONTENT_WIDTH - 12,
        lineGap: 3,
        periodLabel,
      });
      painter.y += 4;
    }
    painter.y += 6;
  }

  const ahead = sectionById(view, "ahead");
  const q2Headlines = new Set(
    [matters?.headline, view.context?.headline]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value)),
  );
  const aheadItems = (brief?.aheadItems ?? []).filter(
    (item) => !q2Headlines.has(item.title.trim()),
  );
  drawQuestionHeader(painter, "whats_ahead", periodLabel);
  const aheadHeadlineDistinct =
    ahead && !q2Headlines.has(ahead.headline.trim()) ? ahead : undefined;
  drawNarrative(painter, aheadHeadlineDistinct, "teal", periodLabel);
  let drewAheadBody = Boolean(aheadHeadlineDistinct);
  for (const item of aheadItems.slice(0, 3)) {
    if (aheadHeadlineDistinct?.headline && item.title === aheadHeadlineDistinct.headline) {
      continue;
    }
    ensureSpace(painter, 28, periodLabel);
    drawText(painter, item.title, {
      size: 11,
      bold: true,
      color: PDF_THEME.ink,
      periodLabel,
    });
    drawText(painter, item.whyItMatters, {
      size: 9,
      color: PDF_THEME.muted,
      lineGap: 3,
      periodLabel,
    });
    painter.y += 6;
    drewAheadBody = true;
  }
  if (brief?.showScenarios && brief.scenarios.length > 0) {
    const height = scenarioChartHeight(brief.scenarios);
    ensureSpace(painter, height + 8, periodLabel);
    drawScenarioChart(
      { addOp: (op) => addOp(painter, op) },
      brief.scenarios,
      { x: MARGIN_X, top: painter.y, width: CONTENT_WIDTH },
    );
    painter.y += height + 12;
    drewAheadBody = true;
  }
  if (!drewAheadBody) {
    drawText(painter, PERIOD_Q4_QUIET_COPY, {
      size: 11,
      bold: true,
      color: PDF_THEME.ink,
      periodLabel,
    });
    painter.y += 10;
  }

  if (brief?.showAllocation && brief.allocation.length > 0) {
    const height = allocationChartHeight(brief.allocation);
    ensureSpace(painter, height + 36, periodLabel);
    drawText(painter, "PORTFOLIO ALLOCATION", {
      size: 9,
      bold: true,
      color: PDF_THEME.navyMid,
      periodLabel,
    });
    if (brief.currentContextLabel) {
      drawText(painter, brief.currentContextLabel, {
        size: 8,
        color: PDF_THEME.muted,
        periodLabel,
      });
    }
    painter.y += 8;
    drawAllocationChart(
      { addOp: (op) => addOp(painter, op) },
      brief.allocation,
      { x: MARGIN_X, top: painter.y, width: CONTENT_WIDTH },
    );
    painter.y += height + 8;
    if (brief.allocationInsight) {
      drawText(painter, brief.allocationInsight, {
        size: 10,
        color: PDF_THEME.ink,
        periodLabel,
      });
      painter.y += 4;
    }
    if (brief.allocationScenarioLink) {
      drawText(painter, brief.allocationScenarioLink, {
        size: 9,
        color: PDF_THEME.muted,
        periodLabel,
      });
      painter.y += 8;
    }
  }

  if (brief) drawHoldingsTable(painter, brief, periodLabel);

  const notes = uniquePreserve(
    [...view.confidenceNotes, ...(brief?.methodologyNotes ?? [])],
    review.kind === "weekly" ? 5 : 7,
  );
  if (notes.length > 0) {
    ensureSpace(painter, 40, periodLabel);
    painter.y += 4;
    addOp(painter, {
      op: "line",
      x1: MARGIN_X,
      y1: topToPdfY(painter.y, 0),
      x2: MARGIN_X + CONTENT_WIDTH,
      y2: topToPdfY(painter.y, 0),
      color: PDF_THEME.line,
      width: 0.5,
    });
    painter.y += 8;
    drawText(painter, "DATA AND METHODOLOGY", {
      size: 7.5,
      bold: true,
      color: PDF_THEME.muted,
      periodLabel,
    });
    painter.y += 4;
    for (const note of notes) {
      drawText(painter, note, {
        size: 8,
        color: PDF_THEME.muted,
        lineGap: 3,
        periodLabel,
      });
      painter.y += 3;
    }
  }

  painter.y += 4;
  drawText(painter, view.trustLine || TRUST_NOT_ADVICE_SHORT, {
    size: 8,
    color: PDF_THEME.muted,
    periodLabel,
  });

  return encodePdfPages(painter.pages);
}

function uniquePreserve(lines: string[], limit: number): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || out.includes(trimmed)) continue;
    out.push(trimmed);
    if (out.length >= limit) break;
  }
  return out;
}

export function extractPdfPlainText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const matches = raw.match(/\((?:\\.|[^\\)])*\) Tj/g) ?? [];
  return matches
    .map((token) =>
      token
        .slice(1, token.length - 4)
        .replace(/\\200/g, "€")
        .replace(/\\([()\\])/g, "$1"),
    )
    .join("\n");
}
