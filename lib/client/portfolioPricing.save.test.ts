import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import {
  applyPricesToHoldings,
  isRateLimitedPriceError,
  loadUserPortfolioHoldings,
  normalizeHoldingForSave,
  tryRefreshPortfolioPrices,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "auth-sub-save-tests";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "holding-1",
    symbol: overrides.symbol,
    name: overrides.name ?? `${overrides.symbol} Fund`,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 95,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    isin: overrides.isin ?? null,
  };
}

describe("portfolio save without live quotes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("persists holdings with pending prices instead of inferring purchase price", () => {
    const saved = normalizeHoldingForSave(
      holding({
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 0,
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
      }),
    );

    expect(saved.currentPrice).toBe(0);
    expect(saved.purchasePrice).toBe(95);
    expect(saved.providerSymbol).toBe("VWCE.XETRA");
    expect(saved.isin).toBe("IE00BK5BQT80");

    writePortfolioToStorage(USER, [saved]);
    const loaded = loadUserPortfolioHoldings(USER);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.currentPrice).toBe(0);
    expect(loaded[0]?.purchasePrice).toBe(95);
  });

  it("keeps holdings when price refresh fails with a rate-limit response", async () => {
    const existing = [
      holding({
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 0,
        providerSymbol: "VWCE.XETRA",
      }),
    ];
    writePortfolioToStorage(USER, existing);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "EODHD daily limit reached",
        }),
      }),
    );

    const result = await tryRefreshPortfolioPrices(USER, existing);

    expect(result.updated).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]?.purchasePrice).toBe(95);
    expect(result.holdings[0]?.currentPrice).toBe(0);
    expect(loadUserPortfolioHoldings(USER)[0]?.purchasePrice).toBe(95);
  });

  it("detects rate-limit style errors explicitly", () => {
    expect(isRateLimitedPriceError("EODHD daily limit reached")).toBe(true);
    expect(isRateLimitedPriceError("HTTP 429 Too Many Requests")).toBe(true);
    expect(isRateLimitedPriceError("EODHD returned 402: payment required")).toBe(
      true,
    );
    expect(isRateLimitedPriceError("Market data unavailable")).toBe(false);
  });

  it("excludes unavailable prices from portfolio valuation", () => {
    const analysis = buildPortfolioAnalysis([
      holding({ symbol: "AAA", currentPrice: 100, quantity: 5 }),
      holding({ symbol: "BBB", currentPrice: 0, quantity: 8, purchasePrice: 50 }),
    ]);

    expect(analysis.totalValue).toBe(500);
    expect(analysis.unvaluedHoldings).toHaveLength(1);
    expect(analysis.unvaluedHoldings[0]?.symbol).toBe("BBB");
  });

  it("updates an existing holding on later price refresh without duplication", async () => {
    const existing = [
      holding({
        id: "same-id",
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 0,
        providerSymbol: "VWCE.XETRA",
      }),
    ];
    writePortfolioToStorage(USER, existing);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 112.5,
              changePercent: 1.2,
              updatedAt: "2026-07-18T08:00:00.000Z",
            },
          ],
        }),
      }),
    );

    const refreshed = await tryRefreshPortfolioPrices(USER, existing);

    expect(refreshed.updated).toBe(true);
    expect(refreshed.holdings).toHaveLength(1);
    expect(refreshed.holdings[0]?.id).toBe("same-id");
    expect(refreshed.holdings[0]?.currentPrice).toBe(112.5);

    const merged = applyPricesToHoldings(existing, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 112.5,
        changePercent: 1.2,
        updatedAt: "2026-07-18T08:00:00.000Z",
      },
    ]);
    writePortfolioToStorage(USER, merged);

    const loaded = loadUserPortfolioHoldings(USER);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.currentPrice).toBe(112.5);
  });
});
