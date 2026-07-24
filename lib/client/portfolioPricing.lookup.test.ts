import { beforeEach, describe, expect, it } from "vitest";

import {
  applyCachedPrices,
  applyPricesToHoldings,
  buildPriceLookup,
  findQuoteForHolding,
  invalidateConflictingPriceCacheEntries,
  isQuoteCompatibleWithHolding,
  loadUserPortfolioHoldings,
  quoteLookupKeys,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { priceCacheKey } from "@/lib/client/portfolioStorageKeys";
import type { CachedPortfolioPrice, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "auth-sub-lookup-tests";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 0,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    isin: overrides.isin ?? null,
    exchange: overrides.exchange ?? null,
    priceDataStatus: overrides.priceDataStatus,
    ...overrides,
    symbol: overrides.symbol,
  };
}

function cacheEntry(
  overrides: Partial<CachedPortfolioPrice> & Pick<CachedPortfolioPrice, "symbol" | "price">,
): CachedPortfolioPrice {
  return {
    providerSymbol: overrides.providerSymbol,
    isin: overrides.isin ?? null,
    updatedAt: overrides.updatedAt ?? "2026-07-24T08:00:00.000Z",
    ...overrides,
    symbol: overrides.symbol,
    price: overrides.price,
  };
}

describe("portfolio price lookup", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("prefers STRC.AS over generic STRC and STRC.PA cache entries", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      isin: "NL0015001K93",
      currentPrice: 0,
    });

    const quotes = [
      {
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        priceEur: 32.5,
        updatedAt: "2026-07-24T08:00:00.000Z",
      },
      {
        symbol: "STRC",
        priceEur: 30,
        updatedAt: "2026-07-24T08:00:00.000Z",
      },
      {
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        priceEur: 16.04,
        updatedAt: "2026-07-24T08:00:00.000Z",
      },
    ];

    const lookup = buildPriceLookup(quotes);
    const matched = findQuoteForHolding(strcHolding, lookup);

    expect(matched?.providerSymbol).toBe("STRC.AS");
    expect(matched?.priceEur).toBe(16.04);

    const [updated] = applyPricesToHoldings([strcHolding], quotes);
    expect(updated?.currentPrice).toBe(16.04);
    expect(updated?.providerSymbol).toBe("STRC.AS");
  });

  it("rejects a verified holding quote from another exchange listing", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
    });

    expect(
      isQuoteCompatibleWithHolding(strcHolding, {
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        priceEur: 32.5,
      }),
    ).toBe(false);

    const lookup = buildPriceLookup([
      {
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        priceEur: 32.5,
      },
    ]);

    expect(findQuoteForHolding(strcHolding, lookup)).toBeUndefined();
  });

  it("falls back to generic ticker when no providerSymbol is saved", () => {
    const unverified = holding({
      symbol: "ABC",
      providerSymbol: null,
      currentPrice: 0,
    });

    const lookup = buildPriceLookup([
      {
        symbol: "ABC",
        priceEur: 12.5,
      },
    ]);

    expect(findQuoteForHolding(unverified, lookup)?.priceEur).toBe(12.5);
    expect(quoteLookupKeys({ symbol: "ABC", priceEur: 12.5 })).toEqual(["ABC"]);
  });

  it("keeps provider-specific matching for verified listings", () => {
    const vwce = holding({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      isin: "IE00BK5BQT80",
    });

    const lookup = buildPriceLookup([
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 112.5,
      },
    ]);

    expect(findQuoteForHolding(vwce, lookup)?.priceEur).toBe(112.5);
  });

  it("does not index listing-specific quotes under bare tickers", () => {
    expect(
      quoteLookupKeys({
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        priceEur: 32.5,
      }),
    ).toEqual(["STRC.PA"]);
  });

  it("invalidates conflicting cache entries when providerSymbol changes", () => {
    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({ symbol: "STRC", providerSymbol: "STRC.PA", price: 32.5 }),
        cacheEntry({ symbol: "STRC", providerSymbol: "STRC.AS", price: 16.04 }),
        cacheEntry({ symbol: "VWCE", providerSymbol: "VWCE.XETRA", price: 112.5 }),
      ]),
    );

    const remaining = invalidateConflictingPriceCacheEntries(USER, [
      {
        before: {
          symbol: "STRC",
          isin: "NL0015001K93",
          providerSymbol: "STRC.PA",
        },
        after: {
          symbol: "STRC",
          isin: "NL0015001K93",
          providerSymbol: "STRC.AS",
        },
      },
    ]);

    expect(remaining).toHaveLength(2);
    expect(remaining.some((entry) => entry.providerSymbol === "STRC.PA")).toBe(false);
    expect(remaining.some((entry) => entry.providerSymbol === "STRC.AS")).toBe(true);
    expect(remaining.some((entry) => entry.symbol === "VWCE")).toBe(true);
  });

  it("clears wrong-listing cache on load when verified enrichment corrects providerSymbol", () => {
    writePortfolioToStorage(USER, [
      holding({
        symbol: "STRC",
        exchange: "Amsterdam",
        providerSymbol: "STRC.PA",
        currentPrice: 32.5,
        priceDataStatus: "live",
      }),
    ]);

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({ symbol: "STRC", providerSymbol: "STRC.PA", price: 32.5 }),
        cacheEntry({ symbol: "STRC", providerSymbol: "STRC.AS", price: 16.04 }),
      ]),
    );

    const loaded = loadUserPortfolioHoldings(USER);

    expect(loaded[0]?.providerSymbol).toBe("STRC.AS");
    expect(loaded[0]?.currentPrice).toBe(16.04);

    const cache = JSON.parse(
      localStorage.getItem(priceCacheKey(USER)) ?? "[]",
    ) as CachedPortfolioPrice[];
    expect(cache.some((entry) => entry.providerSymbol === "STRC.PA")).toBe(false);
  });

  it("applies verified cache through applyCachedPrices after invalidation", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      currentPrice: 0,
    });

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({ symbol: "STRC", providerSymbol: "STRC.AS", price: 16.04 }),
      ]),
    );

    const [updated] = applyCachedPrices(USER, [strcHolding]);
    expect(updated?.currentPrice).toBe(16.04);
  });
});
