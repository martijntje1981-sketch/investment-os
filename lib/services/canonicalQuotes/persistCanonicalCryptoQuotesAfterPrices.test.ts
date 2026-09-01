import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { CanonicalQuoteClient } from "@/lib/services/canonicalQuotes/persistCanonicalCryptoQuote";
import { persistCanonicalCryptoQuotesAfterPrices } from "@/lib/services/canonicalQuotes/persistCanonicalCryptoQuotesAfterPrices";
import type { PersistCanonicalCryptoQuoteResult } from "@/lib/services/canonicalQuotes/types";
import { resolveProductAccess } from "@/lib/services/productAccess";
import type { HoldingPrice, PriceHoldingInput, PricePayload } from "@/lib/services/prices/types";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const HOLDING_BTC = "c0c0c0c0-c0c0-40c0-80c0-c0c0c0c0c0c0";
const HOLDING_B = "bbbbbbbb-cccc-4ccc-8ccc-cccccccccccc";
const HOLDING_VWCE = "a1a1a1a1-a1a1-41a1-81a1-a1a1a1a1a1a1";
const QUOTE_CLIENT = {} as CanonicalQuoteClient;

const personalAccess = resolveProductAccess({ exampleKind: "none" });
const demoAccess = resolveProductAccess({ exampleKind: "active" });
const personalTrialAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "personal",
  expiresAt: "2099-01-01T00:00:00.000Z",
  daysRemaining: 11,
});

function user(id = USER_A): User {
  return { id } as User;
}

function enabledEnv(): NodeJS.ProcessEnv {
  return { CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED: "true" };
}

function btcPrice(): HoldingPrice {
  return {
    symbol: "BTC",
    eodhdSymbol: "BTC-USD.CC",
    providerSymbol: "BTC-USD.CC",
    isin: null,
    name: "Bitcoin",
    originalCurrency: "USD",
    originalPrice: 95_000,
    baseCurrency: "EUR",
    exchangeRateToEur: null,
    priceEur: 87_400,
    currentPrice: 87_400,
    previousCloseOriginal: null,
    previousCloseEur: null,
    previousClose: null,
    change: null,
    changePercent: 1,
    currency: "USD",
    dataStatus: "live",
    cacheStatus: "fresh",
    provider: "eodhd",
    isStale: false,
    unavailableReason: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    timestamp: null,
    updatedAt: "2026-09-01T11:00:00.000Z",
    fetchedAt: "2026-09-01T11:00:01.000Z",
    assetType: "crypto",
    pairPrice: 95_000,
    crypto: {
      assetType: "crypto",
      baseAsset: "BTC",
      quoteCurrency: "USD",
      normalizedPair: "BTC/USD",
      pairPrice: 95_000,
      change24hPercent: 1,
      sourcePair: "BTC/USD",
      conversionApplied: false,
      conversionPath: null,
      providerId: "eodhd-quotes",
      providerDisplayName: "EODHD",
      fetchedAt: "2026-09-01T11:00:01.000Z",
      unavailableReason: null,
    },
  };
}

function vwcePrice(): HoldingPrice {
  return {
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
    changePercent: 1,
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
    updatedAt: "2026-09-01T10:00:00.000Z",
    assetType: "investment",
  };
}

function payload(overrides: Partial<PricePayload> = {}): PricePayload {
  return {
    success: true,
    baseCurrency: "EUR",
    fxRates: {
      EUR: 1,
      USD_TO_EUR: 0.92,
      GBP_TO_EUR: 1.17,
      CHF_TO_EUR: 1.05,
    },
    prices: [btcPrice()],
    errors: [],
    requested: 1,
    received: 1,
    generatedAt: "2026-09-01T11:00:02.000Z",
    cache: { enabled: true, durationSeconds: 720 },
    quoteSource: "provider",
    ...overrides,
  };
}

function persistResult(
  status: PersistCanonicalCryptoQuoteResult["status"],
): PersistCanonicalCryptoQuoteResult {
  return { status, record: null, message: status };
}

