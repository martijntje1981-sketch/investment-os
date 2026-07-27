import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyPricesToHoldings,
} from "@/lib/client/portfolioPricing";
import { runLivePortfolioPriceRefreshAction } from "@/lib/client/livePortfolioPriceRefreshAction";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import {
  readPortfolioFromStorage,
  writePortfolioToStorage,
} from "@/lib/client/userPortfolioStorage";
import { enrichHoldingsWithListingQuoteCurrency } from "@/lib/services/instruments/listingQuoteCurrencyResolver";
import { importMappingStorageKey } from "@/lib/client/importMappingStorageKeys";
import { readImportMappingsFromCache } from "@/lib/services/import/mappingMemory";
import { mapStoredMappingToDbInsert } from "@/lib/services/portfolio/mappers";
import { createEodhdMarketDataProvider } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import type { PriceApiQuote } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "metadata-persistence-user";
const PORTFOLIO_ID = "22222222-2222-4222-8222-222222222222";

const metadataStore = new Map<string, { quoteCurrency: string }>();
let fetchIdMappingCalls = 0;
let fetchSearchCalls = 0;

vi.mock("@/lib/services/marketData/persistentMappingCache", () => ({
  buildIdMappingLookupKey: ({ isin }: { isin?: string }) => `id_mapping|isin:${isin ?? ""}`,
  buildSearchLookupKey: (query: string, exchange?: string | null) =>
    `search|exchange:${exchange ?? ""}|query:${query.trim().toUpperCase()}`,
  buildListingMetadataLookupKey: (providerSymbol: string) =>
    `listing_metadata|providersymbol:${providerSymbol.trim().toUpperCase()}`,
  readListingMetadata: async (providerSymbol: string) => {
    const entry = metadataStore.get(providerSymbol.trim().toUpperCase());
    if (!entry) return null;
    return {
      providerSymbol: providerSymbol.trim().toUpperCase(),
      quoteCurrency: entry.quoteCurrency,
      exchange: "AS",
      isin: "IE00B3XXRP09",
      source: "id_mapping" as const,
      resolvedAt: new Date().toISOString(),
    };
  },
  writeListingMetadata: async (metadata: {
    providerSymbol: string;
    quoteCurrency: string;
  }) => {
    metadataStore.set(metadata.providerSymbol.toUpperCase(), {
      quoteCurrency: metadata.quoteCurrency,
    });
  },
  readPersistedInstrumentLookup: async () => null,
}));

vi.mock("@/lib/services/instruments/eodhdClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/instruments/eodhdClient")>();
  return {
    ...actual,
    fetchIdMapping: vi.fn(async () => {
      fetchIdMappingCalls += 1;
      return [];
    }),
    fetchSearch: vi.fn(async () => {
      fetchSearchCalls += 1;
      return [];
    }),
  };
});

vi.mock("@/lib/client/livePortfolioPriceRefresh", () => ({
  countUniqueQuotableProviderSymbols: () => 1,
  readLastLivePriceRefreshAt: () => null,
  refreshLivePortfolioPrices: vi.fn(),
  buildLiveRefreshPreviewMessage: () => null,
}));

import { refreshLivePortfolioPrices } from "@/lib/client/livePortfolioPriceRefresh";

function vusaHolding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "vusa-holding",
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    quantity: 10,
    purchasePrice: 120,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    exchange: "AS",
    isin: "IE00B3XXRP09",
    providerSymbol: "VUSA.AS",
    priceDataStatus: "stale",
    ...overrides,
  };
}

function wireOmittedVusaQuote(): PriceApiQuote {
  const now = new Date().toISOString();
  return {
    symbol: "VUSA",
    providerSymbol: "VUSA.AS",
    isin: "IE00B3XXRP09",
    priceEur: 124.425,
    currentPrice: 124.425,
    previousClose: 123.96,
    change: 0.465,
    changePercent: 0.3751,
    // Server normalization sets this from metadata-resolved target currency,
    // not from the EODHD wire payload.
    currency: "EUR",
    updatedAt: now,
    fetchedAt: now,
    dataStatus: "live",
    cacheStatus: "fresh",
  };
}

