import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchExchangeSymbolListMock } = vi.hoisted(() => ({
  fetchExchangeSymbolListMock: vi.fn(),
}));

vi.mock("@/lib/services/instruments/eodhdClient", () => ({
  fetchExchangeSymbolList: fetchExchangeSymbolListMock,
}));

import {
  applyCryptoSearchResultToHolding,
  fetchCryptoCatalog,
  isCryptoBaseAssetCoveredByCatalog,
  isCryptoProviderSymbolSupportedByCatalog,
  normalizeCryptoCatalogRows,
  resolveCryptoPairFromCatalog,
  searchCryptoCatalog,
  type CryptoCatalogEntry,
} from "@/lib/services/portfolio/cryptoCatalog";

function row(overrides: Record<string, unknown> = {}) {
  return {
    Code: "BTC-USD",
    Name: "Bitcoin",
    Exchange: "CC",
    Type: "CRYPTOCURRENCY",
    ...overrides,
  };
}

function entry(
  overrides: Partial<CryptoCatalogEntry> = {},
): CryptoCatalogEntry {
  return {
    providerSymbol: overrides.providerSymbol ?? "BTC-USD.CC",
    baseAsset: overrides.baseAsset ?? "BTC",
    quoteAsset: overrides.quoteAsset ?? "USD",
    displayPair: overrides.displayPair ?? "BTC/USD",
    name: overrides.name ?? "Bitcoin",
    exchange: "CC",
    instrumentType: "crypto",
  };
}

describe("cryptoCatalog normalization", () => {
  it("normalizes valid CC rows and deduplicates provider symbols", () => {
    const result = normalizeCryptoCatalogRows([
      row({ Code: "SHIB-USD", Name: "Shiba Inu" }),
      row({ Code: "SHIB-USD.CC", Name: "Shiba Inu duplicate" }),
      row({ Code: "SUSHI-USD", Name: "Sushi" }),
    ]);

    expect(result.entries).toEqual([
      expect.objectContaining({
        providerSymbol: "SHIB-USD.CC",
        baseAsset: "SHIB",
        quoteAsset: "USD",
        displayPair: "SHIB/USD",
        name: "Shiba Inu",
      }),
      expect.objectContaining({
        providerSymbol: "SUSHI-USD.CC",
        baseAsset: "SUSHI",
        quoteAsset: "USD",
        displayPair: "SUSHI/USD",
        name: "Sushi",
      }),
    ]);
    expect(result.diagnostics.duplicateRows).toBe(1);
  });

  it("excludes malformed and inactive rows safely", () => {
    const result = normalizeCryptoCatalogRows([
      row({ Code: "BADROW", Name: "Broken" }),
      row({ Code: "", Name: "Empty" }),
      row({ Code: "ETH-EUR", Exchange: "CC", IsActive: false }),
      row({ Code: "ETH-USD", Exchange: "OTHER" }),
      row({ Code: "ETH-USD", Exchange: "CC", Name: "Ethereum" }),
    ]);

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.providerSymbol).toBe("ETH-USD.CC");
    expect(result.diagnostics.malformedRows).toBe(3);
    expect(result.diagnostics.inactiveRows).toBe(1);
  });

  it("preserves unusual but valid ticker characters", () => {
    const result = normalizeCryptoCatalogRows([
      row({ Code: "1000SHIB-USD", Name: "1000 Shiba Inu" }),
    ]);

    expect(result.entries[0]).toMatchObject({
      providerSymbol: "1000SHIB-USD.CC",
      baseAsset: "1000SHIB",
      quoteAsset: "USD",
    });
  });
});

