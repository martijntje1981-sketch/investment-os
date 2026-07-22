import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/prices/route";

vi.mock("@/lib/services/prices/priceService", () => ({
  loadPricesForHoldings: vi.fn(async () => ({
    success: true,
    baseCurrency: "EUR" as const,
    fxRates: {
      EUR: 1,
      USD_TO_EUR: 0.92,
      GBP_TO_EUR: 1.17,
      CHF_TO_EUR: 1.05,
    },
    prices: [
      {
        symbol: "VWCE",
        eodhdSymbol: "VWCE.XETRA",
        providerSymbol: "VWCE.XETRA",
        isin: null,
        name: "Vanguard FTSE All-World",
        originalCurrency: "EUR",
        originalPrice: 100,
        baseCurrency: "EUR",
        exchangeRateToEur: 1,
        priceEur: 100,
        currentPrice: 100,
        previousCloseOriginal: 99,
        previousCloseEur: 99,
        previousClose: 99,
        change: 1,
        changePercent: 1.01,
        currency: "EUR",
        dataStatus: "live",
        cacheStatus: "fresh",
        provider: "eodhd",
        isStale: false,
        unavailableReason: null,
        open: 99,
        high: 101,
        low: 98,
        volume: 1000,
        timestamp: 1_700_000_000,
        updatedAt: "2026-07-20T10:00:00.000Z",
      },
    ],
    errors: [],
    requested: 1,
    received: 1,
    generatedAt: "2026-07-20T12:00:00.000Z",
    cache: { enabled: true, durationSeconds: 720 },
  })),
  loadDefaultWatchlistPrices: vi.fn(),
}));

import { loadPricesForHoldings } from "@/lib/services/prices/priceService";

describe("POST /api/prices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates holdings to PriceService and returns normalized quotes", async () => {
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [{ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }],
        }),
      }),
    );

    expect(loadPricesForHoldings).toHaveBeenCalledWith(
      [{ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }],
      {
        forceRefresh: false,
        onlyProviderSymbols: undefined,
        estimateOnly: false,
      },
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.prices[0].cacheStatus).toBe("fresh");
    expect(payload.prices[0].provider).toBe("eodhd");
  });

  it("returns 400 when no holdings are supplied", async () => {
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ holdings: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(loadPricesForHoldings).not.toHaveBeenCalled();
  });

  it("returns 200 when PriceService reports no quotable holdings", async () => {
    vi.mocked(loadPricesForHoldings).mockResolvedValueOnce({
      success: true,
      message: "No holdings available for live pricing.",
      baseCurrency: "EUR",
      fxRates: {
        EUR: 1,
        USD_TO_EUR: null,
        GBP_TO_EUR: null,
        CHF_TO_EUR: null,
      },
      prices: [],
      errors: ["VWCE: missing confirmed providerSymbol — quote refresh skipped (matching is import-only)."],
      requested: 1,
      received: 0,
      generatedAt: "2026-07-22T09:00:00.000Z",
      cache: { enabled: true, durationSeconds: 720 },
    });

    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [{ symbol: "VWCE", name: "Vanguard FTSE All-World" }],
        }),
      }),
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.message).toBe("No holdings available for live pricing.");
    expect(payload.prices).toEqual([]);
  });
});