describe("metadata-resolved quote currency persistence", () => {
  beforeEach(() => {
    localStorage.clear();
    metadataStore.clear();
    fetchIdMappingCalls = 0;
    fetchSearchCalls = 0;
    vi.clearAllMocks();
  });

  it("normalizes VUSA.AS when wire currency is omitted but target currency came from metadata", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR" });

    const enrichment = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "Vanguard S&P 500 UCITS ETF",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(enrichment.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
    expect(metadataStore.get("VUSA.AS")?.quoteCurrency).toBe("EUR");

    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      {
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        isin: "IE00B3XXRP09",
        name: "Vanguard S&P 500 UCITS ETF",
        currency: enrichment.holdings[0]?.quoteCurrency ?? null,
      },
      {
        providerSymbol: "VUSA.AS",
        wireCurrency: null,
        originalCurrency: "EUR",
        originalPrice: 124.425,
        previousCloseOriginal: 123.96,
        changeOriginal: 0.465,
        changePercentOriginal: 0.3751,
        open: null,
        high: null,
        low: null,
        volume: null,
        timestamp: null,
        updatedAt: new Date().toISOString(),
        marketStatus: null,
      },
      { EUR: 1, USD: 0.9, GBP: null, CHF: null },
    );

    expect(normalized.currency).toBe("EUR");
    expect(normalized.dataStatus).not.toBe("unavailable");
  });

  it("persists metadata-resolved quote currency to the stored holding after a successful refresh", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR" });

    const before = vusaHolding({ quoteCurrency: null });
    writePortfolioToStorage(USER, [before]);

    vi.mocked(refreshLivePortfolioPrices).mockResolvedValueOnce({
      holdings: applyPricesToHoldings([before], [wireOmittedVusaQuote()]),
      updated: true,
      uniqueRequested: 1,
      updatedCount: 1,
      totalQuotable: 1,
      message: "Prices updated.",
      quotaExhausted: false,
      inProgress: false,
      cooldownRemainingMs: 0,
    });

    const saved: StoredPortfolioHolding[] = [];
    await runLivePortfolioPriceRefreshAction({
      userSub: USER,
      holdings: [before],
      saveHoldings: (next) => {
        saved.push(...next);
        writePortfolioToStorage(USER, next);
      },
      baseCurrency: "EUR",
      fxStatus: "ready",
      refreshFx: () => undefined,
    });

    expect(saved[0]?.quoteCurrency).toBe("EUR");
    expect(saved[0]?.currentPrice).toBe(124.425);

    const reloaded = readPortfolioFromStorage(USER);
    expect(reloaded[0]?.quoteCurrency).toBe("EUR");
    expect(localStorage.getItem(portfolioStorageKey(USER))).toContain('"quoteCurrency":"EUR"');
  });

  it("maps persisted quote currency into holding_instrument_mappings on cloud sync", () => {
    const holding = vusaHolding({ quoteCurrency: "EUR" });
    const mapping = mapStoredMappingToDbInsert(
      holding,
      USER,
      PORTFOLIO_ID,
      holding.id,
    );

    expect(mapping?.quote_currency).toBe("EUR");
    expect(mapping?.provider_symbol).toBe("VUSA.AS");
  });

  it("resolves a new session with zero metadata provider calls once the holding is persisted", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR" });

    const first = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "Vanguard S&P 500 UCITS ETF",
        },
      ],
      { allowProviderLookup: true },
    );
    expect(first.holdings[0]?.quoteCurrency).toBe("EUR");

    writePortfolioToStorage(USER, [
      vusaHolding({ quoteCurrency: first.holdings[0]?.quoteCurrency ?? null }),
    ]);

    metadataStore.clear();
    fetchIdMappingCalls = 0;
    fetchSearchCalls = 0;

    const reloaded = readPortfolioFromStorage(USER);
    const second = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: reloaded[0]?.isin,
          exchange: "AS",
          name: "Vanguard S&P 500 UCITS ETF",
          quoteCurrency: reloaded[0]?.quoteCurrency ?? null,
        },
      ],
      { allowProviderLookup: true },
    );

    expect(second.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
    expect(metadataStore.size).toBe(0);
  });

  it("still resolves with zero metadata provider calls when only listing_metadata cache survives a new session", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR" });

    const enrichment = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "Vanguard S&P 500 UCITS ETF",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(enrichment.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(metadataStore.get("VUSA.AS")?.quoteCurrency).toBe("EUR");

    fetchIdMappingCalls = 0;
    fetchSearchCalls = 0;

    const second = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "Vanguard S&P 500 UCITS ETF",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(second.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
  });

  it("does not auto-update import mapping memory during price refresh (import path only)", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR" });
    const before = vusaHolding({ quoteCurrency: null });
    writePortfolioToStorage(USER, [before]);

    const [refreshed] = applyPricesToHoldings([before], [wireOmittedVusaQuote()]);
    writePortfolioToStorage(USER, [refreshed]);

    expect(refreshed.quoteCurrency).toBe("EUR");
    expect(readImportMappingsFromCache(USER)).toEqual([]);
    expect(localStorage.getItem(importMappingStorageKey(USER))).toBeNull();
  });
});
