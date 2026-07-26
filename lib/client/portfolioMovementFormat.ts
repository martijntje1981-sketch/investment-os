import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";

type CurrencyFormatter = (value: number) => string;

export function formatSignedPortfolioCurrency(
  value: number,
  formatCurrency: CurrencyFormatter = formatPortfolioCurrency,
): string {
  if (value === 0) {
    return formatCurrency(0);
  }

  const formatted = formatCurrency(Math.abs(value));
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
  formatCurrency: CurrencyFormatter = formatPortfolioCurrency,
): string {
  if (amount === null || percent === null) {
    return "Change unavailable";
  }

  if (amount === 0 && percent === 0) {
    return `${formatCurrency(0)} · 0.0%`;
  }

  return `${formatSignedPortfolioCurrency(amount, formatCurrency)} · ${formatSignedPortfolioPercent(percent)}`;
}
