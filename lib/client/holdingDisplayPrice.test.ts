import { afterEach, describe, expect, it, vi } from "vitest";

import { prepareCryptoHoldingForSave } from "@/lib/services/portfolio/cryptoHolding";
import {
  getHoldingMarketValue,
  buildPortfolioAnalysis,
} from "@/lib/client/portfolioAnalysis";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { summarizeAuthenticatedHomePortfolio } from "@/lib/client/authenticatedHomePortfolio";
import {
  holdingPricePeriodCaption,
  holdingPriceStatusUserLabel,
  holdingPriceTrustBadgeLabel,
  holdingValueUnavailableLabel,
  isEstimatedHoldingPrice,
  resolveHoldingDisplayPrice,
  resolveHoldingPriceTrustStatus,
  resolveListedVenueExchange,
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

  it("does not label delayed or last-session equity prices as estimated", () => {
    const europeOpen = new Date("2026-08-19T10:00:00.000Z");
    expect(
      resolveHoldingDisplayPrice(
        equity({ priceDataStatus: "delayed", currentPrice: 100 }),
        { now: europeOpen },
      ).source,
    ).toBe("delayed");
    expect(
      resolveHoldingDisplayPrice(
        equity({ priceDataStatus: "stale", currentPrice: 100 }),
      ).source,
    ).toBe("last_session");
    expect(
      resolveHoldingDisplayPrice(
        equity({ priceDataStatus: "live", currentPrice: 100 }),
      ).source,
    ).toBe("live");
    const missingStatus = {
      ...equity({ currentPrice: 100 }),
      priceDataStatus: undefined,
    };
    expect(resolveHoldingDisplayPrice(missingStatus).source).toBe("last_session");
    expect(isEstimatedHoldingPrice(missingStatus)).toBe(false);
    expect(isEstimatedHoldingPrice(equity({ priceDataStatus: "stale" }))).toBe(
      false,
    );
  });

  it("treats cash as book value, not an estimated market quote", () => {
    expect(
      resolveHoldingDisplayPrice({
        ...equity({ assetType: "cash", currentPrice: 1, symbol: "EUR" }),
        assetType: "cash",
      }).source,
    ).toBe("live");
    expect(
      isEstimatedHoldingPrice({
        ...equity({ assetType: "cash", currentPrice: 1, symbol: "EUR" }),
        assetType: "cash",
      }),
    ).toBe(false);
  });

  it("uses crypto-specific unavailable copy", () => {
    expect(holdingValueUnavailableLabel(unpricedCrypto())).toBe("Value unavailable");
    expect(holdingValueUnavailableLabel(equity())).toBe("Price unavailable");
  });

  it("keeps Estimated only for genuine fallbacks and Delayed never Live", () => {
    expect(holdingPriceTrustBadgeLabel("last_session")).toBeNull();
    expect(holdingPriceTrustBadgeLabel("live")).toBeNull();
    expect(holdingPriceTrustBadgeLabel("delayed")).toBe("Delayed");
    expect(holdingPriceTrustBadgeLabel("estimated")).toBe("Estimated");
    expect(holdingPriceStatusUserLabel("last_session")).toBe("Last session");
    expect(holdingPriceStatusUserLabel("delayed")).toBe("Delayed");
    expect(holdingPriceStatusUserLabel("live")).toBe("Current");
    expect(holdingPriceStatusUserLabel("live")).not.toBe("Live");
    expect(
      resolveHoldingPriceTrustStatus(
        equity({ currentPrice: 0, purchasePrice: 90 }),
      ),
    ).toBe("estimated");
  });

  it("preserves a current crypto 24h pair price as live, not estimated", () => {
    const crypto: StoredPortfolioHolding = {
      ...unpricedCrypto(),
      pricingStatus: "live",
      currentPairPrice: 60_000,
      currentPrice: 60_000,
      priceDataStatus: "live",
    };

    expect(resolveHoldingDisplayPrice(crypto).source).toBe("live");
    expect(isEstimatedHoldingPrice(crypto)).toBe(false);
  });
});

const EUROPE_OPEN = new Date("2026-08-19T10:00:00.000Z");
const EUROPE_CLOSED_US_OPEN = new Date("2026-08-19T16:00:00.000Z");
const US_OPEN = new Date("2026-08-19T15:00:00.000Z");

