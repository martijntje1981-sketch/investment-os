import { describe, expect, it } from "vitest";

import {
  buildCryptoNormalizedPair,
  buildEodhdCryptoProviderSymbol,
  resolveCryptoQuoteFetchPlan,
  resolveCryptoQuoteFallbackPlan,
} from "@/lib/services/prices/cryptoQuoteResolution";
import {
  convertPairPriceToQuoteCurrency,
  pairPriceToEurPerUnit,
  buildCryptoFxRates,
  usdToStablecoinRateFromProviderPrice,
} from "@/lib/services/prices/cryptoFxRates";
import { normalizeCryptoProviderQuote } from "@/lib/services/prices/cryptoQuoteNormalization";
import type { ProviderRawQuote, ResolvedPriceTarget } from "@/lib/services/prices/types";

const fx = buildCryptoFxRates({
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CHF: 1.04,
}, {
  JPY_TO_EUR: 0.0062,
  AUD_TO_EUR: 0.61,
  CAD_TO_EUR: 0.68,
  USD_TO_USDC: usdToStablecoinRateFromProviderPrice(0.9998)!,
  USD_TO_USDT: usdToStablecoinRateFromProviderPrice(0.9995)!,
});

describe("cryptoQuoteResolution", () => {
  it("builds BTC/EUR direct plan", () => {
    const plan = resolveCryptoQuoteFetchPlan("BTC", "EUR");
    expect(plan).toEqual(
      expect.objectContaining({
        normalizedPair: "BTC/EUR",
        providerSymbol: "BTC-EUR.CC",
        conversionApplied: false,
      }),
    );
  });

  it("builds ETH/USD direct plan", () => {
    const plan = resolveCryptoQuoteFetchPlan("ETH", "USD");
    expect(plan?.normalizedPair).toBe("ETH/USD");
    expect(plan?.providerSymbol).toBe("ETH-USD.CC");
  });

  it("builds SOL/USDC direct plan without treating USDC as USD", () => {
    const plan = resolveCryptoQuoteFetchPlan("SOL", "USDC");
    expect(plan?.normalizedPair).toBe("SOL/USDC");
    expect(plan?.providerSymbol).toBe("SOL-USDC.CC");
    expect(plan?.conversionApplied).toBe(false);
  });

  it("creates USD fallback for USDC with explicit conversion path", () => {
    const plan = resolveCryptoQuoteFetchPlan("SOL", "USDC");
    const fallback = resolveCryptoQuoteFallbackPlan(plan!);
    expect(fallback?.providerSymbol).toBe("SOL-USD.CC");
    expect(fallback?.conversionPath).toBe("USD/USDC");
  });

  it("rejects unsupported pair currency", () => {
    expect(resolveCryptoQuoteFetchPlan("BTC", "XYZ")).toBeNull();
  });
});

describe("cryptoFxRates", () => {
  it("converts USD wire price to USDC using provider-derived rate, not 1:1", () => {
    const converted = convertPairPriceToQuoteCurrency({
      wirePrice: 100,
      wireQuoteCurrency: "USD",
      requestedQuoteCurrency: "USDC",
      fx,
    });

    expect(converted.conversionApplied).toBe(true);
    expect(converted.conversionPath).toBe("USD/USDC");
    expect(converted.pairPrice).toBeCloseTo(100 / 0.9998, 4);
    expect(converted.pairPrice).not.toBe(100);
  });

  it("returns unavailable when stablecoin conversion rate is missing", () => {
    const withoutStablecoinFx = buildCryptoFxRates({
      EUR: 1,
      USD: 0.92,
      GBP: null,
      CHF: null,
    });

    const converted = convertPairPriceToQuoteCurrency({
      wirePrice: 150,
      wireQuoteCurrency: "USD",
      requestedQuoteCurrency: "USDC",
      fx: withoutStablecoinFx,
    });

    expect(converted.pairPrice).toBeNull();
    expect(converted.conversionPath).toBe("USD/USDC");
  });

  it("never assumes USDC equals USD in EUR valuation", () => {
    const withRate = pairPriceToEurPerUnit(100, "USDC", fx);
    const naive = pairPriceToEurPerUnit(100, "USD", fx);
    expect(withRate).not.toBeNull();
    expect(naive).not.toBeNull();
    expect(withRate!).not.toBeCloseTo(naive!, 6);
  });

  it("keeps direct EUR pair price", () => {
    const converted = convertPairPriceToQuoteCurrency({
      wirePrice: 95_000,
      wireQuoteCurrency: "EUR",
      requestedQuoteCurrency: "EUR",
      fx,
    });
    expect(converted.pairPrice).toBe(95_000);
    expect(converted.conversionApplied).toBe(false);
  });

  it("converts pair price to EUR for portfolio valuation separately", () => {
    const eurPerBtc = pairPriceToEurPerUnit(95_000, "EUR", fx);
    expect(eurPerBtc).toBe(95_000);
    const usdPerEth = pairPriceToEurPerUnit(3_500, "USD", fx);
    expect(usdPerEth).toBeCloseTo(3_220, 0);
  });
});

