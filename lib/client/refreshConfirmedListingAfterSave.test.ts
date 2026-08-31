import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import {
  refreshConfirmedListingAfterSave,
  resetConfirmedListingAfterSaveForTests,
} from "@/lib/client/refreshConfirmedListingAfterSave";
import { waitForLivePriceRefreshCompletion } from "@/lib/client/portfolioPricing";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "auth-sub-confirmed-listing-after-save";
const PROVIDER_SYMBOL = "ABCD.US";
const HOLDING_SAVED_MESSAGE =
  "Holding saved. Current price is temporarily unavailable and will be refreshed later.";

function etfHolding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "etf-1",
    symbol: "ABCD",
    name: "Example Dividend ETF",
    quantity: 40,
    purchasePrice: 22.5,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: PROVIDER_SYMBOL,
    isin: "US0000000001",
    exchange: "US",
    quoteCurrency: "USD",
    priceDataStatus: "unavailable",
    ...overrides,
  };
}

function pricesFetchCall(fetchSpy: ReturnType<typeof vi.fn>) {
  return fetchSpy.mock.calls.find(([url, init]) => {
    return String(url).includes("/api/prices") && init?.method === "POST";
  });
}

function pricesRequestBody(fetchSpy: ReturnType<typeof vi.fn>) {
  const call = pricesFetchCall(fetchSpy);
  expect(call).toBeTruthy();
  return JSON.parse(String(call?.[1]?.body)) as {
    forceRefresh?: boolean;
    holdings: Array<{ providerSymbol?: string | null }>;
  };
}

describe("refresh confirmed listing after save", () => {
  beforeEach(() => {
    localStorage.clear();
    resetConfirmedListingAfterSaveForTests();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    await waitForLivePriceRefreshCompletion();
    resetConfirmedListingAfterSaveForTests();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("quotes the stored providerSymbol of a confirmed non-registry ETF", async () => {
    expect(lookupVerifiedByProviderSymbol(PROVIDER_SYMBOL)).toBeNull();

    const saved = etfHolding();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        prices: [
          {
            symbol: "ABCD",
            providerSymbol: PROVIDER_SYMBOL,
            priceEur: 24.9,
            currentPrice: 24.9,
            currency: "USD",
            dataStatus: "live",
            updatedAt: "2026-08-31T08:00:00.000Z",
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [saved],
      savedHolding: saved,
    });

    const body = pricesRequestBody(fetchSpy);
    expect(body.forceRefresh).toBe(true);
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0]?.providerSymbol).toBe(PROVIDER_SYMBOL);
  });

  it("makes a successful mocked quote visible on the saved holding", async () => {
    const saved = etfHolding();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "ABCD",
              providerSymbol: PROVIDER_SYMBOL,
              priceEur: 24.9,
              currentPrice: 24.9,
              currency: "USD",
              dataStatus: "live",
              updatedAt: "2026-08-31T08:00:00.000Z",
            },
          ],
        }),
      }),
    );

    const result = await refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [saved],
      savedHolding: saved,
    });

    expect(result.quoteApplied).toBe(true);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]?.currentPrice).toBe(24.9);
    const display = resolveHoldingDisplayPrice(result.holdings[0]!);
    expect(display.price).toBe(24.9);
    expect(display.source).toBe("live");
  });

  it("keeps the holding saved and unavailable when the quote fails", async () => {
    const saved = etfHolding({ purchasePrice: 0, currentPrice: 0 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "Market data unavailable",
        }),
      }),
    );

    const result = await refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [saved],
      savedHolding: saved,
    });

    expect(result.quoteApplied).toBe(false);
    expect(result.holdings).toHaveLength(1);
    expect(result.holdings[0]).toEqual(saved);
    expect(result.holdings[0]?.currentPrice).toBe(0);
    expect(result.holdings[0]?.priceDataStatus).toBe("unavailable");
    const display = resolveHoldingDisplayPrice(result.holdings[0]!);
    expect(display.source).toBe("unavailable");
    expect(HOLDING_SAVED_MESSAGE).toMatch(/temporarily unavailable/);
  });

  it("does not change quantity, purchase price, currency, or listing identity", async () => {
    const existing = etfHolding({
      id: "existing-1",
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 10,
      purchasePrice: 95,
      currentPrice: 110,
      isin: "IE00BK5BQT80",
      exchange: "XETRA",
    });
    const saved = etfHolding({
      quantity: 40,
      purchasePrice: 22.5,
      currency: "EUR",
      providerSymbol: PROVIDER_SYMBOL,
      isin: "US0000000001",
      exchange: "US",
      symbol: "ABCD",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "ABCD",
              providerSymbol: PROVIDER_SYMBOL,
              priceEur: 24.9,
              currentPrice: 24.9,
              currency: "USD",
              dataStatus: "live",
              updatedAt: "2026-08-31T08:00:00.000Z",
            },
          ],
        }),
      }),
    );

    const result = await refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [existing, saved],
      savedHolding: saved,
    });

    const priced = result.holdings.find((row) => row.id === saved.id);
    expect(result.quoteApplied).toBe(true);
    expect(priced?.quantity).toBe(40);
    expect(priced?.purchasePrice).toBe(22.5);
    expect(priced?.currency).toBe("EUR");
    expect(priced?.providerSymbol).toBe(PROVIDER_SYMBOL);
    expect(priced?.isin).toBe("US0000000001");
    expect(priced?.exchange).toBe("US");
    expect(priced?.symbol).toBe("ABCD");

    const untouched = result.holdings.find((row) => row.id === existing.id);
    expect(untouched?.quantity).toBe(10);
    expect(untouched?.purchasePrice).toBe(95);
    expect(untouched?.currentPrice).toBe(110);
    expect(untouched?.providerSymbol).toBe("VWCE.XETRA");
  });

  it("does not start a second overlapping post-save quote", async () => {
    const saved = etfHolding();
    let releaseFetch: (() => void) | undefined;
    let resolveStarted: (() => void) | undefined;
    const fetchStarted = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise((resolveFetch) => {
            resolveStarted?.();
            releaseFetch = () =>
              resolveFetch({
                ok: true,
                json: async () => ({
                  success: true,
                  prices: [
                    {
                      symbol: "ABCD",
                      providerSymbol: PROVIDER_SYMBOL,
                      priceEur: 24.9,
                      currentPrice: 24.9,
                      dataStatus: "live",
                    },
                  ],
                }),
              });
          }),
      ),
    );

    const first = refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [saved],
      savedHolding: saved,
    });
    const second = refreshConfirmedListingAfterSave({
      userSub: USER,
      holdings: [saved],
      savedHolding: saved,
    });
    await fetchStarted;
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);

    releaseFetch?.();
    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult.quoteApplied).toBe(true);
    expect(secondResult.quoteApplied).toBe(false);
    expect(vi.mocked(fetch).mock.calls.length).toBe(1);
  });
});