describe("cryptoCatalog search and resolution", () => {
  const entries = [
    entry({
      providerSymbol: "SHIB-USD.CC",
      baseAsset: "SHIB",
      quoteAsset: "USD",
      displayPair: "SHIB/USD",
      name: "Shiba Inu",
    }),
    entry({
      providerSymbol: "SUSHI-USD.CC",
      baseAsset: "SUSHI",
      quoteAsset: "USD",
      displayPair: "SUSHI/USD",
      name: "Sushi",
    }),
    entry({
      providerSymbol: "BTC-USD.CC",
      baseAsset: "BTC",
      quoteAsset: "USD",
      displayPair: "BTC/USD",
      name: "Bitcoin",
    }),
    entry({
      providerSymbol: "ETH-USD.CC",
      baseAsset: "ETH",
      quoteAsset: "USD",
      displayPair: "ETH/USD",
      name: "Ethereum",
    }),
  ];

  it("finds SHIB and Shiba case-insensitively", () => {
    expect(searchCryptoCatalog(entries, "SHIB", "USD")[0]?.providerSymbol).toBe(
      "SHIB-USD.CC",
    );
    expect(searchCryptoCatalog(entries, "Shiba", "USD")[0]?.providerSymbol).toBe(
      "SHIB-USD.CC",
    );
  });

  it("finds SUSHI and Sushi generically", () => {
    expect(searchCryptoCatalog(entries, "SUSHI", "USD")[0]?.providerSymbol).toBe(
      "SUSHI-USD.CC",
    );
    expect(searchCryptoCatalog(entries, "Sushi", "USD")[0]?.providerSymbol).toBe(
      "SUSHI-USD.CC",
    );
  });

  it("ranks exact ticker above partial matches", () => {
    const results = searchCryptoCatalog(
      [
        ...entries,
        entry({
          providerSymbol: "1000SHIB-USD.CC",
          baseAsset: "1000SHIB",
          quoteAsset: "USD",
          displayPair: "1000SHIB/USD",
          name: "1000 Shiba Inu",
        }),
      ],
      "SHIB",
      "USD",
    );

    expect(results[0]?.baseAsset).toBe("SHIB");
  });

  it("finds full provider symbols and provider-style pairs", () => {
    expect(
      searchCryptoCatalog(entries, "SHIB-USD.CC", "USD")[0]?.providerSymbol,
    ).toBe("SHIB-USD.CC");
    expect(searchCryptoCatalog(entries, "SHIB-USD", "USD")[0]?.providerSymbol).toBe(
      "SHIB-USD.CC",
    );
  });

  it("resolves direct USD pairs and EUR conversion fallback correctly", () => {
    const shibUsd = resolveCryptoPairFromCatalog(
      new Map([[
        "SHIB",
        {
          baseAsset: "SHIB",
          name: "Shiba Inu",
          entriesByQuote: new Map([["USD", entries[0]!]]),
        },
      ]]),
      "SHIB",
      "USD",
    );
    expect(shibUsd.kind).toBe("direct");
    if (shibUsd.kind !== "direct") throw new Error("Expected direct");
    expect(shibUsd.providerSymbol).toBe("SHIB-USD.CC");

    const shibEur = resolveCryptoPairFromCatalog(
      new Map([[
        "SHIB",
        {
          baseAsset: "SHIB",
          name: "Shiba Inu",
          entriesByQuote: new Map([["USD", entries[0]!]]),
        },
      ]]),
      "SHIB",
      "EUR",
    );
    expect(shibEur.kind).toBe("converted");
    if (shibEur.kind !== "converted") throw new Error("Expected converted");
    expect(shibEur.providerSymbol).toBe("SHIB-USD.CC");
    expect(shibEur.conversionPath).toBe("USD/EUR");
  });

  it("applies a catalog result to a holding without a manual allowlist", () => {
    const result = searchCryptoCatalog(entries, "SHIB", "USD")[0]!;
    const updated = applyCryptoSearchResultToHolding(
      {
        id: "crypto-1",
        symbol: "SHIB",
        name: "Shib",
        quantity: 1,
        purchasePrice: 0,
        currentPrice: 0,
        currency: "EUR" as const,
        assetType: "crypto" as const,
      },
      result,
    );

    expect(updated.providerSymbol).toBe("SHIB-USD.CC");
    expect(updated.exchange).toBe("CC");
    expect(updated.pairCurrency).toBe("USD");
  });

  it("distinguishes covered and uncovered catalog members", () => {
    expect(isCryptoBaseAssetCoveredByCatalog(entries, "SHIB")).toBe(true);
    expect(isCryptoProviderSymbolSupportedByCatalog(entries, "SHIB-USD.CC")).toBe(true);
    expect(isCryptoBaseAssetCoveredByCatalog(entries, "MYST")).toBe(false);
    expect(isCryptoProviderSymbolSupportedByCatalog(entries, "MYST-USD.CC")).toBe(false);
  });
});

describe("cryptoCatalog caching", () => {
  beforeEach(() => {
    fetchExchangeSymbolListMock.mockReset();
  });

  it("deduplicates concurrent catalog refreshes", async () => {
    fetchExchangeSymbolListMock.mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                rows: [row({ Code: "SHIB-USD", Name: "Shiba Inu" })],
                source: "provider",
              }),
            10,
          ),
        ),
    );

    const [first, second] = await Promise.all([
      fetchCryptoCatalog(),
      fetchCryptoCatalog(),
    ]);

    expect(fetchExchangeSymbolListMock).toHaveBeenCalledTimes(1);
    expect(first.entries[0]?.providerSymbol).toBe("SHIB-USD.CC");
    expect(second.entries[0]?.providerSymbol).toBe("SHIB-USD.CC");
  });
});
