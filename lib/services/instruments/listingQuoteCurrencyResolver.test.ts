import { beforeEach, describe, expect, it, vi } from "vitest";

import { applyMatchResultToImportRow, finalizeImportRowForSave } from "@/lib/services/import/finalizeImport";
import { applyManualExactListingToImportRow } from "@/lib/services/instruments/listingConfirmation";
import { applyPricesToHoldings } from "@/lib/client/portfolioPricing";
import {
  enrichHoldingsWithListingQuoteCurrency,
  resolveListingQuoteCurrencyAsync,
} from "@/lib/services/instruments/listingQuoteCurrencyResolver";
import {
  resolveListingQuoteCurrency,
  QUOTE_CURRENCY_REVIEW_WARNING,
} from "@/lib/services/instruments/quoteCurrency";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import type { ImportRow } from "@/lib/services/import/types";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { PriceApiQuote } from "@/lib/types/portfolioStorage";

const metadataStore = new Map<string, { quoteCurrency: string; exchange?: string; isin?: string }>();
const idMappingStore = new Map<string, Array<Record<string, string>>>();
const searchStore = new Map<string, Array<Record<string, string>>>();

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
      exchange: entry.exchange ?? null,
      isin: entry.isin ?? null,
      source: "id_mapping" as const,
      resolvedAt: new Date().toISOString(),
    };
  },
  writeListingMetadata: async (metadata: {
    providerSymbol: string;
    quoteCurrency: string;
    exchange?: string | null;
    isin?: string | null;
  }) => {
    metadataStore.set(metadata.providerSymbol.toUpperCase(), {
      quoteCurrency: metadata.quoteCurrency,
      exchange: metadata.exchange ?? undefined,
      isin: metadata.isin ?? undefined,
    });
  },
  readPersistedInstrumentLookup: async <T>(lookupKey: string): Promise<T | null> => {
    if (lookupKey.startsWith("id_mapping|")) {
      const isin = lookupKey.split("isin:")[1] ?? "";
      return (idMappingStore.get(isin) as T | undefined) ?? null;
    }
    if (lookupKey.startsWith("search|")) {
      return (searchStore.get(lookupKey) as T | undefined) ?? null;
    }
    return null;
  },
}));

vi.mock("@/lib/services/instruments/eodhdClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/instruments/eodhdClient")>();
  return {
    ...actual,
    fetchIdMapping: vi.fn(async ({ isin }: { isin?: string }) => {
      fetchIdMappingCalls += 1;
      return (idMappingStore.get(isin ?? "") ?? []) as never;
    }),
    fetchSearch: vi.fn(async (query: string, options?: { exchange?: string | null }) => {
      fetchSearchCalls += 1;
      const key = `search|exchange:${options?.exchange ?? ""}|query:${query.trim().toUpperCase()}`;
      return (searchStore.get(key) ?? []) as never;
    }),
  };
});

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    purchaseDate: null,
    assetType: "investment",
    currency: "EUR",
    isin: "IE00B3XXRP09",
    exchange: "AS",
    reviewTier: "review",
    userConfirmed: false,
    ...overrides,
  };
}

const VUSA_RESOLVED: ResolvedInstrument = {
  providerSymbol: "VUSA.AS",
  instrumentName: "Vanguard S&P 500 UCITS ETF",
  exchange: "AS",
  isin: "IE00B3XXRP09",
  quoteCurrency: "EUR",
  matchMethod: "isin",
  confidence: 0.98,
  requiresConfirmation: false,
  warnings: [],
};

