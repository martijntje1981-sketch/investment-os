import { describe, expect, it } from "vitest";

import {
  CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY,
  persistCanonicalCryptoQuote,
  type CanonicalQuoteClient,
  type PersistCanonicalCryptoQuoteDeps,
  type PersistCanonicalCryptoQuoteInput,
} from "@/lib/services/canonicalQuotes/persistCanonicalCryptoQuote";
import type { CanonicalCryptoQuoteRecord } from "@/lib/services/canonicalQuotes/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HOLDING_BTC = "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0";
const HOLDING_VWCE = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const CLIENT = {} as CanonicalQuoteClient;

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    holdingId: HOLDING_BTC,
    canonicalEurUnitPrice: 1,
    canonicalPricedAt: "2026-09-01T11:00:00.000Z",
    pairPrice: 1.1,
    pairCurrency: "USD",
    fxToEur: 0.9,
    fxAt: "2026-09-01T11:00:00.000Z",
    quoteUpdatedAt: "2026-09-01T11:00:00.000Z",
    fetchedAt: "2026-09-01T11:00:01.000Z",
    providerSymbol: "BTC-USD.CC",
    providerId: "eodhd-quotes",
    dataStatus: "live",
    estimateOnly: false,
    quoteKind: "crypto_market",
    ...overrides,
  };
}

function cryptoHolding(overrides: Record<string, unknown> = {}) {
  return {
    id: HOLDING_BTC,
    user_id: USER_A,
    asset_type: "crypto",
    symbol: "BTC",
    metadata: {
      pairCurrency: "USD",
      providerSymbol: "BTC-USD.CC",
      pricingStatus: "price_unavailable",
      tradingPair: "BTC/USD",
      portfolioCurrency: "EUR",
    },
    deleted_at: null,
    ...overrides,
  };
}

function createMemoryDeps(options?: {
  holding?: Record<string, unknown> | null;
  existing?: CanonicalCryptoQuoteRecord | null;
}): PersistCanonicalCryptoQuoteDeps & {
  inserted: Record<string, unknown>[];
  updated: Record<string, unknown>[];
} {
  const inserted: Record<string, unknown>[] = [];
  const updated: Record<string, unknown>[] = [];
  let existing = options?.existing ?? null;

  return {
    inserted,
    updated,
    loadOwnedHolding: async () =>
      (options?.holding === undefined
        ? cryptoHolding()
        : options.holding) as never,
    loadExistingQuote: async () => existing,
    insertQuote: async (_client, row) => {
      inserted.push(row);
      existing = {
        id: "quote-1",
        userId: USER_A,
        holdingId: String(row.holding_id),
        canonicalEurUnitPrice: Number(row.canonical_eur_unit_price),
        canonicalPricedAt: String(row.canonical_priced_at),
        pairPrice: Number(row.pair_price),
        pairCurrency: "USD",
        fxToEur: Number(row.fx_to_eur),
        fxAt: String(row.fx_at),
        quoteUpdatedAt: String(row.quote_updated_at),
        fetchedAt: String(row.fetched_at),
        providerSymbol: String(row.provider_symbol),
        providerId: "eodhd-quotes",
        dataStatus: "live",
        conversionPath: null,
        estimateOnly: false,
        quoteKind: "crypto_market",
        createdAt: "2026-09-01T11:00:02.000Z",
        updatedAt: "2026-09-01T11:00:02.000Z",
      };
      return existing;
    },
    updateQuote: async (_client, id, _userId, _holdingId, row) => {
      updated.push(row);
      existing = {
        ...(existing as CanonicalCryptoQuoteRecord),
        id,
        canonicalEurUnitPrice: Number(row.canonical_eur_unit_price),
        pairPrice: Number(row.pair_price),
        quoteUpdatedAt: String(row.quote_updated_at),
        fetchedAt: String(row.fetched_at),
        updatedAt: "2026-09-01T12:00:02.000Z",
      };
      return existing;
    },
  };
}

function trustedInput(
  overrides: Partial<PersistCanonicalCryptoQuoteInput> = {},
): PersistCanonicalCryptoQuoteInput {
  return {
    client: CLIENT,
    authority: CANONICAL_CRYPTO_QUOTE_WRITE_AUTHORITY,
    userId: USER_A,
    holdingId: HOLDING_BTC,
    candidate: candidate(),
    ...overrides,
  };
}

