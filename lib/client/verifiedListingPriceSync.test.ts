import { beforeEach, describe, expect, it } from "vitest";

import {
  applyCachedPrices,
  loadUserPortfolioHoldings,
} from "@/lib/client/portfolioPricing";
import { applyRemoteSnapshotToLocalCache } from "@/lib/client/portfolioSyncState";
import {
  portfolioStorageKey,
  priceCacheKey,
} from "@/lib/client/portfolioStorageKeys";
import { writePortfolioToStorage } from "@/lib/client/userPortfolioStorage";
import type {
  CachedPortfolioPrice,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

const USER = "verified-listing-price-sync-user";

const STRC_ISIN = "NL0015001K93";
const STRC_WRONG_GENERIC_PRICE = 17.949111;
const STRC_CORRECT_PRICE = 16.04;

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 450,
    purchasePrice: overrides.purchasePrice ?? 15,
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

function snapshotWith(
  holdings: StoredPortfolioHolding[],
): RemotePortfolioSnapshot {
  return {
    holdings,
    holdingCount: holdings.length,
    goal: null,
    importMappings: [],
    remoteUpdatedAt: "2026-07-22T10:00:00.000Z",
    migrationCompletedAt: null,
    portfolioId: "portfolio-test",
  };
}

describe("verified listing price sync", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("replaces wrong stored price with compatible cache quote and persists locally", () => {
    writePortfolioToStorage(USER, [
      holding({
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        exchange: "AS",
        currentPrice: STRC_WRONG_GENERIC_PRICE,
        priceDataStatus: "live",
      }),
    ]);

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          isin: STRC_ISIN,
          price: STRC_CORRECT_PRICE,
        }),
      ]),
    );

    const loaded = loadUserPortfolioHoldings(USER);

    expect(loaded[0]?.currentPrice).toBe(STRC_CORRECT_PRICE);

    const stored = JSON.parse(
      localStorage.getItem(portfolioStorageKey(USER)) ?? "[]",
    ) as StoredPortfolioHolding[];
    expect(stored[0]?.currentPrice).toBe(STRC_CORRECT_PRICE);
  });

  it("preserves stored currentPrice as stale when no compatible quote exists", () => {
    const strcHolding = holding({
      symbol: "STRC",
      providerSymbol: "STRC.AS",
      isin: STRC_ISIN,
      exchange: "AS",
      currentPrice: STRC_WRONG_GENERIC_PRICE,
      priceDataStatus: "live",
    });

    const [updated] = applyCachedPrices(USER, [strcHolding]);

    expect(updated?.currentPrice).toBe(STRC_WRONG_GENERIC_PRICE);
    expect(updated?.priceDataStatus).toBe("stale");
  });

  it("replaces remote stale verified listing prices on hydrate and persists locally", () => {
    const strcId = "strc-holding";
    const local = [
      holding({
        id: strcId,
        symbol: "STRC",
        providerSymbol: "STRC.AS",
        isin: STRC_ISIN,
        exchange: "AS",
        currentPrice: STRC_WRONG_GENERIC_PRICE,
        priceDataStatus: "live",
      }),
    ];

    writePortfolioToStorage(USER, local);

    localStorage.setItem(
      priceCacheKey(USER),
      JSON.stringify([
        cacheEntry({
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          isin: STRC_ISIN,
          price: STRC_CORRECT_PRICE,
        }),
      ]),
    );

    const merged = applyRemoteSnapshotToLocalCache(
      USER,
      snapshotWith([
        holding({
          id: strcId,
          symbol: "STRC",
          providerSymbol: "STRC.AS",
          isin: STRC_ISIN,
          exchange: "AS",
          currentPrice: STRC_WRONG_GENERIC_PRICE,
          priceDataStatus: "live",
        }),
      ]),
      {
        preserveLocalPrices: local,
        context: "hydrate",
      },
    );

    expect(merged[0]?.currentPrice).toBe(STRC_CORRECT_PRICE);

    const stored = JSON.parse(
      localStorage.getItem(portfolioStorageKey(USER)) ?? "[]",
    ) as StoredPortfolioHolding[];
    expect(stored[0]?.currentPrice).toBe(STRC_CORRECT_PRICE);
  });
});
