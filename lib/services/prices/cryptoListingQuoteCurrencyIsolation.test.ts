import { describe, expect, it } from "vitest";

import { backfillListingQuoteCurrency } from "@/lib/services/instruments/quoteCurrency";
import {
  resolveCryptoQuoteFallbackPlan,
  resolveCryptoQuoteFetchPlan,
} from "@/lib/services/prices/cryptoQuoteResolution";
import {
  buildCryptoFxRates,
  pairPriceToEurPerUnit,
} from "@/lib/services/prices/cryptoFxRates";
import { normalizeCryptoProviderQuote } from "@/lib/services/prices/cryptoQuoteNormalization";
import { resolveCryptoPriceTarget } from "@/lib/services/prices/resolveCryptoPriceTargets";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import type { ProviderRawQuote, ResolvedPriceTarget } from "@/lib/services/prices/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const fx = buildCryptoFxRates({
  EUR: 1,
  USD: 0.92,
  GBP: null,
  CHF: null,
});

function cryptoHolding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol" | "pairCurrency">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-crypto`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 1,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: "crypto",
    pairCurrency: overrides.pairCurrency,
    providerSymbol: overrides.providerSymbol,
    quoteCurrency: overrides.quoteCurrency,
    requiresConfirmation: overrides.requiresConfirmation,
    matchWarnings: overrides.matchWarnings,
  };
}

