/**
 * Reusable Tobailey PDF visual system for weekly/monthly reviews.
 * Calm premium color, not a statement printout and not a terminal.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";
import type { PdfColor } from "@/lib/services/periodIntelligence/pdf/encodePdf";
import type { PersonalReportAccent } from "@/lib/services/periodIntelligence/reportViewModel";

function rgb(hex: string): PdfColor {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

export const PDF_THEME = {
  navy: rgb("#0B1F3A"),
  navyDeep: rgb("#071525"),
  navyMid: rgb("#16324F"),
  cyan: rgb("#5DB7FF"),
  cyanDeep: rgb("#2EB5F0"),
  purple: rgb("#2773C8"),
  orange: rgb("#B45309"),
  mint: rgb("#163A66"),
  green: rgb("#157A3E"),
  negative: rgb("#C62828"),
  ink: rgb("#0B1F3A"),
  muted: rgb("#4A5D73"),
  line: rgb("#D5E2EF"),
  paper: rgb("#F4F7FB"),
  paperWarm: rgb("#F4F8FC"),
  paperCyan: rgb("#C4ECFB"),
  paperPurple: rgb("#D0DFF4"),
  paperOrange: rgb("#CDD6EA"),
  paperMint: rgb("#D0D6E1"),
  white: rgb("#FFFFFF"),
  whiteMuted: rgb("#D7E3F0"),
  whiteSoft: rgb("#9BB0C6"),
  demo: rgb("#E8C56B"),
  unclassified: rgb("#94A3B8"),
  chartFill: rgb("#E4F3FC"),
} as const;

export const PDF_QUESTION_TINT: Record<FourQuestionId, PdfColor> = {
  what_happened: PDF_THEME.paperCyan,
  what_matters_now: PDF_THEME.paperPurple,
  am_i_on_track: PDF_THEME.paperOrange,
  whats_ahead: PDF_THEME.paperMint,
};

export const PDF_QUESTION_ACCENT: Record<FourQuestionId, PdfColor> = {
  what_happened: rgb("#2EB5F0"),
  what_matters_now: rgb("#2773C8"),
  am_i_on_track: rgb("#1B4F9A"),
  whats_ahead: rgb("#163A66"),
};

export const PDF_SECTION_ACCENT: Record<PersonalReportAccent, PdfColor> = {
  cyan: PDF_THEME.cyan,
  violet: PDF_THEME.purple,
  amber: PDF_THEME.orange,
  teal: PDF_THEME.mint,
  slate: PDF_THEME.muted,
};

/** Tailwind semantic group colors mapped to print-safe RGB. */
export const PDF_EXPOSURE_COLOR: Record<ExposureGroupId, PdfColor> = {
  technology_communication: rgb("#0284C7"),
  healthcare: rgb("#F43F5E"),
  consumer: rgb("#F97316"),
  financials_real_estate: rgb("#4F46E5"),
  industrials_resources: rgb("#D97706"),
  diversified_equity: rgb("#334155"),
  fixed_income: rgb("#0F766E"),
  precious_metals: rgb("#A16207"),
  crypto: rgb("#7C3AED"),
  cash: rgb("#059669"),
  other_unclassified: rgb("#94A3B8"),
};

export const PDF_LAYOUT = {
  marginX: 42,
  marginTop: 32,
  marginBottom: 48,
  headerHeight: 26,
  footerHeight: 30,
  contentTop: 40,
} as const;
