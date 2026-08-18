/**
 * Canonical weekly/monthly PDF renderer.
 * Consumes PeriodIntelligenceReview via toPersonalReportViewModel.
 * No performance, change, goal, resilience, or fixed-income calculations.
 */

import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";
import { toPersonalReportViewModel } from "@/lib/services/periodIntelligence/reportViewModel";
import type { PersonalReportAccent } from "@/lib/services/periodIntelligence/reportViewModel";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import {
  encodePdfPages,
  PDF_PAGE,
  type PdfColor,
  type PdfOp,
  type PdfPageOps,
} from "@/lib/services/periodIntelligence/pdf/encodePdf";

const MARGIN_X = 48;
const MARGIN_BOTTOM = 56;
const CONTENT_TOP = 44;
const CONTENT_WIDTH = PDF_PAGE.width - MARGIN_X * 2;

const COLOR = {
  hero: { r: 0.06, g: 0.07, b: 0.09 },
  white: { r: 1, g: 1, b: 1 },
  whiteMuted: { r: 0.78, g: 0.8, b: 0.82 },
  whiteSoft: { r: 0.62, g: 0.64, b: 0.67 },
  ink: { r: 0.06, g: 0.09, b: 0.16 },
  muted: { r: 0.39, g: 0.45, b: 0.55 },
  line: { r: 0.91, g: 0.92, b: 0.94 },
  cyan: { r: 0.02, g: 0.71, b: 0.83 },
  violet: { r: 0.55, g: 0.36, b: 0.97 },
  amber: { r: 0.96, g: 0.62, b: 0.04 },
  teal: { r: 0.08, g: 0.65, b: 0.6 },
  slate: { r: 0.58, g: 0.64, b: 0.72 },
  demo: { r: 0.99, g: 0.85, b: 0.55 },
} as const;

const ACCENT: Record<PersonalReportAccent, PdfColor> = {
  cyan: COLOR.cyan,
  violet: COLOR.violet,
  amber: COLOR.amber,
  teal: COLOR.teal,
  slate: COLOR.slate,
};

/** Helvetica WinAnsi widths (units / 1000) for printable ASCII. */
const HELVETICA_ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

export function sanitizePdfText(value: string): string {
  return value
    .replace(/[€]/g, "EUR ")
    .replace(/[−–—]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "?");
}

function glyphWidth(charCode: number): number {
  if (charCode < 32 || charCode > 126) return 556;
  return HELVETICA_ASCII_WIDTHS[charCode - 32] ?? 556;
}

export function measurePdfText(text: string, size: number): number {
  const sanitized = sanitizePdfText(text);
  let width = 0;
  for (let i = 0; i < sanitized.length; i += 1) {
    width += glyphWidth(sanitized.charCodeAt(i));
  }
  return (width * size) / 1000;
}