describe("persistCanonicalCryptoQuote", () => {
  it("creates a row after loading owned crypto identity from the database", async () => {
    const deps = createMemoryDeps();
    const result = await persistCanonicalCryptoQuote(trustedInput(), deps);
    expect(result.status).toBe("created");
    expect(deps.inserted).toHaveLength(1);
    expect(deps.inserted[0]?.user_id).toBe(USER_A);
    expect(deps.inserted[0]?.provider_symbol).toBe("BTC-USD.CC");
  });

  it("improves when a newer quote arrives", async () => {
    const deps = createMemoryDeps();
    await persistCanonicalCryptoQuote(trustedInput(), deps);
    const second = await persistCanonicalCryptoQuote(
      trustedInput({
        candidate: candidate({
          quoteUpdatedAt: "2026-09-01T12:00:00.000Z",
          fetchedAt: "2026-09-01T12:00:01.000Z",
          canonicalPricedAt: "2026-09-01T12:00:00.000Z",
          canonicalEurUnitPrice: 1.2,
        }),
      }),
      deps,
    );
    expect(second.status).toBe("improved");
    expect(deps.updated).toHaveLength(1);
  });

  it("skips an older quote", async () => {
    const deps = createMemoryDeps();
    await persistCanonicalCryptoQuote(trustedInput(), deps);
    const second = await persistCanonicalCryptoQuote(
      trustedInput({
        candidate: candidate({
          quoteUpdatedAt: "2026-09-01T10:00:00.000Z",
          fetchedAt: "2026-09-01T10:00:01.000Z",
          canonicalEurUnitPrice: 9,
        }),
      }),
      deps,
    );
    expect(second.status).toBe("skipped_stale");
    expect(deps.updated).toHaveLength(0);
  });

  it("rejects the wrong authority and a missing user", async () => {
    const deps = createMemoryDeps();
    await expect(
      persistCanonicalCryptoQuote(
        trustedInput({ authority: "browser" as never }),
        deps,
      ),
    ).resolves.toMatchObject({ status: "forbidden" });
    await expect(
      persistCanonicalCryptoQuote(trustedInput({ userId: "" }), deps),
    ).resolves.toMatchObject({ status: "forbidden" });
    expect(deps.inserted).toHaveLength(0);
  });

  it("forbids a holding that is not owned or not found", async () => {
    const deps = createMemoryDeps({ holding: null });
    const result = await persistCanonicalCryptoQuote(
      trustedInput({ userId: USER_B }),
      deps,
    );
    expect(result.status).toBe("forbidden");
  });

  it("does not persist listed holdings", async () => {
    const deps = createMemoryDeps({
      holding: {
        id: HOLDING_VWCE,
        user_id: USER_A,
        asset_type: "investment",
        symbol: "VWCE",
        metadata: {},
        deleted_at: null,
      },
    });
    const result = await persistCanonicalCryptoQuote(
      trustedInput({
        holdingId: HOLDING_VWCE,
        candidate: candidate({ holdingId: HOLDING_VWCE }),
      }),
      deps,
    );
    expect(result.status).toBe("skipped_invalid");
    expect(deps.inserted).toHaveLength(0);
  });

  it("rejects a provider symbol that does not match persisted metadata", async () => {
    const deps = createMemoryDeps();
    const result = await persistCanonicalCryptoQuote(
      trustedInput({
        candidate: candidate({ providerSymbol: "ETH-USD.CC" }),
      }),
      deps,
    );
    expect(result.status).toBe("skipped_invalid");
    expect(deps.inserted).toHaveLength(0);
  });

  it("ignores browser-supplied financial fields on the candidate", async () => {
    const deps = createMemoryDeps();
    const result = await persistCanonicalCryptoQuote(
      trustedInput({
        candidate: candidate({ purchasePrice: 90, last_market_price: 1 }),
      }),
      deps,
    );
    expect(result.status).toBe("skipped_invalid");
    expect(deps.inserted).toHaveLength(0);
  });
});