describe("Phase 19.7 listed price-status semantics", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function listed(
    symbol: string,
    providerSymbol: string,
    status: StoredPortfolioHolding["priceDataStatus"],
  ): StoredPortfolioHolding {
    return {
      ...equity({
        id: symbol.toLowerCase(),
        symbol,
        name: symbol,
        providerSymbol,
        priceDataStatus: status,
        currentPrice: 100,
      }),
      marketPriceUpdatedAt: "2026-08-19T15:35:00.000Z",
    };
  }

  it("F/G. valid previous-session exchange close is Last session, never Delayed", () => {
    for (const row of [
      listed("IB1T", "IB1T.XETRA", "delayed"),
      listed("NUKL", "NUKL.XETRA", "delayed"),
      listed("VWCE", "VWCE.XETRA", "delayed"),
      listed("EUNA", "EUNA.XETRA", "delayed"),
      listed("STRC", "STRC.AS", "delayed"),
      listed("AIFS", "AIFS.XETRA", "delayed"),
    ]) {
      const source = resolveHoldingDisplayPrice(row, {
        now: EUROPE_CLOSED_US_OPEN,
      }).source;
      expect(source).toBe("last_session");
      expect(holdingPriceTrustBadgeLabel(source)).toBeNull();
      expect(holdingPriceStatusUserLabel(source)).toBe("Last session");
      expect(
        holdingPricePeriodCaption(source, "Last session · 20 Aug"),
      ).toBe("Last session · 20 Aug");
    }
  });

  it("H/I. a delayed intraday quote stays Delayed and is not Live", () => {
    const aapl = equity({
      symbol: "AAPL",
      name: "Apple",
      providerSymbol: "AAPL.US",
      priceDataStatus: "delayed",
      currentPrice: 185,
    });
    const source = resolveHoldingDisplayPrice(aapl, { now: US_OPEN }).source;
    expect(source).toBe("delayed");
    expect(holdingPriceTrustBadgeLabel(source)).toBe("Delayed");
    expect(holdingPriceStatusUserLabel(source)).toBe("Delayed");
    expect(holdingPriceStatusUserLabel(source)).not.toMatch(/live/i);
    expect(holdingPricePeriodCaption(source, "Last session · 20 Aug")).toBeNull();
  });

  it("J. genuine purchase-price fallback remains Estimated", () => {
    expect(
      resolveHoldingDisplayPrice(
        equity({ currentPrice: 0, purchasePrice: 16, quantity: 20 }),
      ).source,
    ).toBe("estimated");
  });

  it("K. unavailable stays Price unavailable, never a zero price", () => {
    const missing = equity({
      currentPrice: 0,
      purchasePrice: 0,
      priceDataStatus: "unavailable",
    });
    expect(resolveHoldingDisplayPrice(missing).source).toBe("unavailable");
    expect(holdingPriceStatusUserLabel("unavailable")).toBe("Price unavailable");
    expect(getHoldingMarketValue(missing)).toBeNull();
  });

  it("L. a current crypto pair stays Current and is not forced into Last session", () => {
    const crypto: StoredPortfolioHolding = {
      ...unpricedCrypto(),
      pricingStatus: "live",
      currentPairPrice: 60_000,
      currentPrice: 60_000,
      priceDataStatus: "live",
    };
    expect(
      resolveHoldingDisplayPrice(crypto, { now: EUROPE_CLOSED_US_OPEN }).source,
    ).toBe("live");
    expect(holdingPriceStatusUserLabel("live")).toBe("Current");
  });

  it("M. a listed ETF close does not become Estimated because the market is closed", () => {
    const vwce = listed("VWCE", "VWCE.XETRA", "delayed");
    expect(
      resolveHoldingDisplayPrice(vwce, { now: EUROPE_CLOSED_US_OPEN }).source,
    ).toBe("last_session");
    expect(isEstimatedHoldingPrice(vwce)).toBe(false);
    expect(
      resolveHoldingDisplayPrice(vwce, { now: EUROPE_OPEN }).source,
    ).toBe("delayed");
  });

  it("N. Dashboard snapshot quality matches the canonical helper", () => {
    vi.useFakeTimers();
    vi.setSystemTime(EUROPE_CLOSED_US_OPEN);
    const rows = [
      listed("VWCE", "VWCE.XETRA", "delayed"),
      {
        ...equity({
          symbol: "AAPL",
          providerSymbol: "AAPL.US",
          priceDataStatus: "delayed",
          currentPrice: 185,
        }),
        marketPriceUpdatedAt: "2026-08-19T15:35:00.000Z",
      },
      listed("SPY", "SPY.US", "live"),
    ];
    const snapshot = buildDashboardPortfolioSnapshot(rows, null, false);
    for (const row of snapshot.marketHoldings) {
      const source = rows.find((item) => item.symbol === row.symbol)!;
      expect(row.priceQuality).toBe(resolveHoldingPriceTrustStatus(source));
    }
    const vwce = snapshot.marketHoldings.find((row) => row.symbol === "VWCE")!;
    expect(vwce.priceQuality).toBe("last_session");
    expect(holdingPriceTrustBadgeLabel(vwce.priceQuality)).toBeNull();
    expect(vwce.changePeriodLabel).toMatch(/Last session/);
    const aapl = snapshot.marketHoldings.find((row) => row.symbol === "AAPL")!;
    expect(aapl.priceQuality).toBe("delayed");
    expect(holdingPriceTrustBadgeLabel(aapl.priceQuality)).toBe("Delayed");
    expect(aapl.changePeriodLabel).not.toMatch(/Last session/);
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

describe("holdingDisplayPrice confirmed listing venue", () => {
  it("keeps a confirmed VUSA.LSE listing on LSE instead of the unique VUSA.AS registry venue", () => {
    expect(
      resolveListedVenueExchange({
        symbol: "VUSA",
        providerSymbol: "VUSA.LSE",
        exchange: "LSE",
        pricingExchange: "LSE",
        isin: "IE00B3XXRP09",
      }),
    ).toBe("LSE");
  });

  it("does not rewrite confirmed STRC.PA to the unique STRC.AS registry venue", () => {
    expect(
      resolveListedVenueExchange({
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        exchange: "PA",
        pricingExchange: "PA",
      }),
    ).toBe("PA");
  });

  it("keeps the VUSA.AS kids listing on Amsterdam", () => {
    expect(
      resolveListedVenueExchange({
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        pricingExchange: "AS",
        isin: "IE00B3XXRP09",
      }),
    ).toBe("AS");
  });
});
