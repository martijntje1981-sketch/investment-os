import { describe, expect, it } from "vitest";

import { prepareCryptoHoldingForSave } from "@/lib/services/portfolio/cryptoHolding";
import {
  getHoldingMarketValue,
  buildPortfolioAnalysis,
} from "@/lib/client/portfolioAnalysis";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import {
  holdingValueUnavailableLabel,
  isEstimatedHoldingPrice,
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingDisplayPrice";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function equity(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "equity-1",
    symbol: overrides.symbol ?? "VWCE",
    name: overrides.name ?? "VWCE",
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: "investment",
    priceDataStatus: overrides.priceDataStatus ?? "live",
    providerSymbol: overrides.providerSymbol ?? "VWCE.AS",
  };
}

function unpricedCrypto(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return prepareCryptoHoldingForSave({
    id: overrides.id ?? "crypto-1",
    assetType: "crypto",
    symbol: overrides.symbol ?? "BTC",
    name: overrides.name ?? "Bitcoin",
    quantity: overrides.quantity ?? 0.5,
    purchasePrice: overrides.purchasePrice ?? 50_000,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    pairCurrency: overrides.pairCurrency ?? "EUR",
    portfolioCurrency: "EUR",
    pricingStatus: overrides.pricingStatus ?? "price_unavailable",
    tradingPair: overrides.tradingPair ?? "BTC/EUR",
    priceDataStatus: "unavailable",
    platform: overrides.platform ?? null,
    createdAt: "2026-07-18T08:00:00.000Z",
    updatedAt: "2026-07-18T08:00:00.000Z",
  });
}

describe("holdingDisplayPrice crypto safety", () => {
  it("does not treat unavailable crypto as a zero market price", () => {
    const crypto = unpricedCrypto();

    expect(resolveHoldingDisplayPrice(crypto)).toEqual({
      price: null,
      source: "unavailable",
      quoteCurrency: "EUR",
    });
    expect(getHoldingMarketValue(crypto)).toBeNull();
    expect(isEstimatedHoldingPrice(crypto)).toBe(false);
  });

  it("does not use average purchase price as a fabricated crypto market value", () => {
    const crypto = unpricedCrypto({ purchasePrice: 50_000, quantity: 0.5 });

    expect(getHoldingMarketValue(crypto)).toBeNull();
  });

  it("values crypto only when a manual valuation exists", () => {
    const manualPrice: StoredPortfolioHolding = {
      ...unpricedCrypto(),
      pricingStatus: "manual",
      currentManualPrice: 42_000,
    };
    const manualTotal: StoredPortfolioHolding = {
      ...unpricedCrypto(),
      pricingStatus: "manual",
      manualCurrentValue: 21_000,
    };

    expect(getHoldingMarketValue(manualPrice)).toBe(21_000);
    expect(getHoldingMarketValue(manualTotal)).toBe(21_000);
  });

  it("still allows purchase-price fallback for non-crypto investments", () => {
    const investment = equity({ currentPrice: 0, purchasePrice: 16, quantity: 20 });

    expect(resolveHoldingDisplayPrice(investment).source).toBe("estimated");
    expect(getHoldingMarketValue(investment)).toBe(320);
  });

  it("uses crypto-specific unavailable copy", () => {
    expect(holdingValueUnavailableLabel(unpricedCrypto())).toBe("Value unavailable");
    expect(holdingValueUnavailableLabel(equity())).toBe("Price unavailable");
  });
});

describe("portfolio totals with unpriced crypto", () => {
  const valuedOnly = [equity({ quantity: 10, currentPrice: 100 })];
  const valuedTotal = 1000;

  it("keeps portfolio value unchanged when unpriced crypto is added", () => {
    const before = buildPortfolioAnalysis(valuedOnly);
    const after = buildPortfolioAnalysis([
      ...valuedOnly,
      unpricedCrypto({ purchasePrice: 50_000, quantity: 2 }),
    ]);

    expect(before.totalValue).toBe(valuedTotal);
    expect(after.totalValue).toBe(valuedTotal);
    expect(after.unvaluedHoldings).toHaveLength(1);
    expect(after.unvaluedHoldings[0]?.assetType).toBe("crypto");
  });

  it("excludes unpriced crypto from performance until manually valued", () => {
    const performance = buildPortfolioPerformance([
      ...valuedOnly,
      unpricedCrypto(),
    ]);

    expect(performance.totalValue).toBe(valuedTotal);
    expect(performance.hasUnvaluedInvestments).toBe(true);
    expect(performance.canShowPerformance).toBe(false);
  });

  it("keeps allocation weights based only on valued holdings", () => {
    const analysis = buildPortfolioAnalysis([
      ...valuedOnly,
      unpricedCrypto(),
    ]);

    expect(analysis.valuedPositions).toHaveLength(1);
    expect(analysis.valuedPositions[0]?.weightPercent).toBeCloseTo(100, 5);
    expect(analysis.largestPosition?.holding.symbol).toBe("VWCE");
  });

  it("surfaces unavailable crypto on dashboard and home without zero-value totals", () => {
    const holdings = [...valuedOnly, unpricedCrypto()];
    const dashboard = buildDashboardPortfolioSnapshot(holdings, null, false);
    const home = summarizeAuthenticatedHomePortfolio(holdings);
    const cryptoRow = dashboard.marketHoldings.find((row) => row.symbol === "BTC");

    expect(dashboard.portfolioValue).toBe(valuedTotal);
    expect(home.totalValue).toBe(valuedTotal);
    expect(cryptoRow?.currentValue).toBeNull();
    expect(cryptoRow?.priceStatus).toBe("unavailable");
    expect(cryptoRow?.portfolioWeightPercent).toBeNull();
  });
});