export function wrapPdfText(
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const sanitized = sanitizePdfText(text).replace(/\s+/g, " ").trim();
  if (!sanitized) return [];
  const words = sanitized.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measurePdfText(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (!current) {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measurePdfText(next, size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
      continue;
    }
    pushCurrent();
    if (measurePdfText(word, size) <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measurePdfText(next, size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
  }
  pushCurrent();
  return lines;
}

function topToPdfY(topY: number, fontSize = 0): number {
  return PDF_PAGE.height - topY - fontSize;
}

type Painter = {
  pages: PdfPageOps[];
  pageIndex: number;
  y: number;
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

function beginPage(painter: Painter, withFooter: boolean) {
  painter.pages.push([]);
  painter.pageIndex = painter.pages.length - 1;
  painter.y = CONTENT_TOP;
  if (withFooter) {
    drawFooter(painter, painter.pageIndex + 1);
  }
}

function ensureSpace(painter: Painter, needed: number) {
  if (remaining(painter) >= needed) return;
  beginPage(painter, true);
}

function drawFooter(painter: Painter, pageNumber: number) {
  const y = PDF_PAGE.height - 28;
  addOp(painter, {
    op: "text",
    x: MARGIN_X,
    y,
    size: 8,
    bold: false,
    color: COLOR.muted,
    text: sanitizePdfText("Tobailey  ·  Information and analysis only - not financial advice."),
  });
  const label = String(pageNumber);
  addOp(painter, {
    op: "text",
    x: PDF_PAGE.width - MARGIN_X - measurePdfText(label, 8),
    y,
    size: 8,
    bold: false,
    color: COLOR.muted,
    text: label,
  });
}

function drawText(
  painter: Painter,
  text: string,
  opts: {
    size: number;
    bold?: boolean;
    color: PdfColor;
    x?: number;
    maxWidth?: number;
    lineGap?: number;
  },
): number {
  const size = opts.size;
  const x = opts.x ?? MARGIN_X;
  const maxWidth = opts.maxWidth ?? CONTENT_WIDTH;
  const lineGap = opts.lineGap ?? size * 0.38;
  const lines = wrapPdfText(text, size, maxWidth);
  for (const line of lines) {
    ensureSpace(painter, size + lineGap);
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

function drawHero(
  painter: Painter,
  review: PeriodIntelligenceReview,
): void {
  const view = toPersonalReportViewModel(review);
  const padX = 48;
  const innerW = PDF_PAGE.width - padX * 2;
  let cursor = 36;

  const brand = wrapPdfText("TOBAILEY", 9, innerW);
  const subtitle = wrapPdfText("Your personal investment review", 11, innerW);
  const kicker = wrapPdfText(view.kicker.toUpperCase(), 9, innerW);
  const conclusion = wrapPdfText(view.conclusion, 20, innerW);
  const range = wrapPdfText(view.dateRangeLabel, 10, innerW);
  const dataAsOf = view.dataAsOf
    ? wrapPdfText(view.dataAsOf, 9, innerW)
    : [];
  const demo = view.isDemo
    ? wrapPdfText("Demo Portfolio - example data only", 10, innerW)
    : [];

  const metrics = view.metrics.slice(0, 3);
  const metricHeight = metrics.length > 0 ? 46 : 0;
  const heroHeight =
    36 +
    12 +
    16 +
    14 +
    conclusion.length * 24 +
    14 +
    range.length * 13 +
    (metrics.length > 0 ? 18 + metricHeight : 0) +
    (dataAsOf.length > 0 ? 16 : 0) +
    (demo.length > 0 ? 16 : 0) +
    28;

  fillRect(painter, 0, 0, PDF_PAGE.width, heroHeight, COLOR.hero);

  const write = (
    lines: string[],
    size: number,
    bold: boolean,
    color: PdfColor,
    gap: number,
  ) => {
    for (const line of lines) {
      addOp(painter, {
        op: "text",
        x: padX,
        y: topToPdfY(cursor, size),
        size,
        bold,
        color,
        text: line,
      });
      cursor += size + gap;
    }
  };

  write(brand, 9, true, COLOR.whiteSoft, 3);
  cursor += 4;
  write(subtitle, 11, false, COLOR.whiteMuted, 3);
  cursor += 14;
  write(kicker, 9, true, COLOR.cyan, 3);
  cursor += 8;
  write(conclusion, 20, true, COLOR.white, 4);
  cursor += 10;
  write(range, 10, false, COLOR.whiteMuted, 3);

  if (metrics.length > 0) {
    cursor += 14;
    const gap = 10;
    const boxW = (innerW - gap * (metrics.length - 1)) / metrics.length;
    for (let i = 0; i < metrics.length; i += 1) {
      const metric = metrics[i]!;
      const x = padX + i * (boxW + gap);
      fillRect(painter, x, cursor, boxW, metricHeight, {
        r: 0.14,
        g: 0.16,
        b: 0.19,
      });
      addOp(painter, {
        op: "text",
        x: x + 10,
        y: topToPdfY(cursor + 12, 8),
        size: 8,
        bold: true,
        color: COLOR.whiteSoft,
        text: sanitizePdfText(metric.label.toUpperCase()),
      });
      const valueLines = wrapPdfText(metric.value, 11, boxW - 20);
      addOp(painter, {
        op: "text",
        x: x + 10,
        y: topToPdfY(cursor + 26, 11),
        size: 11,
        bold: true,
        color: COLOR.white,
        text: valueLines[0] ?? "",
      });
    }
    cursor += metricHeight;
  }

  if (dataAsOf.length > 0) {
    cursor += 14;
    write(dataAsOf, 9, false, COLOR.whiteSoft, 2);
  }
  if (demo.length > 0) {
    cursor += 8;
    write(demo, 10, true, COLOR.demo, 2);
  }

  painter.y = heroHeight + 28;
}

function drawSection(
  painter: Painter,
  title: string,
  headline: string,
  whyItMatters: string | null,
  evidence: string[],
  accent: PersonalReportAccent,
) {
  const keepTogether = 56;
  ensureSpace(painter, keepTogether);

  fillRect(painter, MARGIN_X, painter.y, 3, 28, ACCENT[accent]);
  drawText(painter, title.toUpperCase(), {
    size: 8,
    bold: true,
    color: ACCENT[accent],
    x: MARGIN_X + 12,
  });
  painter.y += 4;
  drawText(painter, headline, {
    size: 12,
    bold: true,
    color: COLOR.ink,
    x: MARGIN_X + 12,
    maxWidth: CONTENT_WIDTH - 12,
    lineGap: 5,
  });

  if (whyItMatters) {
    painter.y += 4;
    drawText(painter, `Why it matters. ${whyItMatters}`, {
      size: 10,
      color: COLOR.muted,
      x: MARGIN_X + 12,
      maxWidth: CONTENT_WIDTH - 12,
      lineGap: 4,
    });
  }

  if (evidence.length > 0) {
    painter.y += 8;
    for (const item of evidence) {
      ensureSpace(painter, 16);
      addOp(painter, {
        op: "fill",
        x: MARGIN_X + 12,
        y: topToPdfY(painter.y + 6, 0) - 1.5,
        w: 3,
        h: 3,
        color: ACCENT[accent],
      });
      drawText(painter, item, {
        size: 10,
        color: COLOR.ink,
        x: MARGIN_X + 22,
        maxWidth: CONTENT_WIDTH - 22,
        lineGap: 3.5,
      });
      painter.y += 4;
    }
  }

  painter.y += 16;
  fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 0.6, COLOR.line);
  painter.y += 16;
}

export function renderPeriodReportPdf(
  review: PeriodIntelligenceReview,
): Uint8Array {
  const view = toPersonalReportViewModel(review);
  const painter: Painter = {
    pages: [[]],
    pageIndex: 0,
    y: 0,
  };
  drawFooter(painter, 1);
  drawHero(painter, review);

  if (view.executiveSummary.length > 0) {
    drawText(painter, "At a glance", {
      size: 8,
      bold: true,
      color: COLOR.muted,
    });
    painter.y += 6;
    for (const point of view.executiveSummary) {
      ensureSpace(painter, 16);
      addOp(painter, {
        op: "fill",
        x: MARGIN_X,
        y: topToPdfY(painter.y + 6, 0) - 1.5,
        w: 3,
        h: 3,
        color: COLOR.ink,
      });
      drawText(painter, point, {
        size: 11,
        bold: true,
        color: COLOR.ink,
        x: MARGIN_X + 12,
        maxWidth: CONTENT_WIDTH - 12,
        lineGap: 4,
      });
      painter.y += 6;
    }
    painter.y += 10;
  }

  for (const section of view.sections) {
    drawSection(
      painter,
      section.title,
      section.headline,
      section.whyItMatters,
      section.evidence,
      section.accent,
    );
  }

  if (view.context) {
    ensureSpace(painter, 56);
    fillRect(painter, MARGIN_X, painter.y, 3, 28, COLOR.slate);
    drawText(painter, "RELEVANT CONTEXT", {
      size: 8,
      bold: true,
      color: COLOR.slate,
      x: MARGIN_X + 12,
    });
    painter.y += 2;
    drawText(painter, view.context.channelLabel, {
      size: 9,
      bold: true,
      color: COLOR.muted,
      x: MARGIN_X + 12,
    });
    painter.y += 4;
    drawText(painter, view.context.headline, {
      size: 12,
      bold: true,
      color: COLOR.ink,
      x: MARGIN_X + 12,
      maxWidth: CONTENT_WIDTH - 12,
      lineGap: 5,
    });
    painter.y += 4;
    drawText(painter, view.context.detail, {
      size: 10,
      color: COLOR.ink,
      x: MARGIN_X + 12,
      maxWidth: CONTENT_WIDTH - 12,
      lineGap: 3.5,
    });
    painter.y += 16;
    fillRect(painter, MARGIN_X, painter.y, CONTENT_WIDTH, 0.6, COLOR.line);
    painter.y += 16;
  }

  if (view.confidenceNotes.length > 0) {
    drawText(painter, "DATA CONFIDENCE", {
      size: 8,
      bold: true,
      color: COLOR.muted,
    });
    painter.y += 6;
    for (const note of view.confidenceNotes) {
      drawText(painter, note, {
        size: 9,
        color: COLOR.muted,
        lineGap: 3.5,
      });
      painter.y += 4;
    }
    painter.y += 10;
  }

  drawText(painter, view.trustLine || TRUST_NOT_ADVICE_SHORT, {
    size: 8,
    color: COLOR.muted,
  });

  return encodePdfPages(painter.pages);
}

export function extractPdfPlainText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes).toString("latin1");
  const matches = raw.match(/\((?:\\.|[^\\)])*\) Tj/g) ?? [];
  return matches
    .map((token) =>
      token
        .slice(1, token.length - 4)
        .replace(/\\([()\\])/g, "$1"),
    )
    .join("\n");
}
