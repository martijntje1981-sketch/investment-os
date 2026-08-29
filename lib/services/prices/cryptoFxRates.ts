import type { PriceCurrency } from "@/lib/services/prices/types";
import type { CryptoQuoteCurrency } from "@/lib/services/prices/cryptoQuoteTypes";

export type CryptoFxRates = Record<PriceCurrency, number | null> & {
  JPY_TO_EUR: number | null;
  AUD_TO_EUR: number | null;
  CAD_TO_EUR: number | null;
  /** USDC units received per 1 USD — from provider USDC-USD.CC, never hard-coded. */
  USD_TO_USDC: number | null;
  /** USDT units received per 1 USD — from provider USDT-USD.CC, never hard-coded. */
  USD_TO_USDT: number | null;
};

export const DEFAULT_CRYPTO_FX_RATES: CryptoFxRates = {
  EUR: 1,
  USD: null,
  GBP: null,
  CHF: null,
  JPY_TO_EUR: null,
  AUD_TO_EUR: null,
  CAD_TO_EUR: null,
  USD_TO_USDC: null,
  USD_TO_USDT: null,
};

/**
 * EODHD USDC-USD.CC returns USD price of 1 USDC.
 * Convert to how many USDC equal 1 USD.
 */
export function usdToStablecoinRateFromProviderPrice(
  stablecoinUsdPrice: number,
): number | null {
  if (!Number.isFinite(stablecoinUsdPrice) || stablecoinUsdPrice <= 0) {
    return null;
  }
  return 1 / stablecoinUsdPrice;
}

export function buildCryptoFxRates(
  baseFx: Record<PriceCurrency, number | null>,
  extras?: Partial<
    Pick<
      CryptoFxRates,
      "JPY_TO_EUR" | "AUD_TO_EUR" | "CAD_TO_EUR" | "USD_TO_USDC" | "USD_TO_USDT"
    >
  >,
): CryptoFxRates {
  return {
    ...DEFAULT_CRYPTO_FX_RATES,
    ...baseFx,
    ...extras,
  };
}

export function quoteCurrencyToEurRate(
  quoteCurrency: CryptoQuoteCurrency,
  fx: CryptoFxRates,
): number | null {
  switch (quoteCurrency) {
    case "EUR":
      return 1;
    case "USD":
      return fx.USD;
    case "GBP":
      return fx.GBP;
    case "CHF":
      return fx.CHF;
    case "JPY":
      return fx.JPY_TO_EUR;
    case "AUD":
      return fx.AUD_TO_EUR;
    case "CAD":
      return fx.CAD_TO_EUR;
    case "USDC":
      return fx.USD != null && fx.USD_TO_USDC != null
        ? fx.USD * fx.USD_TO_USDC
        : null;
    case "USDT":
      return fx.USD != null && fx.USD_TO_USDT != null
        ? fx.USD * fx.USD_TO_USDT
        : null;
    default:
      return null;
  }
}

export function convertPairPriceToQuoteCurrency(input: {
  wirePrice: number;
  wireQuoteCurrency: string;
  requestedQuoteCurrency: CryptoQuoteCurrency;
  fx: CryptoFxRates;
}): {
  pairPrice: number | null;
  conversionApplied: boolean;
  conversionPath: string | null;
} {
  const wire = input.wireQuoteCurrency.trim().toUpperCase();
  const requested = input.requestedQuoteCurrency;

  if (wire === requested) {
    return {
      pairPrice: input.wirePrice,
      conversionApplied: false,
      conversionPath: null,
    };
  }

  if (wire === "USD" && requested === "USDC") {
    if (input.fx.USD_TO_USDC == null) {
      return {
        pairPrice: null,
        conversionApplied: true,
        conversionPath: "USD/USDC",
      };
    }
    return {
      pairPrice: input.wirePrice * input.fx.USD_TO_USDC,
      conversionApplied: true,
      conversionPath: "USD/USDC",
    };
  }

  if (wire === "USD" && requested === "USDT") {
    if (input.fx.USD_TO_USDT == null) {
      return {
        pairPrice: null,
        conversionApplied: true,
        conversionPath: "USD/USDT",
      };
    }
    return {
      pairPrice: input.wirePrice * input.fx.USD_TO_USDT,
      conversionApplied: true,
      conversionPath: "USD/USDT",
    };
  }

  if (wire === "USD") {
    const targetToEur = quoteCurrencyToEurRate(requested, input.fx);
    const usdToEur = input.fx.USD;
    if (targetToEur == null || usdToEur == null || usdToEur <= 0) {
      return { pairPrice: null, conversionApplied: true, conversionPath: `USD/${requested}` };
    }
    return {
      pairPrice: input.wirePrice * (usdToEur / targetToEur),
      conversionApplied: true,
      conversionPath: `USD/${requested}`,
    };
  }

  if (wire === "EUR" && requested !== "EUR") {
    const targetToEur = quoteCurrencyToEurRate(requested, input.fx);
    if (targetToEur == null || targetToEur <= 0) {
      return { pairPrice: null, conversionApplied: true, conversionPath: `EUR/${requested}` };
    }
    return {
      pairPrice: input.wirePrice / targetToEur,
      conversionApplied: true,
      conversionPath: `EUR/${requested}`,
    };
  }

  return {
    pairPrice: null,
    conversionApplied: true,
    conversionPath: `${wire}/${requested}`,
  };
}

export function pairPriceToEurPerUnit(
  pairPrice: number,
  quoteCurrency: CryptoQuoteCurrency,
  fx: CryptoFxRates,
): number | null {
  const rate = quoteCurrencyToEurRate(quoteCurrency, fx);
  if (rate == null || rate <= 0) {
    return null;
  }
  return pairPrice * rate;
}
