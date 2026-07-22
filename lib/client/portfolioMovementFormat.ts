import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";

export function formatSignedPortfolioCurrency(value: number): string {
  if (value === 0) {
    return formatPortfolioCurrency(0);
  }

  const formatted = formatPortfolioCurrency(Math.abs(value));
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatSignedPortfolioPercent(value: number): string {
  if (value === 0) {
    return "0.0%";
  }

  const formatted = formatPortfolioPercent(Math.abs(value));
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatHoldingTodayChange(
  amount: number | null,
  percent: number | null,
): string {
  if (amount === null || percent === null) {
    return "Change unavailable";
  }

  if (amount === 0 && percent === 0) {
    return `${formatPortfolioCurrency(0)} · 0.0%`;
  }

  return `${formatSignedPortfolioCurrency(amount)} · ${formatSignedPortfolioPercent(percent)}`;
}
