import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import {
  buildCryptoQuoteCacheKey,
  resolveCryptoQuoteFallbackPlan,
} from "@/lib/services/prices/cryptoQuoteResolution";
import {
  buildUnavailableCryptoQuote,
  normalizeCryptoProviderQuote,
} from "@/lib/services/prices/cryptoQuoteNormalization";
import {
  buildCryptoFxRates,
  usdToStablecoinRateFromProviderPrice,
  type CryptoFxRates,
} from "@/lib/services/prices/cryptoFxRates";
import { ProviderQuoteError } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import type {
  MarketDataProvider,
  NormalizedProviderQuote,
  PriceCurrency,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";

async function fetchOptionalForexToEur(
  provider: MarketDataProvider,
  pairSymbol: string,
): Promise<number | null> {
  try {
    const raw = await provider.getQuote(pairSymbol);
    if (!Number.isFinite(raw.originalPrice) || raw.originalPrice <= 0) {
      return null;
    }
    return 1 / raw.originalPrice;
  } catch {
    return null;
  }
}

async function fetchOptionalStablecoinUsdRate(
  provider: MarketDataProvider,
  symbol: "USDC-USD.CC" | "USDT-USD.CC",
): Promise<number | null> {
  try {
    const raw = await provider.getQuote(symbol);
    return usdToStablecoinRateFromProviderPrice(raw.originalPrice);
  } catch {
    return null;
  }
}

export async function buildCryptoFxRatesForPlans(
  provider: MarketDataProvider,
  baseFx: Record<PriceCurrency, number | null>,
): Promise<CryptoFxRates> {
  const [jpyToEur, audToEur, cadToEur, usdToUsdc, usdToUsdt] = await Promise.all([
    fetchOptionalForexToEur(provider, "EURJPY.FOREX"),
    fetchOptionalForexToEur(provider, "EURAUD.FOREX"),
    fetchOptionalForexToEur(provider, "EURCAD.FOREX"),
    fetchOptionalStablecoinUsdRate(provider, "USDC-USD.CC"),
    fetchOptionalStablecoinUsdRate(provider, "USDT-USD.CC"),
  ]);

  return buildCryptoFxRates(baseFx, {
    JPY_TO_EUR: jpyToEur,
    AUD_TO_EUR: audToEur,
    CAD_TO_EUR: cadToEur,
    USD_TO_USDC: usdToUsdc,
    USD_TO_USDT: usdToUsdt,
  });
}

export async function fetchCryptoNormalizedQuote(
  target: ResolvedPriceTarget,
  provider: MarketDataProvider,
  baseFx: Record<PriceCurrency, number | null>,
): Promise<NormalizedProviderQuote> {
  const plan = target.cryptoPlan;
  if (!plan) {
    return buildUnavailableCryptoQuote(
      target,
      {
        baseAsset: target.symbol,
        quoteCurrency: "EUR",
        normalizedPair: `${target.symbol}/EUR`,
        providerSymbol: target.providerSymbol,
        sourcePair: `${target.symbol}/EUR`,
        conversionApplied: false,
        conversionPath: null,
      },
      "Missing crypto quote plan.",
    );
  }

  const cryptoFx = await buildCryptoFxRatesForPlans(provider, baseFx);
  const fetchedAt = new Date().toISOString();

  const attemptFetch = async (
    activePlan: typeof plan,
  ): Promise<NormalizedProviderQuote & { crypto: NonNullable<NormalizedProviderQuote["crypto"]> }> => {
    const raw = await provider.getQuote(activePlan.providerSymbol);
    return normalizeCryptoProviderQuote({
      target: { ...target, providerSymbol: activePlan.providerSymbol },
      plan: activePlan,
      raw,
      fx: cryptoFx,
      fetchedAt,
    });
  };

  try {
    const direct = await attemptFetch(plan);
    if (direct.crypto.pairPrice != null && direct.currentPrice != null) {
      return direct;
    }
  } catch (error) {
    if (
      !(error instanceof ProviderQuoteError) ||
      (error.kind !== "invalid_symbol" && error.kind !== "incomplete_quote")
    ) {
      throw error;
    }
  }

  const fallbackPlan = resolveCryptoQuoteFallbackPlan(plan);
  if (!fallbackPlan) {
    return buildUnavailableCryptoQuote(
      target,
      plan,
      `No reliable live quote is available for ${plan.normalizedPair}.`,
    );
  }

  try {
    const converted = await attemptFetch(fallbackPlan);
    if (converted.crypto.pairPrice != null && converted.currentPrice != null) {
      return converted;
    }
    return buildUnavailableCryptoQuote(
      target,
      plan,
      `No reliable live quote is available for ${plan.normalizedPair}.`,
    );
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : `No reliable live quote is available for ${plan.normalizedPair}.`;
    return buildUnavailableCryptoQuote(target, plan, reason);
  }
}

export function buildCryptoNormalizedCacheKey(
  target: ResolvedPriceTarget,
): string | null {
  if (!target.cryptoPlan) {
    return null;
  }
  return buildCryptoQuoteCacheKey(
    EODHD_QUOTE_PROVIDER_ID,
    target.cryptoPlan.normalizedPair,
  );
}
