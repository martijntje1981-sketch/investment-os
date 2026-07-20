/**
 * Resolves dividend data for a single instrument via EODHD.
 */

import {
  extractForwardRateFromHighlights,
  extractYieldFromHighlights,
  fetchFundamentalsHighlights,
  fetchUpcomingCalendarDividends,
  type EodhdCalendarDividendRow,
} from "@/lib/services/dividends/eodhdDividendClient";
import {
  inferFrequencyFromCalendarRows,
  normalizeDividendFrequency,
} from "@/lib/services/dividends/dividendFrequency";
import type { DividendApiQuote, DividendFrequency } from "@/lib/types/dividends";

type ResolveDividendInput = {
  symbol: string;
  providerSymbol: string;
  quantity: number;
  fxRateToEur: number | null;
};

function pickUpcomingRow(
  rows: EodhdCalendarDividendRow[],
): EodhdCalendarDividendRow | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows
    .filter((row) => row.date && row.date >= today)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return upcoming[0] ?? null;
}

function estimatePaymentAmount(
  forwardRate: number | null,
  calendarValue: number | null | undefined,
  frequency: DividendFrequency,
): number | null {
  if (calendarValue != null && Number.isFinite(calendarValue) && calendarValue > 0) {
    return Number(calendarValue);
  }
  if (forwardRate == null || forwardRate <= 0) return null;

  switch (frequency) {
    case "monthly":
      return forwardRate / 12;
    case "quarterly":
      return forwardRate / 4;
    case "semi_annual":
      return forwardRate / 2;
    case "annual":
      return forwardRate;
    default:
      return forwardRate / 4;
  }
}

function toEur(amount: number | null, fxRateToEur: number | null): number | null {
  if (amount == null) return null;
  if (fxRateToEur == null || !Number.isFinite(fxRateToEur)) return amount;
  return amount * fxRateToEur;
}

export async function resolveDividendQuote(
  input: ResolveDividendInput,
): Promise<DividendApiQuote> {
  const now = new Date().toISOString();
  const empty: DividendApiQuote = {
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    paysDividends: false,
    dividendYield: null,
    forwardAnnualDividendRate: null,
    estimatedAnnualDividendEur: null,
    estimatedNextPaymentEur: null,
    nextExDate: null,
    nextPaymentDate: null,
    frequency: "unknown",
    currency: null,
    updatedAt: now,
  };

  try {
    const [{ highlights, currency }, calendarRows] = await Promise.all([
      fetchFundamentalsHighlights(input.providerSymbol),
      fetchUpcomingCalendarDividends(input.providerSymbol),
    ]);

    const dividendYield = extractYieldFromHighlights(highlights);
    const forwardRate = extractForwardRateFromHighlights(highlights);
    const frequency =
      normalizeDividendFrequency(pickUpcomingRow(calendarRows)?.period) !==
      "unknown"
        ? normalizeDividendFrequency(pickUpcomingRow(calendarRows)?.period)
        : inferFrequencyFromCalendarRows(calendarRows);

    const upcoming = pickUpcomingRow(calendarRows);
    const perSharePayment = estimatePaymentAmount(
      forwardRate,
      upcoming?.value,
      frequency,
    );

    const annualPerShare =
      forwardRate ??
      (perSharePayment
        ? perSharePayment *
          (frequency === "monthly"
            ? 12
            : frequency === "quarterly"
              ? 4
              : frequency === "semi_annual"
                ? 2
                : frequency === "annual"
                  ? 1
                  : 4)
        : null);

    const paysDividends = Boolean(
      (dividendYield && dividendYield > 0) ||
        (annualPerShare && annualPerShare > 0) ||
        (perSharePayment && perSharePayment > 0),
    );

    if (!paysDividends) return empty;

    const fx = input.fxRateToEur ?? 1;
    const estimatedAnnualDividendEur = toEur(
      annualPerShare != null ? annualPerShare * input.quantity : null,
      fx,
    );
    const estimatedNextPaymentEur = toEur(
      perSharePayment != null ? perSharePayment * input.quantity : null,
      fx,
    );

    return {
      symbol: input.symbol,
      providerSymbol: input.providerSymbol,
      paysDividends: true,
      dividendYield,
      forwardAnnualDividendRate: forwardRate,
      estimatedAnnualDividendEur,
      estimatedNextPaymentEur,
      nextExDate: upcoming?.date ?? null,
      nextPaymentDate: upcoming?.paymentDate ?? null,
      frequency,
      currency,
      updatedAt: now,
    };
  } catch {
    return empty;
  }
}
