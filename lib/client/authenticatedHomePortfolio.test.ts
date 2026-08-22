import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  readAuthenticatedHomePortfolio,
  summarizeAuthenticatedHomePortfolio,
} from "@/lib/client/authenticatedHomePortfolio";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import {
  LEGACY_PORTFOLIO_STORAGE_KEY,
  LEGACY_PRICE_CACHE_KEY,
  PORTFOLIO_HOLDINGS_UPDATED_EVENT,
  portfolioStorageKey,
  priceCacheKey,
} from "@/lib/client/portfolioStorageKeys";
import {
  mergeLegacyPriceCacheIntoScoped,
  recoverLegacyPortfolioToUser,
} from "@/lib/client/portfolioRecovery";
import { dispatchPortfolioUpdated } from "@/lib/client/userPortfolioStorage";
import {
  createPortfolioUpdatedHandler,
  shouldHandlePortfolioUpdatedEvent,
} from "@/lib/client/portfolioUpdatedEvents";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER_A = "auth-sub-home-a";
const USER_B = "auth-sub-home-b";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? `${overrides.symbol} Fund`,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    isin: overrides.isin ?? null,
  };
}

describe("authenticated Home portfolio source", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("receives the recovered portfolio through the central read path", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([
        holding({ symbol: "VWCE", currentPrice: 0, providerSymbol: "VWCE.XETRA" }),
      ]),
    );
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);

    const homeHoldings = readAuthenticatedHomePortfolio(USER_A);
    const summary = summarizeAuthenticatedHomePortfolio(homeHoldings);

    expect(homeHoldings).toHaveLength(1);
    expect(homeHoldings[0]?.currentPrice).toBe(112.5);
    expect(summary.totalValue).toBe(1125);
  });

  it("refreshes Home data when the holdings-updated event fires", () => {
    let reloadCount = 0;
    const reload = () => {
      reloadCount += 1;
    };

    const handler = createPortfolioUpdatedHandler(USER_A, reload);

    handler(
      new CustomEvent(PORTFOLIO_HOLDINGS_UPDATED_EVENT, {
        detail: { userSub: USER_B },
      }),
    );
    expect(reloadCount).toBe(0);
    expect(
      shouldHandlePortfolioUpdatedEvent(USER_B, USER_A),
    ).toBe(false);

    handler(
      new CustomEvent(PORTFOLIO_HOLDINGS_UPDATED_EVENT, {
        detail: { userSub: USER_A },
      }),
    );
    expect(reloadCount).toBe(1);

    dispatchPortfolioUpdated(USER_A);
    handler(
      new CustomEvent(PORTFOLIO_HOLDINGS_UPDATED_EVENT, {
        detail: { userSub: USER_A },
      }),
    );
    expect(reloadCount).toBe(2);
  });
});

describe("legacy price cache recovery", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("copies compatible legacy cached prices into the scoped cache", () => {
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    expect(mergeLegacyPriceCacheIntoScoped(USER_A)).toBe(true);
    expect(JSON.parse(localStorage.getItem(priceCacheKey(USER_A))!)).toEqual([
      expect.objectContaining({ symbol: "VWCE", price: 112.5 }),
    ]);
    expect(localStorage.getItem(LEGACY_PRICE_CACHE_KEY)).not.toBeNull();
  });

  it("preserves newer scoped cache values over older legacy entries", () => {
    localStorage.setItem(
      priceCacheKey(USER_A),
      JSON.stringify([
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 120,
          updatedAt: "2026-07-19T08:00:00.000Z",
        },
      ]),
    );
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 100,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    expect(mergeLegacyPriceCacheIntoScoped(USER_A)).toBe(false);
    expect(JSON.parse(localStorage.getItem(priceCacheKey(USER_A))!)).toEqual([
      expect.objectContaining({ price: 120 }),
    ]);
  });

  it("never reads another user's scoped cache", () => {
    localStorage.setItem(
      priceCacheKey(USER_B),
      JSON.stringify([
        {
          symbol: "BBB",
          price: 200,
          updatedAt: "2026-07-19T08:00:00.000Z",
        },
      ]),
    );
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    mergeLegacyPriceCacheIntoScoped(USER_A);

    expect(localStorage.getItem(priceCacheKey(USER_B))).toContain("BBB");
    expect(JSON.parse(localStorage.getItem(priceCacheKey(USER_A))!)).toEqual([
      expect.objectContaining({ symbol: "VWCE" }),
    ]);
  });

  it("is idempotent when run repeatedly", () => {
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    expect(mergeLegacyPriceCacheIntoScoped(USER_A)).toBe(true);
    expect(mergeLegacyPriceCacheIntoScoped(USER_A)).toBe(false);
  });

  it("performs no external API request during portfolio recovery", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([holding({ symbol: "VWCE", currentPrice: 0 })]),
    );
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    expect(recoverLegacyPortfolioToUser(USER_A)).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(portfolioStorageKey(USER_A))).not.toBeNull();
  });

  it("lets Analysis value recovered cache prices while leaving unpriced holdings unvalued", () => {
    localStorage.setItem(
      LEGACY_PORTFOLIO_STORAGE_KEY,
      JSON.stringify([
        holding({
          symbol: "VWCE",
          currentPrice: 0,
          providerSymbol: "VWCE.XETRA",
        }),
        holding({
          id: "pending-id",
          symbol: "PENDING",
          currentPrice: 0,
          purchasePrice: 0,
          providerSymbol: null,
        }),
      ]),
    );
    localStorage.setItem(
      LEGACY_PRICE_CACHE_KEY,
      JSON.stringify([
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          price: 112.5,
          updatedAt: "2026-07-18T08:00:00.000Z",
        },
      ]),
    );

    recoverLegacyPortfolioToUser(USER_A);

    const analysis = buildPortfolioAnalysis(readAuthenticatedHomePortfolio(USER_A));

    expect(analysis.totalValue).toBe(1125);
    expect(analysis.unvaluedHoldings).toHaveLength(1);
    expect(analysis.unvaluedHoldings[0]?.symbol).toBe("PENDING");
  });
});
