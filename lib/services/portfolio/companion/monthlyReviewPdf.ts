/**
 * Minimal on-demand PDF for a saved monthly review snapshot.
 * Pure text PDF — no remote assets, no email address, no holdings dump.
 */

import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";
import { formatYearMonthLabel } from "@/lib/services/portfolio/companion/snapshotTypes";

export function monthlyReviewPdfFilename(yearMonth: string): string {
  return `Tobailey_Monthly_Review_${yearMonth}.pdf`;
}

/**
 * Build a simple multi-page-capable single-page PDF (Latin-1 / WinAnsi-safe text).
 */
export function buildMonthlyReviewPdfBytes(
  yearMonth: string,
  payload: MonthlyReviewSnapshotPayload,
  generatedAtIso: string,
): Uint8Array {
  const review = payload.review;
  const lines: string[] = [
    "Tobailey Monthly Portfolio Review",
    formatYearMonthLabel(yearMonth),
    review.dateRangeLabel,
    "",
    review.lead,
    "",
  ];

  for (const fact of review.supportingFacts) {
    lines.push(`${fact.label}: ${fact.value}`);
  }

  if (review.goalStatusLabel) {
    lines.push(`Goal status: ${review.goalStatusLabel}`);
  }
  if (review.milestone) {
    lines.push(`Milestone: ${review.milestone.label}`);
  }
  if (review.focus) {
    lines.push(`One thing to know: ${review.focus.label}`);
  }
  if (review.closingStatement) {
    lines.push("");
    lines.push(review.closingStatement);
  }

  lines.push("");
  lines.push(`Generated: ${generatedAtIso.slice(0, 10)}`);
  lines.push(
    "Tobailey is a monitoring tool. This review is informational only and does not provide personal financial advice.",
  );

  return encodeSimplePdf(lines.map(sanitizePdfText));
}

function sanitizePdfText(value: string): string {
  return value
    .replace(/[€]/g, "EUR ")
    .replace(/[−–—]/g, "-")
    .replace(/[^\x20-\x7E]/g, "?");
}

function encodeSimplePdf(lines: string[]): Uint8Array {
  const contentLines = ["BT", "/F1 11 Tf", "50 780 Td", "14 TL"];
  lines.forEach((line, index) => {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    if (index === 0) {
      contentLines.push(`(${escaped}) Tj`);
    } else {
      contentLines.push("T*");
      contentLines.push(`(${escaped}) Tj`);
    }
  });
  contentLines.push("ET");
  const stream = contentLines.join("\n");

  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n",
  );
  objects.push(
    `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
  );

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  }
  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "utf8"));
}
