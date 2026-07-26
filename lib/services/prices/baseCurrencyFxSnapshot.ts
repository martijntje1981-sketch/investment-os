/**
 * Portfolio base-currency FX snapshot — presentation only.
 * Canonical ledger amounts remain EUR.
 */

import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";

export type BaseCurrencyFxStatus =
  | "identity"
  | "current"
  | "cached"
  | "stale"
  | "unavailable";

export type BaseCurrencyFxSnapshot = {
  baseCurrency: PortfolioBaseCurrency;
  /** Multiply canonical EUR amount by this rate to get base currency. */
  eurToBaseRate: number | null;
  source: "identity" | "EODHD";
  /** Provider quote timestamp when known; never click/render time. */
  updatedAt: string | null;
  status: BaseCurrencyFxStatus;
  conversionPath: string;
  /** Underlying foreign→EUR rate used for inversion (null for EUR). */
  foreignToEurRate: number | null;
};

export type BaseCurrencyFxRatesBag = {
  EUR: number;
  USD_TO_EUR: number | null;
  GBP_TO_EUR: number | null;
  CHF_TO_EUR?: number | null;
};

export function isValidFxRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function invertToEurRate(foreignToEur: number): number | null {
  if (!isValidFxRate(foreignToEur)) return null;
  return 1 / foreignToEur;
}

/**
 * Build a presentation FX snapshot from PriceService-style rates.
 * EUR is identity (rate 1). USD/GBP invert *_TO_EUR.
 */
export function buildBaseCurrencyFxSnapshot(input: {
  baseCurrency: PortfolioBaseCurrency;
  rates: BaseCurrencyFxRatesBag;
  updatedAt?: string | null;
  status?: Exclude<BaseCurrencyFxStatus, "identity" | "unavailable">;
}): BaseCurrencyFxSnapshot {
  const { baseCurrency, rates } = input;

  if (baseCurrency === "EUR") {
    return {
      baseCurrency: "EUR",
      eurToBaseRate: 1,
      source: "identity",
      updatedAt: null,
      status: "identity",
      conversionPath: "EUR (identity)",
      foreignToEurRate: null,
    };
  }

  const foreignToEur =
    baseCurrency === "USD" ? rates.USD_TO_EUR : rates.GBP_TO_EUR;
  const eurToBase = isValidFxRate(foreignToEur)
    ? invertToEurRate(foreignToEur)
    : null;

  if (eurToBase == null) {
    return {
      baseCurrency,
      eurToBaseRate: null,
      source: "EODHD",
      updatedAt: input.updatedAt ?? null,
      status: "unavailable",
      conversionPath:
        baseCurrency === "USD"
          ? "EUR → USD via EURUSD.FOREX (unavailable)"
          : "EUR → GBP via EURGBP.FOREX (unavailable)",
      foreignToEurRate: isValidFxRate(foreignToEur) ? foreignToEur : null,
    };
  }

  return {
    baseCurrency,
    eurToBaseRate: eurToBase,
    source: "EODHD",
    updatedAt: input.updatedAt ?? null,
    status: input.status ?? "current",
    conversionPath:
      baseCurrency === "USD"
        ? "EUR → USD via invert(USD_TO_EUR from EURUSD.FOREX)"
        : "EUR → GBP via invert(GBP_TO_EUR from EURGBP.FOREX)",
    foreignToEurRate: foreignToEur,
  };
}

export function convertCanonicalEurAmount(
  amountEur: number | null | undefined,
  snapshot: BaseCurrencyFxSnapshot,
): number | null {
  if (
    amountEur == null ||
    !Number.isFinite(amountEur) ||
    snapshot.eurToBaseRate == null ||
    snapshot.status === "unavailable"
  ) {
    return null;
  }

  return amountEur * snapshot.eurToBaseRate;
}

export function formatBaseCurrencyAmount(
  amountEur: number | null | undefined,
  snapshot: BaseCurrencyFxSnapshot,
  decimals = 0,
): string {
  const converted = convertCanonicalEurAmount(amountEur, snapshot);
  if (converted == null) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: snapshot.baseCurrency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(converted);
}

