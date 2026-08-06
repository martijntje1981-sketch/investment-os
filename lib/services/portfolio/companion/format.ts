import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";

export type CompanionMoneyFormatter = (value: number) => string;

export function defaultCompanionMoneyFormatter(value: number): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSignedMoney(
  value: number,
  formatMoney: CompanionMoneyFormatter,
): string {
  const abs = formatMoney(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function formatSignedPercent(percent: number): string {
  const abs = formatPortfolioPercent(Math.abs(percent));
  if (percent > 0) return `+${abs}`;
  if (percent < 0) return `−${abs}`;
  return abs;
}

export function movementTone(
  value: number | null | undefined,
): "positive" | "negative" | "neutral" {
  if (value == null || !Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "positive" : "negative";
}
