/**
 * Dividend frequency normalization from provider labels and calendar history.
 */

import type { DividendFrequency } from "@/lib/types/dividends";
import type { EodhdCalendarDividendRow } from "@/lib/services/dividends/eodhdDividendClient";

export function normalizeDividendFrequency(
  raw: string | null | undefined,
): DividendFrequency {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return "unknown";

  if (text.includes("month")) return "monthly";
  if (text.includes("quarter")) return "quarterly";
  if (text.includes("semi") || text.includes("half")) return "semi_annual";
  if (text.includes("annual") || text.includes("year")) return "annual";

  return "unknown";
}

export function inferFrequencyFromCalendarRows(
  rows: EodhdCalendarDividendRow[],
): DividendFrequency {
  if (rows.length === 0) return "unknown";

  const labeled = rows
    .map((row) => normalizeDividendFrequency(row.period))
    .find((value) => value !== "unknown");
  if (labeled) return labeled;

  const dated = rows
    .map((row) => row.date)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);

  if (dated.length < 2) return "unknown";

  const gaps: number[] = [];
  for (let index = 0; index < dated.length - 1; index += 1) {
    gaps.push(Math.abs(dated[index] - dated[index + 1]) / (1000 * 60 * 60 * 24));
  }

  const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  if (averageGap <= 40) return "monthly";
  if (averageGap <= 110) return "quarterly";
  if (averageGap <= 210) return "semi_annual";
  if (averageGap <= 400) return "annual";
  return "unknown";
}

export function formatDividendFrequency(frequency: DividendFrequency): string {
  switch (frequency) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "semi_annual":
      return "Semi-annual";
    case "annual":
      return "Annual";
    default:
      return "Unknown";
  }
}
