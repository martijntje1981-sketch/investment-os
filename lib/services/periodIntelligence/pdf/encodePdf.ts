/**
 * Minimal multi-page PDF encoder (PDF 1.4, Helvetica / Helvetica-Bold).
 * No images, no embedded fonts, no provider calls.
 */

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;

export const PDF_PAGE = {
  width: PAGE_WIDTH,
  height: PAGE_HEIGHT,
} as const;

export type PdfColor = { r: number; g: number; b: number };

export type PdfPoint = { x: number; y: number };

export type PdfOp =
  | { op: "fill"; x: number; y: number; w: number; h: number; color: PdfColor }
  | {
      op: "stroke";
      x: number;
      y: number;
      w: number;
      h: number;
      color: PdfColor;
      width: number;
    }
  | {
      op: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      color: PdfColor;
      width: number;
    }
  | { op: "polygon"; points: PdfPoint[]; color: PdfColor }
  | {
      op: "text";
      x: number;
      y: number;
      size: number;
      bold: boolean;
      color: PdfColor;
      text: string;
    };

export type PdfPageOps = PdfOp[];

function pdfFillColor(color: PdfColor): string {
  return `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} rg`;
}

function pdfStrokeColor(color: PdfColor): string {
  return `${color.r.toFixed(3)} ${color.g.toFixed(3)} ${color.b.toFixed(3)} RG`;
}

function escapePdfString(value: string): string {
  let encoded = "";
  for (const char of value) {
    if (char === "€") {
      // WinAnsiEncoding code 128 (octal 200) maps to Euro. No embedded font file.
      encoded += "\\200";
      continue;
    }
    if (char === "\\") {
      encoded += "\\\\";
      continue;
    }
    if (char === "(") {
      encoded += "\\(";
      continue;
    }
    if (char === ")") {
      encoded += "\\)";
      continue;
    }
    encoded += char;
  }
  return encoded;
}

function opsToStream(ops: PdfPageOps): string {
  const lines: string[] = [];
  for (const item of ops) {
    if (item.op === "fill") {
      lines.push("q");
      lines.push(pdfFillColor(item.color));
      lines.push(
        `${item.x.toFixed(2)} ${item.y.toFixed(2)} ${item.w.toFixed(2)} ${item.h.toFixed(2)} re`,
      );
      lines.push("f");
      lines.push("Q");
      continue;
    }
    if (item.op === "stroke") {
      lines.push("q");
      lines.push(pdfStrokeColor(item.color));
      lines.push(`${Math.max(0.4, item.width).toFixed(2)} w`);
      lines.push(
        `${item.x.toFixed(2)} ${item.y.toFixed(2)} ${item.w.toFixed(2)} ${item.h.toFixed(2)} re`,
      );
      lines.push("S");
      lines.push("Q");
      continue;
    }
    if (item.op === "line") {
      lines.push("q");
      lines.push(pdfStrokeColor(item.color));
      lines.push(`${Math.max(0.4, item.width).toFixed(2)} w`);
      lines.push(`${item.x1.toFixed(2)} ${item.y1.toFixed(2)} m`);
      lines.push(`${item.x2.toFixed(2)} ${item.y2.toFixed(2)} l`);
      lines.push("S");
      lines.push("Q");
      continue;
    }
    if (item.op === "polygon") {
      if (item.points.length < 3) continue;
      const first = item.points[0]!;
      lines.push("q");
      lines.push(pdfFillColor(item.color));
      lines.push(`${first.x.toFixed(2)} ${first.y.toFixed(2)} m`);
      for (let i = 1; i < item.points.length; i += 1) {
        const point = item.points[i]!;
        lines.push(`${point.x.toFixed(2)} ${point.y.toFixed(2)} l`);
      }
      lines.push("h");
      lines.push("f");
      lines.push("Q");
      continue;
    }
    lines.push("BT");
    lines.push(item.bold ? "/F2" : "/F1");
    lines.push(`${item.size} Tf`);
    lines.push(pdfFillColor(item.color));
    lines.push(`${item.x.toFixed(2)} ${item.y.toFixed(2)} Td`);
    lines.push(`(${escapePdfString(item.text)}) Tj`);
    lines.push("ET");
  }
  return lines.join("\n");
}

export function encodePdfPages(pages: PdfPageOps[]): Uint8Array {
  const safePages = pages.length > 0 ? pages : [[]];
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");

  const fontHelv = 3;
  const fontBold = 4;
  const firstPageObj = 5;
  const contentStreams: string[] = [];

  for (const page of safePages) {
    contentStreams.push(opsToStream(page));
  }

  const kids = safePages
    .map((_, index) => `${firstPageObj + index * 2} 0 R`)
    .join(" ");
  objects.push(
    `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${safePages.length} >>endobj\n`,
  );
  objects.push(
    `${fontHelv} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>endobj\n`,
  );
  objects.push(
    `${fontBold} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>endobj\n`,
  );

  for (let i = 0; i < safePages.length; i += 1) {
    const pageObj = firstPageObj + i * 2;
    const contentObj = pageObj + 1;
    objects.push(
      `${pageObj} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentObj} 0 R /Resources << /Font << /F1 ${fontHelv} 0 R /F2 ${fontBold} 0 R >> >> >>endobj\n`,
    );
    const stream = contentStreams[i] ?? "";
    objects.push(
      `${contentObj} 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`,
    );
  }

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
