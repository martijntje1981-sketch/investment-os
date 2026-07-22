import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import {
  applyPricesToHoldings,
  countQuotablePriceHoldings,
  isRateLimitedPriceError,
  loadUserPortfolioHoldings,
  normalizeHoldingForSave,
  tryRefreshPortfolioPrices,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "auth-sub-save-tests";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    ...overrides,
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
    exchange: overrides.exchange ?? null,
    confirmationSource: overrides.confirmationSource,
  };
}

describe("portfolio save without live quotes", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("skips price refresh when no holdings have providerSymbol", async () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 95,
        providerSymbol: null,
      }),
    ];
    writePortfolioToStorage(USER, holdings);

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    expect(countQuotablePriceHoldings(holdings, USER)).toBe(0);

    const result = await tryRefreshPortfolioPrices(USER, holdings);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.updated).toBe(false);
    expect(result.message).toBe(NO_QUOTABLE_HOLDINGS_MESSAGE);
    expect(loadUserPortfolioHoldings(USER)).toHaveLength(1);
  });

  it("uses purchase price as estimated display price when live quote is missing", () => {
    const saved = normalizeHoldingForSave(
      holding({
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 0,
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
      }),
    );

    expect(saved.currentPrice).toBe(95);
    expect(saved.purchasePrice).toBe(95);
    expect(saved.providerSymbol).toBe("VWCE.XETRA");
    expect(saved.isin).toBe("IE00BK5BQT80");
    expect(saved.priceDataStatus).toBe("unavailable");

    writePortfolioToStorage(USER, [saved]);
    const loaded = loadUserPortfolioHoldings(USER);

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.currentPrice).toBe(95);
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

  it("includes estimated purchase-price valuations in portfolio totals", () => {
    const analysis = buildPortfolioAnalysis([
      holding({ symbol: "AAA", currentPrice: 100, quantity: 5 }),
      holding({ symbol: "BBB", currentPrice: 0, quantity: 8, purchasePrice: 50 }),
    ]);

    expect(analysis.totalValue).toBe(900);
    expect(analysis.unvaluedHoldings).toHaveLength(0);
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

  it("marks existing prices stale when refresh returns no quote but providerSymbol exists", () => {
    const existing = holding({
      symbol: "VWCE",
      currentPrice: 105,
      providerSymbol: "VWCE.XETRA",
      priceDataStatus: "live",
    });

    const updated = applyPricesToHoldings([existing], []);

    expect(updated[0]?.providerSymbol).toBe("VWCE.XETRA");
    expect(updated[0]?.currentPrice).toBe(105);
    expect(updated[0]?.priceDataStatus).toBe("stale");
  });

  it("preserves providerSymbol and last price when refresh fails with HTTP 402", async () => {
    const existing = [
      holding({
        symbol: "VWCE",
        purchasePrice: 95,
        currentPrice: 105,
        providerSymbol: "VWCE.XETRA",
        priceDataStatus: "live",
      }),
    ];
    writePortfolioToStorage(USER, existing);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "EODHD returned 402: payment required",
        }),
      }),
    );

    const result = await tryRefreshPortfolioPrices(USER, existing);

    expect(result.updated).toBe(false);
    expect(result.rateLimited).toBe(true);
    expect(result.holdings[0]?.providerSymbol).toBe("VWCE.XETRA");
    expect(result.holdings[0]?.currentPrice).toBe(105);
  });

  it("auto-enriches manual holdings on load when verified mapping exists", () => {
    writePortfolioToStorage(USER, [
      holding({
        symbol: "AIFS",
        exchange: "Xetra",
        providerSymbol: null,
        confirmationSource: "manual_entry",
      }),
    ]);

    const loaded = loadUserPortfolioHoldings(USER);
    expect(loaded[0]?.providerSymbol).toBe("AIFS.XETRA");
    expect(loaded[0]?.confirmationSource).toBe("verified_mapping");

    const reloaded = loadUserPortfolioHoldings(USER);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.providerSymbol).toBe("AIFS.XETRA");
  });

  it("posts only quotable holdings to /api/prices", async () => {
    const holdings = [
      holding({
        symbol: "AIFS",
        exchange: "XETRA",
        providerSymbol: "AIFS.XETRA",
        confirmationSource: "verified_mapping",
      }),
      holding({
        id: "holding-2",
        symbol: "UNKNOWN",
        providerSymbol: null,
      }),
    ];

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        prices: [
          {
            symbol: "AIFS",
            providerSymbol: "AIFS.XETRA",
            priceEur: 9.5,
            currentPrice: 9.5,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await tryRefreshPortfolioPrices(USER, holdings);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.forceRefresh).toBe(false);
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0]?.providerSymbol).toBe("AIFS.XETRA");
  });
});