/** Compact chart/card labels (€1.2k / $1.2m style) after conversion. */
export function formatBaseCurrencyCompact(
  amountEur: number | null | undefined,
  snapshot: BaseCurrencyFxSnapshot,
): string {
  const converted = convertCanonicalEurAmount(amountEur, snapshot);
  if (converted == null) {
    return "Unavailable";
  }

  const abs = Math.abs(converted);
  const sign = converted < 0 ? "-" : "";
  const symbol =
    snapshot.baseCurrency === "USD"
      ? "$"
      : snapshot.baseCurrency === "GBP"
        ? "£"
        : "€";

  if (abs >= 1_000_000) {
    return `${sign}${symbol}${(abs / 1_000_000).toFixed(1)}m`;
  }
  if (abs >= 1_000) {
    return `${sign}${symbol}${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }

  return formatBaseCurrencyAmount(amountEur, snapshot, abs < 10 ? 2 : 0);
}

export function baseCurrencyFxStatusLabel(
  status: BaseCurrencyFxStatus,
): string {
  switch (status) {
    case "identity":
      return "Base currency";
    case "current":
      return "Latest available";
    case "cached":
      return "Cached";
    case "stale":
      return "Stale";
    case "unavailable":
      return "Unavailable";
  }
}

export function formatEurToBaseRateDisclosure(
  snapshot: BaseCurrencyFxSnapshot,
): string | null {
  if (
    snapshot.baseCurrency === "EUR" ||
    snapshot.eurToBaseRate == null ||
    !Number.isFinite(snapshot.eurToBaseRate)
  ) {
    return null;
  }

  return `1 EUR = ${snapshot.eurToBaseRate.toFixed(4)} ${snapshot.baseCurrency}`;
}

/**
 * True when the snapshot can safely convert monetary inputs for persistence.
 * Never treats a missing USD/GBP rate as identity (rate 1).
 */
export function canPersistBaseCurrencyAmounts(
  snapshot: BaseCurrencyFxSnapshot,
): boolean {
  if (snapshot.baseCurrency === "EUR") {
    return (
      snapshot.status === "identity" &&
      snapshot.eurToBaseRate === 1 &&
      isValidFxRate(snapshot.eurToBaseRate)
    );
  }

  return (
    snapshot.status !== "unavailable" && isValidFxRate(snapshot.eurToBaseRate)
  );
}

/**
 * Convert a selected-base-currency amount to canonical EUR for persistence.
 * Does not round. Returns null when FX is missing/invalid (never rate=1 fallback).
 */
export function convertBaseAmountToCanonicalEur(
  amountBase: number | null | undefined,
  snapshot: BaseCurrencyFxSnapshot,
): number | null {
  if (amountBase == null || !Number.isFinite(amountBase)) {
    return null;
  }

  if (!canPersistBaseCurrencyAmounts(snapshot)) {
    return null;
  }

  const rate = snapshot.eurToBaseRate;
  if (!isValidFxRate(rate)) {
    return null;
  }

  return amountBase / rate;
}

/** Absolute + relative tolerance for EUR↔base round-trip assertions. */
export const BASE_CURRENCY_ROUND_TRIP_ABS_TOLERANCE = 1e-6;
export const BASE_CURRENCY_ROUND_TRIP_REL_TOLERANCE = 1e-9;

export function amountsMateriallyEqual(a: number, b: number): boolean {
  const diff = Math.abs(a - b);
  if (diff <= BASE_CURRENCY_ROUND_TRIP_ABS_TOLERANCE) {
    return true;
  }

  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return diff / scale <= BASE_CURRENCY_ROUND_TRIP_REL_TOLERANCE;
}

export const FX_UNAVAILABLE_SAVE_MESSAGE =
  "Currency conversion is currently unavailable. Please retry in a moment.";

export const FX_UNAVAILABLE_EDIT_MESSAGE =
  "Conversion is currently unavailable, so amounts cannot be edited in the selected currency. Please retry shortly.";

export const IDENTITY_EUR_FX_SNAPSHOT: BaseCurrencyFxSnapshot =
  buildBaseCurrencyFxSnapshot({
    baseCurrency: "EUR",
    rates: { EUR: 1, USD_TO_EUR: null, GBP_TO_EUR: null },
  });
