import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST, GET } from "@/app/api/prices/route";

vi.mock("@/lib/services/canonicalQuotes/persistCanonicalCryptoQuotesAfterPrices", () => ({
  persistCanonicalCryptoQuotesAfterPrices: vi.fn(async () => ({
    attempted: 0,
    created: 0,
    improved: 0,
    already_current: 0,
    skipped_stale: 0,
    skipped_invalid: 0,
    forbidden: 0,
    error: 0,
    skipped_unauthenticated: 0,
    skipped_demo: 0,
    skipped_unresolved: 0,
    skipped_disabled: 1,
    skipped_cache: 0,
    skipped_estimate: 0,
  })),
}));

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
  loadBaseCurrencyFxSnapshot: vi.fn(async () => ({
    baseCurrency: "USD",
    eurToBaseRate: 1 / 0.92,
    source: "EODHD",
    updatedAt: "2026-07-26T08:00:00.000Z",
    status: "current",
    conversionPath: "EUR → USD via invert(USD_TO_EUR from EURUSD.FOREX)",
    foreignToEurRate: 0.92,
  })),
}));

import {
  loadBaseCurrencyFxSnapshot,
  loadDefaultWatchlistPrices,
  loadPricesForHoldings,
} from "@/lib/services/prices/priceService";
import { persistCanonicalCryptoQuotesAfterPrices } from "@/lib/services/canonicalQuotes/persistCanonicalCryptoQuotesAfterPrices";

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
        snapshotOnly: true,
        onlyProviderSymbols: undefined,
        estimateOnly: false,
      },
    );

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.prices[0].cacheStatus).toBe("fresh");
    expect(payload.prices[0].provider).toBe("eodhd");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
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

  it("loads presentation FX without hard snapshotOnly so cold cache can soft-fetch", async () => {
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fxSnapshotOnly: true,
          baseCurrency: "USD",
        }),
      }),
    );

    expect(loadBaseCurrencyFxSnapshot).toHaveBeenCalledWith("USD", {
      forceRefresh: false,
      snapshotOnly: false,
    });
    expect(loadPricesForHoldings).not.toHaveBeenCalled();

    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.fxSnapshot.baseCurrency).toBe("USD");
    expect(payload.fxSnapshot.status).toBe("current");
    expect(response.headers.get("Cache-Control")).toMatch(/private/);
  });

  it("does not publicly cache a forceRefresh holdings response", async () => {
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [{ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }],
          forceRefresh: true,
        }),
      }),
    );

    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("awaits persistence after PriceService without changing quote values", async () => {
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [{ id: "holding-1", symbol: "VWCE", providerSymbol: "VWCE.XETRA" }],
        }),
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.prices[0].currentPrice).toBe(100);
    expect(persistCanonicalCryptoQuotesAfterPrices).toHaveBeenCalledOnce();
    expect(persistCanonicalCryptoQuotesAfterPrices).toHaveBeenCalledWith({
      payload: expect.objectContaining({ success: true }),
      requestHoldings: [
        { id: "holding-1", symbol: "VWCE", providerSymbol: "VWCE.XETRA" },
      ],
      estimateOnly: false,
    });
    expect(loadPricesForHoldings).toHaveBeenCalledOnce();
  });

  it("still returns a successful refresh when persistence throws", async () => {
    vi.mocked(persistCanonicalCryptoQuotesAfterPrices).mockRejectedValueOnce(
      new Error("writer failed"),
    );
    const response = await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holdings: [{ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }],
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
  });

  it("does not persist fxSnapshotOnly or GET requests", async () => {
    await POST(
      new Request("http://localhost/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fxSnapshotOnly: true, baseCurrency: "USD" }),
      }),
    );
    expect(persistCanonicalCryptoQuotesAfterPrices).not.toHaveBeenCalled();

    vi.mocked(loadDefaultWatchlistPrices).mockResolvedValueOnce({
      success: true,
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: 0.92, GBP_TO_EUR: null, CHF_TO_EUR: null },
      prices: [],
      errors: [],
      requested: 0,
      received: 0,
      generatedAt: "2026-09-01T11:00:00.000Z",
      cache: { enabled: true, durationSeconds: 720 },
    });
    await GET();
    expect(persistCanonicalCryptoQuotesAfterPrices).not.toHaveBeenCalled();
  });
});