describe("persistCanonicalCryptoQuotesAfterPrices", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not createAdminClient or call the writer when the flag is absent", async () => {
    const getSessionUser = vi.fn();
    const resolveProductAccess = vi.fn();
    const createQuoteClient = vi.fn();
    const persistQuote = vi.fn();
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: {},
      getSessionUser,
      resolveProductAccess,
      createQuoteClient,
      persistQuote,
    });
    expect(aggregate.skipped_disabled).toBe(1);
    expect(getSessionUser).not.toHaveBeenCalled();
    expect(resolveProductAccess).not.toHaveBeenCalled();
    expect(createQuoteClient).not.toHaveBeenCalled();
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("does not write unauthenticated requests", async () => {
    const createQuoteClient = vi.fn();
    const persistQuote = vi.fn();
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => null,
      createQuoteClient,
      persistQuote,
    });
    expect(aggregate.skipped_unauthenticated).toBe(1);
    expect(createQuoteClient).not.toHaveBeenCalled();
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("does not write Demo or unresolved access", async () => {
    const createQuoteClient = vi.fn();
    const persistQuote = vi.fn();
    const demo = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => demoAccess,
      createQuoteClient,
      persistQuote,
    });
    expect(demo.skipped_demo).toBe(1);
    expect(createQuoteClient).not.toHaveBeenCalled();
    expect(persistQuote).not.toHaveBeenCalled();

    const unresolved = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => ({
        ...personalAccess,
        isDemo: undefined as never,
        tier: "unknown" as never,
      }),
      createQuoteClient,
      persistQuote,
    });
    expect(unresolved.skipped_unresolved).toBe(1);
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("allows a personal Complete trial to write after identity and access checks", async () => {
    const order: string[] = [];
    const persistQuote = vi.fn(async (input) => {
      order.push("persist");
      expect(input.userId).toBe(USER_A);
      expect(input.holdingId).toBe(HOLDING_BTC);
      expect(input.authority).toBe("trusted_server");
      expect(input.candidate).toMatchObject({
        pairPrice: 95_000,
        fxToEur: 0.92,
        canonicalEurUnitPrice: 95_000 * 0.92,
      });
      return persistResult("created");
    });
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => {
        order.push("session");
        return user();
      },
      resolveProductAccess: async () => {
        order.push("access");
        return personalTrialAccess;
      },
      createQuoteClient: () => {
        order.push("admin");
        return QUOTE_CLIENT;
      },
      persistQuote,
    });
    expect(order).toEqual(["session", "access", "admin", "persist"]);
    expect(aggregate.created).toBe(1);
  });

  it("ignores request-body financial fields and uses the PriceService quote + FX", async () => {
    const persistQuote = vi.fn(async (input) => {
      expect(input.candidate).not.toHaveProperty("purchasePrice");
      expect(input.candidate).not.toHaveProperty("last_market_price");
      expect(input.candidate).not.toHaveProperty("currentPrice");
      expect(input.candidate.canonicalEurUnitPrice).toBe(95_000 * 0.92);
      return persistResult("created");
    });
    const holdings: Array<PriceHoldingInput & Record<string, unknown>> = [
      {
        id: HOLDING_BTC,
        symbol: "BTC",
        providerSymbol: "BTC-USD.CC",
        purchasePrice: 12,
        last_market_price: 9,
        currentPrice: 3,
        priceEur: 4,
        userId: USER_B,
      },
    ];
    await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: holdings,
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(persistQuote).toHaveBeenCalledOnce();
  });

  it("rejects a cross-user or cross-portfolio holding id via the session-scoped writer", async () => {
    const persistQuote = vi.fn(async (input) => {
      expect(input.userId).toBe(USER_A);
      expect(input.holdingId).toBe(HOLDING_B);
      return persistResult("forbidden");
    });
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({
        prices: [
          {
            ...btcPrice(),
            symbol: "ETH",
            providerSymbol: "ETH-USD.CC",
          },
        ],
      }),
      requestHoldings: [
        { id: HOLDING_B, symbol: "ETH", providerSymbol: "ETH-USD.CC" },
      ],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(aggregate.forbidden).toBe(1);
    expect(persistQuote).toHaveBeenCalledOnce();
  });

  it("does not persist listed holdings", async () => {
    const persistQuote = vi.fn();
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({ prices: [vwcePrice()], quoteSource: "provider" }),
      requestHoldings: [
        { id: HOLDING_VWCE, symbol: "VWCE", providerSymbol: "VWCE.XETRA" },
      ],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(aggregate.skipped_invalid).toBe(1);
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("skips cache-only PriceService results", async () => {
    const persistQuote = vi.fn();
    const createQuoteClient = vi.fn();
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({ quoteSource: "cache", refreshSummary: { estimateOnly: false } as never }),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      createQuoteClient,
      persistQuote,
    });
    expect(aggregate.skipped_cache).toBe(1);
    expect(createQuoteClient).not.toHaveBeenCalled();
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("uses request provider-call proof when shared quoteSource is cache", async () => {
    const persistQuote = vi.fn(async () => ({ status: "created" as const }));
    const createQuoteClient = vi.fn(() => QUOTE_CLIENT);
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({
        quoteSource: "cache",
        refreshSummary: {
          estimateOnly: false,
          providerCallsMade: 10,
        } as never,
      }),
      requestHoldings: [
        { id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" },
      ],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient,
      persistQuote,
    });

    expect(aggregate.created).toBe(1);
    expect(aggregate.skipped_cache).toBe(0);
    expect(createQuoteClient).toHaveBeenCalledTimes(1);
    expect(persistQuote).toHaveBeenCalledTimes(1);
  });
  it("skips estimate-only results even when quoteSource is provider", async () => {
    const persistQuote = vi.fn();
    const createQuoteClient = vi.fn();
    const fromBody = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({ quoteSource: "provider" }),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      estimateOnly: true,
      env: enabledEnv(),
      getSessionUser: async () => user(),
      createQuoteClient,
      persistQuote,
    });
    expect(fromBody.skipped_estimate).toBe(1);
    expect(persistQuote).not.toHaveBeenCalled();

    const fromSummary = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({
        quoteSource: "provider",
        refreshSummary: { estimateOnly: true } as never,
      }),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      estimateOnly: false,
      env: enabledEnv(),
      getSessionUser: async () => user(),
      createQuoteClient,
      persistQuote,
    });
    expect(fromSummary.skipped_estimate).toBe(1);
    expect(persistQuote).not.toHaveBeenCalled();
  });

  it("reaches the writer on a live phase with estimateOnly false", async () => {
    const persistQuote = vi.fn(async () => persistResult("created"));
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload({
        quoteSource: "provider",
        refreshSummary: { estimateOnly: false } as never,
      }),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      estimateOnly: false,
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(aggregate.skipped_estimate).toBe(0);
    expect(aggregate.created).toBe(1);
    expect(persistQuote).toHaveBeenCalledOnce();
  });

  it("does not fail the caller when the writer throws", async () => {
    const persistQuote = vi.fn(async () => {
      throw new Error("db unavailable");
    });
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(aggregate.error).toBe(1);
  });

  it("records skipped_stale when an older candidate cannot overwrite a newer quote", async () => {
    const persistQuote = vi.fn(async () => persistResult("skipped_stale"));
    const aggregate = await persistCanonicalCryptoQuotesAfterPrices({
      payload: payload(),
      requestHoldings: [{ id: HOLDING_BTC, symbol: "BTC", providerSymbol: "BTC-USD.CC" }],
      env: enabledEnv(),
      getSessionUser: async () => user(),
      resolveProductAccess: async () => personalAccess,
      createQuoteClient: () => QUOTE_CLIENT,
      persistQuote,
    });
    expect(aggregate.skipped_stale).toBe(1);
    expect(aggregate.created).toBe(0);
  });
});

