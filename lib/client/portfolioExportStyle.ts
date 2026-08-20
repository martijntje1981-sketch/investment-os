/**
 * Restrained Tobailey Excel visual system for the professional portfolio workbook.
 */

import { BRAND } from "@/lib/brand";

export const EXCEL_FONT = "Calibri";

export const EXCEL_NAVY = BRAND.navyHero.replace("#", "").toUpperCase();
export const EXCEL_NAVY_CARD = BRAND.navyCard.replace("#", "").toUpperCase();
export const EXCEL_PRIMARY = BRAND.primary.replace("#", "").toUpperCase();
export const EXCEL_SOFT = BRAND.primarySoft.replace("#", "").toUpperCase();
export const EXCEL_WHITE = "FFFFFF";
export const EXCEL_TEXT = BRAND.text.replace("#", "").toUpperCase();
export const EXCEL_MUTED = "475569";
export const EXCEL_LINE = "E2E8F0";
export const EXCEL_ALT = "F8FBFF";

export type ExcelCellStyle = {
  font?: {
    name?: string;
    sz?: number;
    bold?: boolean;
    color?: { rgb: string };
  };
  fill?: { patternType: "solid"; fgColor: { rgb: string } };
  alignment?: {
    vertical?: "center" | "top";
    horizontal?: "left" | "right" | "center";
    wrapText?: boolean;
  };
  border?: {
    top?: { style: "thin"; color: { rgb: string } };
    bottom?: { style: "thin"; color: { rgb: string } };
    left?: { style: "thin"; color: { rgb: string } };
    right?: { style: "thin"; color: { rgb: string } };
  };
  numFmt?: string;
};

export type StyledExcelCell = {
  v: string | number | Date | boolean;
  t?: "s" | "n" | "d" | "b";
  z?: string;
  s?: ExcelCellStyle;
};

const thin = { style: "thin" as const, color: { rgb: EXCEL_LINE } };

export const titleStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 16, bold: true, color: { rgb: EXCEL_WHITE } },
  fill: { patternType: "solid", fgColor: { rgb: EXCEL_NAVY } },
  alignment: { vertical: "center" },
};

export const subtitleStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 12, bold: true, color: { rgb: EXCEL_WHITE } },
  fill: { patternType: "solid", fgColor: { rgb: EXCEL_NAVY_CARD } },
  alignment: { vertical: "center" },
};

export const sectionStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 11, bold: true, color: { rgb: EXCEL_NAVY } },
  fill: { patternType: "solid", fgColor: { rgb: EXCEL_SOFT } },
  alignment: { vertical: "center" },
};

export const headerStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 11, bold: true, color: { rgb: EXCEL_WHITE } },
  fill: { patternType: "solid", fgColor: { rgb: EXCEL_NAVY } },
  alignment: { vertical: "center", wrapText: true },
  border: { bottom: thin },
};

export const labelStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 11, color: { rgb: EXCEL_MUTED } },
  alignment: { vertical: "center" },
};

export const valueStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 11, bold: true, color: { rgb: EXCEL_TEXT } },
  alignment: { vertical: "center" },
};

export const noteStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 10, color: { rgb: EXCEL_MUTED } },
  alignment: { vertical: "center", wrapText: true },
};

export const bodyStyle: ExcelCellStyle = {
  font: { name: EXCEL_FONT, sz: 11, color: { rgb: EXCEL_TEXT } },
  alignment: { vertical: "center", wrapText: true },
};

export const altBodyStyle: ExcelCellStyle = {
  ...bodyStyle,
  fill: { patternType: "solid", fgColor: { rgb: EXCEL_ALT } },
};

export function moneyFormat(currency: string): string {
  if (currency === "USD") return '"$"#,##0.00';
  if (currency === "GBP") return '"£"#,##0.00';
  return '"€"#,##0.00';
}

export function percentFormat(): string {
  return '0.0"%"';
}

/** Calendar dates only — Excel serial, never a JS Date (avoids timezone day-shift). */
export const EXCEL_DATE_FORMAT = "yyyy-mm-dd";

export const TITLE_ROW_HEIGHT_PT = 22;
export const BODY_ROW_HEIGHT_PT = 18;
export const MAX_WRAPPED_ROW_HEIGHT_PT = 48;

/**
 * Excel 1900-date serial for a YYYY-MM-DD calendar date.
 * Uses UTC so the recorded day cannot shift with the local timezone.
 * Returns null when the value is not a calendar date.
 */
export function excelSerialFromIsoDate(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  if (
    !Number.isFinite(utc) ||
    new Date(utc).getUTCFullYear() !== year ||
    new Date(utc).getUTCMonth() !== month - 1 ||
    new Date(utc).getUTCDate() !== day
  ) {
    return null;
  }
  return (utc - Date.UTC(1899, 11, 30)) / 86_400_000;
}

export function estimateWrappedLineCount(
  text: string,
  columnWidthChars: number,
): number {
  const width = Math.max(8, columnWidthChars);
  const source = text.trim() ? text : " ";
  return source.split(/\n/).reduce((sum, part) => {
    const length = part.trim().length || 1;
    return sum + Math.max(1, Math.ceil(length / width));
  }, 0);
}

export function wrappedRowHeightPt(
  text: string,
  columnWidthChars: number,
  fontSize = 11,
): number {
  const lines = estimateWrappedLineCount(text, columnWidthChars);
  const perLine = fontSize >= 16 ? 20 : fontSize + 6;
  return Math.min(
    MAX_WRAPPED_ROW_HEIGHT_PT,
    Math.max(BODY_ROW_HEIGHT_PT, lines * perLine),
  );
}

export function styled(
  value: string | number | Date | boolean | null | undefined,
  style?: ExcelCellStyle,
  numFmt?: string,
): StyledExcelCell | string {
  if (value == null) {
    return { v: "", t: "s", s: style };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return { v: "Unavailable", t: "s", s: style };
    }
    return {
      v: value,
      t: "n",
      z: numFmt,
      s: numFmt ? { ...style, numFmt } : style,
    };
  }
  if (value instanceof Date) {
    return { v: value, t: "d", z: numFmt ?? "yyyy-mm-dd", s: style };
  }
  return { v: value, t: "s", s: style };
}

export function landscapePrintSetup(): Record<string, unknown> {
  return {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
}

export function portraitPrintSetup(): Record<string, unknown> {
  return {
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  };
}

export const EXCEL_MARGINS = {
  left: 0.5,
  right: 0.5,
  top: 0.6,
  bottom: 0.6,
  header: 0.3,
  footer: 0.3,
};