describe("crypto isolation from equity listing quote-currency resolution", () => {
  it("derives crypto quoteCurrency from the trading pair, not listing quoteCurrency", () => {
    const btc = resolveCryptoPriceTarget({
      symbol: "BTC",
      name: "Bitcoin",
      assetType: "crypto",
      pairCurrency: "EUR",
      providerSymbol: "BTC-EUR.CC",
      quoteCurrency: "USD",
      currency: "EUR",
    });

    expect(btc?.assetType).toBe("crypto");
    expect(btc?.currency).toBeNull();
    expect(btc?.cryptoPlan?.quoteCurrency).toBe("EUR");
    expect(btc?.cryptoPlan?.normalizedPair).toBe("BTC/EUR");
    expect(btc?.providerSymbol).toBe("BTC-EUR.CC");
  });

  it("routes crypto through the crypto path and keeps BTC/EUR + ETH/EUR direct pairs", () => {
    const { targets, errors } = resolveQuotePriceTargets([
      {
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        pairCurrency: "EUR",
      },
      {
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        pairCurrency: "EUR",
      },
      {
        symbol: "VUSA",
        name: "Vanguard S&P 500 UCITS ETF",
        providerSymbol: "VUSA.AS",
        quoteCurrency: "EUR",
        isin: "IE00B3XXRP09",
      },
    ]);

    expect(errors).toEqual([]);

    const btc = targets.find((target) => target.symbol === "BTC");
    const eth = targets.find((target) => target.symbol === "ETH");
    const vusa = targets.find((target) => target.symbol === "VUSA");

    expect(btc?.assetType).toBe("crypto");
    expect(btc?.cryptoPlan).toEqual(
      expect.objectContaining({
        quoteCurrency: "EUR",
        providerSymbol: "BTC-EUR.CC",
        conversionApplied: false,
        conversionPath: null,
      }),
    );

    expect(eth?.assetType).toBe("crypto");
    expect(eth?.cryptoPlan).toEqual(
      expect.objectContaining({
        quoteCurrency: "EUR",
        providerSymbol: "ETH-EUR.CC",
        conversionApplied: false,
        conversionPath: null,
      }),
    );

    expect(vusa?.assetType).not.toBe("crypto");
    expect(vusa?.currency).toBe("EUR");
    expect(vusa?.cryptoPlan).toBeUndefined();
  });

  it("does not apply equity listing quote-currency backfill to crypto holdings", () => {
    const before = cryptoHolding({
      symbol: "BTC",
      pairCurrency: "EUR",
      providerSymbol: "BTC-EUR.CC",
      requiresConfirmation: false,
      matchWarnings: [],
    });

    const after = backfillListingQuoteCurrency(before);

    expect(after).toEqual(before);
    expect(after.quoteCurrency).toBeUndefined();
    expect(after.pairCurrency).toBe("EUR");
    expect(after.requiresConfirmation).toBe(false);
    expect(after.matchWarnings).toEqual([]);
  });

  it("keeps direct EUR crypto pair valuation without FX conversion", () => {
    const plan = resolveCryptoQuoteFetchPlan("BTC", "EUR")!;
    const target: ResolvedPriceTarget = {
      symbol: "BTC",
      providerSymbol: "BTC-EUR.CC",
      isin: null,
      name: "Bitcoin",
      currency: null,
      assetType: "crypto",
      cryptoPlan: plan,
    };
    const raw: ProviderRawQuote = {
      providerSymbol: "BTC-EUR.CC",
      wireCurrency: "EUR",
      originalCurrency: "EUR",
      originalPrice: 95_000,
      previousCloseOriginal: null,
      changeOriginal: null,
      changePercentOriginal: 1.2,
      open: null,
      high: null,
      low: null,
      volume: null,
      timestamp: null,
      updatedAt: new Date().toISOString(),
      marketStatus: null,
    };

    const quote = normalizeCryptoProviderQuote({ target, plan, raw, fx });

    expect(quote.crypto.conversionApplied).toBe(false);
    expect(quote.crypto.conversionPath).toBeNull();
    expect(quote.crypto.pairPrice).toBe(95_000);
    expect(quote.currentPrice).toBe(95_000);
    expect(pairPriceToEurPerUnit(95_000, "EUR", fx)).toBe(95_000);
  });

  it("applies USD/EUR FX once for USD crypto fallback pairs (no double conversion)", () => {
    const directPlan = resolveCryptoQuoteFetchPlan("ETH", "EUR")!;
    const fallbackPlan = resolveCryptoQuoteFallbackPlan(directPlan)!;
    expect(fallbackPlan.providerSymbol).toBe("ETH-USD.CC");
    expect(fallbackPlan.conversionPath).toBe("USD/EUR");

    const target: ResolvedPriceTarget = {
      symbol: "ETH",
      providerSymbol: "ETH-EUR.CC",
      isin: null,
      name: "Ethereum",
      currency: null,
      assetType: "crypto",
      cryptoPlan: directPlan,
    };
    const raw: ProviderRawQuote = {
      providerSymbol: "ETH-USD.CC",
      wireCurrency: "USD",
      originalCurrency: "USD",
      originalPrice: 2_000,
      previousCloseOriginal: null,
      changeOriginal: null,
      changePercentOriginal: -0.5,
      open: null,
      high: null,
      low: null,
      volume: null,
      timestamp: null,
      updatedAt: new Date().toISOString(),
      marketStatus: null,
    };

    const quote = normalizeCryptoProviderQuote({
      target,
      plan: fallbackPlan,
      raw,
      fx,
    });

    const expectedEur = 2_000 * 0.92;
    expect(quote.crypto.pairPrice).toBeCloseTo(expectedEur, 6);
    expect(quote.currentPrice).toBeCloseTo(expectedEur, 6);
    // Portfolio EUR step must be identity after pair is already EUR — not USD*rate again.
    expect(pairPriceToEurPerUnit(quote.crypto.pairPrice!, "EUR", fx)).toBeCloseTo(
      expectedEur,
      6,
    );
    expect(quote.currentPrice).not.toBeCloseTo(2_000 * 0.92 * 0.92, 2);
    expect(quote.crypto.conversionPath).toBe("USD/EUR");
  });

  it("never routes crypto .CC symbols through equity exchange fallback semantics", () => {
    const { targets } = resolveQuotePriceTargets([
      {
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        pairCurrency: "EUR",
        providerSymbol: "BTC-EUR.CC",
        exchange: "AS",
        quoteCurrency: null,
      },
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.assetType).toBe("crypto");
    expect(targets[0]?.providerSymbol).toBe("BTC-EUR.CC");
    expect(targets[0]?.cryptoPlan?.quoteCurrency).toBe("EUR");
    // Equity listing currency must stay null on crypto targets.
    expect(targets[0]?.currency).toBeNull();
  });
});
