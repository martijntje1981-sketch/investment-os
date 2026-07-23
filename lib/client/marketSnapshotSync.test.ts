import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resetMarketSnapshotSyncForTests,
  syncPortfolioPricesFromSnapshot,
} from "@/lib/client/marketSnapshotSync";
import { writePriceCache } from "@/lib/client/portfolioPricing";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const storage = new Map<string, string>();
const USER = "snapshot-user";

function stubWindowLocalStorage(): void {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      },
      clear: () => {
        storage.clear();
      },
    },
  });
}

function holding(): StoredPortfolioHolding {
  return {
    id: "vwce",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 100,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
  };
}

describe("marketSnapshotSync", () => {
  beforeEach(() => {
    storage.clear();
    globalThis.localStorage?.clear?.();
    stubWindowLocalStorage();
    resetMarketSnapshotSyncForTests();
    vi.restoreAllMocks();
  });

  it("loads prices from the snapshot API without forceRefresh", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          lastRefreshedAt: "2026-07-23T07:30:00.000Z",
          lastSlot: "eu_open",
          status: "completed",
          symbolsReceived: 1,
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "VWCE",
              providerSymbol: "VWCE.XETRA",
              priceEur: 112,
              currentPrice: 112,
              updatedAt: "2026-07-23T07:30:00.000Z",
              dataStatus: "live",
            },
          ],
          requested: 1,
          received: 1,
          quoteSource: "cache",
          lastSuccessfulUpdate: "2026-07-23T07:30:00.000Z",
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const result = await syncPortfolioPricesFromSnapshot(USER, [holding()]);

    expect(result.updated).toBe(true);
    expect(result.holdings[0]?.currentPrice).toBe(112);

    const pricesCall = fetchMock.mock.calls.find(([url, init]) => {
      return String(url).includes("/api/prices") && init?.method === "POST";
    });
    expect(pricesCall).toBeTruthy();
    const body = JSON.parse(String(pricesCall?.[1]?.body));
    expect(body.forceRefresh).toBeUndefined();
  });

  it("skips snapshot sync when local cache is already current", async () => {
    writePriceCache(USER, [
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        priceEur: 110,
        currentPrice: 110,
        updatedAt: "2026-07-23T08:00:00.000Z",
      },
    ]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        lastRefreshedAt: "2026-07-23T07:30:00.000Z",
        status: "completed",
        symbolsReceived: 1,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await syncPortfolioPricesFromSnapshot(USER, [holding()]);

    expect(result.updated).toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/api/market-snapshot");
  });
});
