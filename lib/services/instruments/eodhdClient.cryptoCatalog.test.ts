import { beforeEach, describe, expect, it, vi } from "vitest";

const readPersistedInstrumentLookupMock = vi.fn();
const readPersistedInstrumentLookupEntryMock = vi.fn();
const writePersistedInstrumentLookupMock = vi.fn();

vi.mock("@/lib/services/marketData/persistentMappingCache", () => ({
  buildExchangeSymbolListLookupKey: vi.fn((exchange: string) => `exchange_symbol_list|exchange:${exchange}`),
  buildIdMappingLookupKey: vi.fn(),
  buildSearchLookupKey: vi.fn(),
  readPersistedInstrumentLookup: readPersistedInstrumentLookupMock,
  readPersistedInstrumentLookupEntry: readPersistedInstrumentLookupEntryMock,
  writePersistedInstrumentLookup: writePersistedInstrumentLookupMock,
}));

vi.mock("@/lib/services/instruments/listingMetadata", () => ({
  persistListingMetadataFromProviderRows: vi.fn(),
}));

vi.mock("@/lib/services/marketData/providerCircuitBreaker", () => ({
  assertProviderAvailable: vi.fn(),
  recordProviderCircuitFailure: vi.fn(),
}));

describe("fetchExchangeSymbolList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    readPersistedInstrumentLookupMock.mockReset();
    readPersistedInstrumentLookupEntryMock.mockReset();
    writePersistedInstrumentLookupMock.mockReset();
    process.env.EODHD_API_KEY = "test-key";
  });

  it("uses persisted cache before calling the provider", async () => {
    readPersistedInstrumentLookupMock.mockResolvedValue([
      { Code: "SHIB-USD", Name: "Shiba Inu", Exchange: "CC" },
    ]);
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const { fetchExchangeSymbolList } = await import(
      "@/lib/services/instruments/eodhdClient"
    );
    const result = await fetchExchangeSymbolList("CC");

    expect(result.source).toBe("cache");
    expect(result.rows).toHaveLength(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("writes provider responses into cache with the requested TTL", async () => {
    readPersistedInstrumentLookupMock.mockResolvedValue(null);
    readPersistedInstrumentLookupEntryMock.mockResolvedValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => [{ Code: "SUSHI-USD", Name: "Sushi", Exchange: "CC" }],
      })),
    );

    const { fetchExchangeSymbolList } = await import(
      "@/lib/services/instruments/eodhdClient"
    );
    const result = await fetchExchangeSymbolList("CC", { ttlMs: 12 * 60 * 60 * 1000 });

    expect(result.source).toBe("provider");
    expect(writePersistedInstrumentLookupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lookupType: "exchange_symbol_list",
        ttlMs: 12 * 60 * 60 * 1000,
      }),
    );
  });

  it("reuses stale cached coverage when the provider call fails", async () => {
    readPersistedInstrumentLookupMock.mockResolvedValue(null);
    readPersistedInstrumentLookupEntryMock.mockResolvedValue({
      result: [{ Code: "BTC-USD", Name: "Bitcoin", Exchange: "CC" }],
      expiresAt: new Date(Date.now() - 1_000).toISOString(),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 503,
        text: async () => "temporarily unavailable",
        headers: new Headers(),
      })),
    );

    const { fetchExchangeSymbolList } = await import(
      "@/lib/services/instruments/eodhdClient"
    );
    const result = await fetchExchangeSymbolList("CC");

    expect(result.source).toBe("stale_cache");
    expect(result.rows[0]?.Code).toBe("BTC-USD");
  });
});