describe("C2 persist wiring sources", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  function read(rel: string): string {
    return readFileSync(path.join(repoRoot, rel), "utf8");
  }

  it("does not call PriceService, EODHD, or FX from the persist path", () => {
    const persistAfter = read(
      "lib/services/canonicalQuotes/persistCanonicalCryptoQuotesAfterPrices.ts",
    );
    const builder = read(
      "lib/services/canonicalQuotes/buildCanonicalCryptoQuoteCandidate.ts",
    );
    expect(persistAfter).not.toContain("loadPricesForHoldings");
    expect(persistAfter).not.toContain("loadDefaultWatchlistPrices");
    expect(persistAfter).not.toContain("getFxRates");
    expect(persistAfter).not.toContain("eodhdMarketDataProvider");
    expect(builder).not.toContain("loadPricesForHoldings");
    expect(builder).not.toContain("eodhdMarketDataProvider");
    expect(builder).not.toContain("getQuote(");
  });

  it("stamps live and cache-first phases as estimateOnly false after estimate spreads", () => {
    const priceService = read("lib/services/prices/priceService.ts");
    const liveSummary = priceService.slice(
      priceService.indexOf("const refreshSummary: PriceRefreshSummary"),
    );
    expect(liveSummary).toContain("estimateOnly: false");
    expect(priceService).toMatch(
      /if \(options\?\.estimateOnly\) \{[\s\S]*estimateOnly: true,/,
    );
  });

  it("never exposes the flag as NEXT_PUBLIC and does not set it in vercel.json", () => {
    const flag = read(
      "lib/services/canonicalQuotes/canonicalCryptoQuotePersistenceFlag.ts",
    );
    const route = read("app/api/prices/route.ts");
    const vercel = read("vercel.json");
    expect(flag).not.toContain("NEXT_PUBLIC_CANONICAL_CRYPTO");
    expect(flag).not.toMatch(/process\.env\.NEXT_PUBLIC_/);
    expect(route).not.toContain("NEXT_PUBLIC_CANONICAL_CRYPTO");
    expect(vercel).not.toContain("CANONICAL_CRYPTO_QUOTE_PERSISTENCE_ENABLED");
  });
});