describe("normalizeCryptoProviderQuote", () => {
  const target: ResolvedPriceTarget = {
    symbol: "BTC",
    providerSymbol: "BTC-EUR.CC",
    isin: null,
    name: "Bitcoin",
    currency: null,
    assetType: "crypto",
    cryptoPlan: resolveCryptoQuoteFetchPlan("BTC", "EUR")!,
  };

  const raw: ProviderRawQuote = {
    providerSymbol: "BTC-EUR.CC",
    wireCurrency: "EUR",
    originalCurrency: "EUR",
    originalPrice: 95_000,
    previousCloseOriginal: 93_000,
    changeOriginal: 2_000,
    changePercentOriginal: 2.15,
    open: null,
    high: null,
    low: null,
    volume: null,
    timestamp: 1_700_000_000,
    updatedAt: new Date(1_700_000_000_000).toISOString(),
    marketStatus: null,
  };

  it("normalizes direct BTC/EUR quote with 24h change", () => {
    const quote = normalizeCryptoProviderQuote({ target, plan: target.cryptoPlan!, raw, fx });
    expect(quote.crypto.pairPrice).toBe(95_000);
    expect(quote.crypto.change24hPercent).toBe(2.15);
    expect(quote.crypto.conversionApplied).toBe(false);
    expect(quote.currentPrice).toBe(95_000);
  });

  it("marks converted metadata when USD fallback is used", () => {
    const usdPlan = resolveCryptoQuoteFallbackPlan(resolveCryptoQuoteFetchPlan("SOL", "USDC")!)!;
    const converted = normalizeCryptoProviderQuote({
      target: { ...target, symbol: "SOL", providerSymbol: "SOL-USD.CC" },
      plan: usdPlan,
      raw: {
        ...raw,
        providerSymbol: "SOL-USD.CC",
        originalPrice: 150,
        changePercentOriginal: -1.5,
      },
      fx,
    });

    expect(converted.crypto.normalizedPair).toBe("SOL/USDC");
    expect(converted.crypto.sourcePair).toBe("SOL/USD");
    expect(converted.crypto.conversionApplied).toBe(true);
    expect(converted.crypto.conversionPath).toBe("USD/USDC");
    expect(converted.crypto.change24hPercent).toBe(-1.5);
  });

  it("preserves negative 24h change on direct quotes", () => {
    const quote = normalizeCryptoProviderQuote({
      target,
      plan: target.cryptoPlan!,
      raw: { ...raw, changePercentOriginal: -1.7571 },
      fx,
    });
    expect(quote.crypto.change24hPercent).toBe(-1.7571);
  });
});

describe("pair labels", () => {
  it("keeps normalized pair formatting stable", () => {
    expect(buildCryptoNormalizedPair("btc", "eur")).toBe("BTC/EUR");
    expect(buildEodhdCryptoProviderSymbol("ETH", "USD")).toBe("ETH-USD.CC");
  });
});
