import { beforeEach, describe, expect, it } from "vitest";

import {
  applyCachedPrices,
  applyPricesToHoldings,
  buildPriceLookup,
  describeQuoteSelectionForHolding,
  findQuoteForHolding,
  invalidateConflictingPriceCacheEntries,
  isQuoteCompatibleWithHolding,
  loadUserPortfolioHoldings,
  purgeIncorrectPriceCacheEntries,
  quoteLookupKeys,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { getHoldingMarketValue } from "@/lib/client/holdingValuation";
import { buildHoldingValuation } from "@/lib/client/holdingValuation";
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

const STRC_ISIN = "NL0015001K93";
const STRC_WRONG_GENERIC_PRICE = 17.949111;
const STRC_CORRECT_PRICE = 16.04;
const STRC_QUANTITY = 450;

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

  it("rejects provider-less ISIN cache rows for verified listings", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      isin: STRC_ISIN,
      quantity: STRC_QUANTITY,
    });

    expect(
      isQuoteCompatibleWithHolding(strcHolding, {
        symbol: "STRC",
        isin: STRC_ISIN,
        priceEur: STRC_WRONG_GENERIC_PRICE,
      }),
    ).toBe(false);

    const lookup = buildPriceLookup([
      {
        symbol: "STRC",
        isin: STRC_ISIN,
        priceEur: STRC_WRONG_GENERIC_PRICE,
      },
    ]);

    expect(describeQuoteSelectionForHolding(strcHolding, lookup)).toEqual({
      cacheKey: null,
      quote: null,
    });
  });

  it("documents the STRC cross-listing regression: ISIN generic row must not win", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      isin: STRC_ISIN,
      quantity: STRC_QUANTITY,
      exchange: "AS",
      currentPrice: 0,
    });

    const lookup = buildPriceLookup([
      {
        symbol: "STRC",
        isin: STRC_ISIN,
        priceEur: STRC_WRONG_GENERIC_PRICE,
        updatedAt: "2026-07-24T09:00:00.000Z",
      },
      {
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        priceEur: STRC_CORRECT_PRICE,
        updatedAt: "2026-07-24T08:00:00.000Z",
      },
    ]);

    const selection = describeQuoteSelectionForHolding(strcHolding, lookup);

    expect(selection.cacheKey).toBe("STRC.AS");
    expect(selection.quote?.priceEur).toBe(STRC_CORRECT_PRICE);

    const [updated] = applyPricesToHoldings([strcHolding], [
      {
        symbol: "STRC",
        isin: STRC_ISIN,
        priceEur: STRC_WRONG_GENERIC_PRICE,
      },
      {
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        priceEur: STRC_CORRECT_PRICE,
      },
    ]);

    expect(updated?.currentPrice).toBe(STRC_CORRECT_PRICE);
    expect(getHoldingMarketValue(updated!)).toBeCloseTo(STRC_CORRECT_PRICE * STRC_QUANTITY, 2);
  });

  it("purges generic and wrong-listing cache rows for already-verified holdings", () => {
    writePortfolioToStorage(USER, [
      holding({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        exchange: "AS",
        quantity: STRC_QUANTITY,
        currentPrice: STRC_WRONG_GENERIC_PRICE,
        priceDataStatus: "live",
      }),
    ]);

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({
          symbol: "STRC",
          isin: STRC_ISIN,
          price: STRC_WRONG_GENERIC_PRICE,
        }),
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.PA",
          isin: STRC_ISIN,
          price: 32.5,
        }),
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          isin: STRC_ISIN,
          price: STRC_CORRECT_PRICE,
        }),
      ]),
    );

    const loaded = loadUserPortfolioHoldings(USER);
    const cache = JSON.parse(
      localStorage.getItem(priceCacheKey(USER)) ?? "[]",
    ) as CachedPortfolioPrice[];

    expect(cache.some((entry) => !entry.providerSymbol && entry.symbol === "STRC")).toBe(false);
    expect(cache.some((entry) => entry.providerSymbol === "STRC.PA")).toBe(false);
    expect(loaded[0]?.currentPrice).toBe(STRC_CORRECT_PRICE);
    expect(getHoldingMarketValue(loaded[0]!)).toBeCloseTo(7218, 0);
  });

  it("keeps stale verified-listing prices when only wrong-listing quotes are fresh", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      isin: STRC_ISIN,
      quantity: STRC_QUANTITY,
      currentPrice: STRC_CORRECT_PRICE,
      priceDataStatus: "stale",
    });

    const [updated] = applyPricesToHoldings([strcHolding], [
      {
        symbol: "STRC",
        providerSymbol: "STRC.PA",
        isin: STRC_ISIN,
        priceEur: 32.5,
        updatedAt: "2026-07-24T09:00:00.000Z",
      },
    ]);

    expect(updated?.currentPrice).toBe(STRC_CORRECT_PRICE);
    expect(updated?.priceDataStatus).toBe("stale");
    expect(getHoldingMarketValue(updated!)).toBeCloseTo(7218, 0);
  });


  it("keeps overview and detail valuations consistent after reload", () => {
    writePortfolioToStorage(USER, [
      holding({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        exchange: "AS",
        quantity: STRC_QUANTITY,
        currentPrice: STRC_WRONG_GENERIC_PRICE,
        priceDataStatus: "live",
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
        quantity: 5,
        currentPrice: 0,
      }),
    ]);

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({
          symbol: "STRC",
          isin: STRC_ISIN,
          price: STRC_WRONG_GENERIC_PRICE,
        }),
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          isin: STRC_ISIN,
          price: STRC_CORRECT_PRICE,
        }),
        cacheEntry({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 112.5,
        }),
      ]),
    );

    const loaded = loadUserPortfolioHoldings(USER);
    const strc = loaded.find((item) => item.symbol === "STRC");
    const overviewValue = getHoldingMarketValue(strc!);
    const detailValue = buildHoldingValuation(strc!, loaded).marketValue;

    expect(overviewValue).toBeCloseTo(7218, 0);
    expect(detailValue).toBe(overviewValue);
  });

  it("purges incorrect cache rows via purgeIncorrectPriceCacheEntries", () => {
    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({ symbol: "STRC", price: STRC_WRONG_GENERIC_PRICE }),
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          price: STRC_CORRECT_PRICE,
        }),
      ]),
    );

    const remaining = purgeIncorrectPriceCacheEntries(USER, [
      holding({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
      }),
    ]);

    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.providerSymbol).toBe("STRC.AS");
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
