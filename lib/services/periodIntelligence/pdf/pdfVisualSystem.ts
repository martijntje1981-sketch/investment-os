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
  navy: rgb("#0D243F"),
  navyDeep: rgb("#09182B"),
  navyMid: rgb("#16304F"),
  cyan: rgb("#5DB7FF"),
  cyanDeep: rgb("#2A8FD6"),
  purple: rgb("#7C5CFC"),
  orange: rgb("#E8943A"),
  mint: rgb("#2FAE8C"),
  green: rgb("#1F9A6B"),
  negative: rgb("#C45C4A"),
  ink: rgb("#122033"),
  muted: rgb("#5B6B7C"),
  line: rgb("#E4E9EF"),
  paper: rgb("#F7F9FC"),
  paperWarm: rgb("#F4F1EB"),
  paperCyan: rgb("#F3F8FC"),
  paperPurple: rgb("#F6F4FD"),
  paperOrange: rgb("#FBF6F0"),
  paperMint: rgb("#F2F8F6"),
  white: rgb("#FFFFFF"),
  whiteMuted: rgb("#D7E3F0"),
  whiteSoft: rgb("#9BB0C6"),
  demo: rgb("#E8C56B"),
  unclassified: rgb("#94A3B8"),
  chartFill: rgb("#D7E8F8"),
} as const;

export const PDF_QUESTION_TINT: Record<FourQuestionId, PdfColor> = {
  what_happened: PDF_THEME.paperCyan,
  what_matters_now: PDF_THEME.paperPurple,
  am_i_on_track: PDF_THEME.paperOrange,
  whats_ahead: PDF_THEME.paperMint,
};

export const PDF_QUESTION_ACCENT: Record<FourQuestionId, PdfColor> = {
  what_happened: PDF_THEME.cyan,
  what_matters_now: PDF_THEME.purple,
  am_i_on_track: PDF_THEME.orange,
  whats_ahead: PDF_THEME.mint,
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