describe("listing quote currency resolver", () => {
  beforeEach(() => {
    metadataStore.clear();
    idMappingStore.clear();
    searchStore.clear();
    fetchIdMappingCalls = 0;
    fetchSearchCalls = 0;
    vi.clearAllMocks();
  });

  it("preserves quoteCurrency through matched import save paths", () => {
    const matched = applyMatchResultToImportRow(importRow(), VUSA_RESOLVED);
    const saved = finalizeImportRowForSave(matched);

    expect(matched.quoteCurrency).toBe("EUR");
    expect(saved.quoteCurrency).toBe("EUR");
    expect(saved.currency).toBe("EUR");
  });

  it("resolves manual exact VUSA.AS to EUR from cached listing metadata", async () => {
    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR", exchange: "AS" });

    const resolution = await resolveListingQuoteCurrencyAsync({
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
    });

    expect(resolution.currency).toBe("EUR");
    expect(resolution.source).toBe("listing_metadata");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
  });

  it("resolves VUSA.AS refresh from metadata without a verified registry entry", async () => {
    expect(lookupVerifiedByProviderSymbol("VUSA.AS")).toBeNull();

    metadataStore.set("VUSA.AS", { quoteCurrency: "EUR", exchange: "AS" });

    const { holdings, errors } = await enrichHoldingsWithListingQuoteCurrency([
      {
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        isin: "IE00B3XXRP09",
        exchange: "AS",
        name: "Vanguard S&P 500 UCITS ETF",
      },
    ]);

    expect(errors).toEqual([]);
    expect(holdings[0]?.quoteCurrency).toBe("EUR");

    const { targets, errors: targetErrors } = resolveQuotePriceTargets(holdings);
    expect(targetErrors).toEqual([]);
    expect(targets[0]?.currency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
  });

  it("keeps STRC.AS as USD via verified registry override", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "STRC.AS",
      }),
    ).toEqual({
      currency: "USD",
      source: "verified_registry",
      requiresReview: false,
    });
  });

  it("leaves unknown FOO.AS unresolved instead of guessing EUR", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "FOO.AS",
        exchange: "AS",
      }),
    ).toEqual({
      currency: null,
      source: "unresolved",
      requiresReview: true,
    });
  });

  it("resolves XETRA listings through exchange fallback when metadata is absent", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "NEWCO.XETRA",
      }),
    ).toEqual({
      currency: "EUR",
      source: "exchange_fallback",
      requiresReview: false,
    });
  });

  it("resolves US listings as USD through the documented safe path", () => {
    expect(
      resolveListingQuoteCurrency({
        providerSymbol: "AAPL.US",
      }),
    ).toEqual({
      currency: "USD",
      source: "exchange_fallback",
      requiresReview: false,
    });
  });

  it("resolves from cached id-mapping rows without provider calls and writes metadata", async () => {
    idMappingStore.set("IE00B3XXRP09", [
      {
        Code: "VUSA",
        Exchange: "AS",
        Currency: "EUR",
        ISIN: "IE00B3XXRP09",
      },
    ]);

    const first = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "VUSA",
        },
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "VUSA duplicate",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(first.holdings.every((holding) => holding.quoteCurrency === "EUR")).toBe(true);
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
    expect(metadataStore.get("VUSA.AS")?.quoteCurrency).toBe("EUR");

    fetchIdMappingCalls = 0;
    const second = await enrichHoldingsWithListingQuoteCurrency(first.holdings, {
      allowProviderLookup: true,
    });
    expect(second.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);
    expect(fetchSearchCalls).toBe(0);
  });

  it("uses one provider id-mapping call per unique unresolved ISIN when cache is empty", async () => {
    idMappingStore.set("IE00B3XXRP09", [
      {
        Code: "VUSA",
        Exchange: "AS",
        Currency: "EUR",
        ISIN: "IE00B3XXRP09",
      },
    ]);

    const { holdings } = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "VUSA",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(0);

    metadataStore.clear();
    idMappingStore.clear();
    fetchIdMappingCalls = 0;

    vi.mocked(
      (await import("@/lib/services/instruments/eodhdClient")).fetchIdMapping,
    ).mockImplementationOnce(async () => {
      fetchIdMappingCalls += 1;
      return [
        {
          Code: "VUSA",
          Exchange: "AS",
          Currency: "EUR",
          ISIN: "IE00B3XXRP09",
        },
      ] as never;
    });

    const resolved = await enrichHoldingsWithListingQuoteCurrency(
      [
        {
          symbol: "VUSA",
          providerSymbol: "VUSA.AS",
          isin: "IE00B3XXRP09",
          exchange: "AS",
          name: "VUSA",
        },
      ],
      { allowProviderLookup: true },
    );

    expect(resolved.holdings[0]?.quoteCurrency).toBe("EUR");
    expect(fetchIdMappingCalls).toBe(1);
    expect(fetchSearchCalls).toBe(0);
    expect(metadataStore.get("VUSA.AS")?.quoteCurrency).toBe("EUR");
  });

  it("persists live quote currency on holdings after a successful response", () => {
    const holding = {
      id: "vusa",
      symbol: "VUSA",
      name: "VUSA",
      quantity: 1,
      purchasePrice: 100,
      currentPrice: 0,
      currency: "EUR" as const,
      assetType: "investment" as const,
      providerSymbol: "VUSA.AS",
      priceDataStatus: "stale" as const,
    };
    const now = new Date().toISOString();
    const quote: PriceApiQuote = {
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      priceEur: 120,
      currentPrice: 120,
      currency: "EUR",
      updatedAt: now,
      fetchedAt: now,
      dataStatus: "live",
      cacheStatus: "fresh",
    };

    const [updated] = applyPricesToHoldings([holding as import("@/lib/types/portfolioStorage").StoredPortfolioHolding], [quote]);
    expect(updated?.quoteCurrency).toBe("EUR");
  });

  it("does not treat portfolio base currency as instrument quote currency", () => {
    const { targets, errors, skipped } = resolveQuotePriceTargets([
      {
        symbol: "FOO",
        providerSymbol: "FOO.AS",
        exchange: "AS",
        currency: "EUR",
        name: "Unknown Amsterdam listing",
      },
    ]);

    expect(targets).toEqual([]);
    expect(skipped).toBe(1);
    expect(errors[0]).toBe(`FOO: ${QUOTE_CURRENCY_REVIEW_WARNING}`);
  });

  it("does not set quoteCurrency on manual exact listing without metadata or registry", () => {
    const row = applyManualExactListingToImportRow(importRow(), {
      ok: true,
      providerSymbol: "VUSA.AS",
      ticker: "VUSA",
      exchange: "AS",
      confirmationSource: "manual_exact_listing",
      resolved: {
        providerSymbol: "VUSA.AS",
        instrumentName: null,
        exchange: "AS",
        isin: null,
        quoteCurrency: null,
        matchMethod: "ticker_exchange",
        confidence: 1,
        requiresConfirmation: true,
        warnings: [],
        confirmationSource: "manual_exact_listing",
      },
    });

    expect(row.quoteCurrency).toBeNull();
    expect(row.providerSymbol).toBe("VUSA.AS");
  });
});
