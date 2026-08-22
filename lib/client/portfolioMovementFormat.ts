import { formatPortfolioCurrency } from "@/lib/client/portfolioAnalysis";
import {
  formatSmartPercent,
  resolveSmartMoneyFractionDigits,
} from "@/lib/client/smartPriceFormat";

/** Supports base-currency formatters that accept optional display decimals. */
type CurrencyFormatter = (value: number, decimals?: number) => string;

function defaultMoney(value: number, decimals?: number): string {
  return formatPortfolioCurrency(
    value,
    "EUR",
    decimals ?? resolveSmartMoneyFractionDigits(value),
  );
}

export function formatSignedPortfolioCurrency(
  value: number,
  formatCurrency: CurrencyFormatter = defaultMoney,
): string {
  const decimals = resolveSmartMoneyFractionDigits(value);
  if (value === 0) {
    return formatCurrency(0, 0);
  }

  const formatted = formatCurrency(Math.abs(value), decimals);
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatSignedPortfolioPercent(value: number): string {
  if (value === 0) {
    return "0.0%";
  }

  const formatted = formatSmartPercent(Math.abs(value));
  return value > 0 ? `+${formatted}` : `−${formatted}`;
}

export function formatHoldingTodayChange(
  amount: number | null,
  percent: number | null,
  formatCurrency: CurrencyFormatter = defaultMoney,
): string {
  if (amount === null || percent === null) {
    return "Change unavailable";
  }

  if (amount === 0 && percent === 0) {
    return `${formatCurrency(0, 0)} · 0.0%`;
  }

  return `${formatSignedPortfolioCurrency(amount, formatCurrency)} · ${formatSignedPortfolioPercent(percent)}`;
}
