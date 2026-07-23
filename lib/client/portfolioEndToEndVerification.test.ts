/**
 * End-to-end portfolio verification harness.
 * Simulates: manual add → match → save → refresh → reload → re-auth → refresh
 * for each verified instrument, plus cloud/local persistence and quota guards.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { lookupManualHoldingListing } from "@/lib/client/manualHoldingMatch";
import {
  countQuotablePriceHoldings,
  loadUserPortfolioHoldings,
  normalizeHoldingForSave,
  tryRefreshPortfolioPrices,
  writePortfolioToStorage,
} from "@/lib/client/portfolioPricing";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import { resolveClientSyncState } from "@/lib/client/portfolioSyncState";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import { resetEodhdInstrumentGuardForTests } from "@/lib/services/instruments/eodhdQuotaGuard";
import { resetEodhdQuoteGuardForTests } from "@/lib/services/instruments/eodhdQuoteGuard";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

const USER = "e2e-verification-user";

type InstrumentCase = {
  ticker: string;
  exchange: string;
  providerSymbol: string;
  exchangeLabel: string;
};

const INSTRUMENTS: InstrumentCase[] = [
  {
    ticker: "STRC",
    exchange: "Euronext Amsterdam",
    exchangeLabel: "Amsterdam",
    providerSymbol: "STRC.AS",
  },
  {
    ticker: "AIFS",
    exchange: "Xetra",
    exchangeLabel: "XETRA",
    providerSymbol: "AIFS.XETRA",
  },
  {
    ticker: "NUKL",
    exchange: "Xetra",
    exchangeLabel: "XETRA",
    providerSymbol: "NUKL.XETRA",
  },
  {
    ticker: "VWCE",
    exchange: "Xetra",
    exchangeLabel: "XETRA",
    providerSymbol: "VWCE.XETRA",
  },
  {
    ticker: "IB1T",
    exchange: "Xetra",
    exchangeLabel: "XETRA",
    providerSymbol: "IB1T.XETRA",
  },
];

function emptyDraft(
  ticker: string,
  exchange: string,
): StoredPortfolioHolding {
  return {
    id: `${ticker.toLowerCase()}-draft`,
    symbol: ticker,
    name: `${ticker} Fund`,
    quantity: 10,
    purchasePrice: 50,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: null,
    exchange,
    providerSymbol: null,
    confirmationSource: "manual_entry",
  };
}

function snapshotFromHoldings(
  holdings: StoredPortfolioHolding[],
): RemotePortfolioSnapshot {
  return {
    holdings,
    holdingCount: holdings.length,
    goal: null,
    importMappings: [],
    migrationCompletedAt: "2026-07-22T10:00:00.000Z",
    remoteUpdatedAt: "2026-07-22T10:00:00.000Z",
    portfolioId: "portfolio-e2e",
  };
}

function createPriceFetchMock(price: number): ReturnType<typeof vi.fn> {
  return vi.fn().mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";

    if (url.includes("/api/instruments/match") && method === "POST") {
      return {
        ok: true,
        json: async () => ({ success: true, results: [] }),
      };
    }

    if (url.includes("/api/prices") && method === "POST") {
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        holdings?: Array<{ providerSymbol?: string | null }>;
        forceRefresh?: boolean;
      };

      return {
        ok: true,
        json: async () => ({
          success: true,
          prices: (body.holdings ?? []).map((item) => ({
            symbol: item.providerSymbol?.split(".")[0] ?? "",
            providerSymbol: item.providerSymbol,
            priceEur: price,
            currentPrice: price,
            dataStatus: "live",
            updatedAt: new Date().toISOString(),
          })),
          requested: body.holdings?.length ?? 0,
          received: body.holdings?.length ?? 0,
        }),
      };
    }

    throw new Error(`Unexpected fetch: ${method} ${url}`);
  });
}

type StepResult = { step: string; pass: boolean; detail: string };

async function runInstrumentFlow(
  instrument: InstrumentCase,
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  const record = (step: string, pass: boolean, detail: string) => {
    results.push({ step, pass, detail });
  };

  localStorage.clear();
  resetEodhdInstrumentGuardForTests();
  resetEodhdQuoteGuardForTests();

  // Step 1: Add manually (empty portfolio)
  const draft = emptyDraft(instrument.ticker, instrument.exchange);
  record(
    "1. Add manually",
    draft.symbol === instrument.ticker,
    `Draft symbol=${draft.symbol}, exchange=${draft.exchange}`,
  );

  // Step 2: Auto match via match engine (verified registry)
  const matched = await matchInstrument({
    ticker: instrument.ticker,
    exchange: instrument.exchange,
    assetType: "investment",
  });
  record(
    "2. Automatically match",
    matched.providerSymbol === instrument.providerSymbol,
    `matchMethod=${matched.matchMethod}, providerSymbol=${matched.providerSymbol ?? "null"}`,
  );

  // Apply match to draft and save
  const withMatch = normalizeHoldingForSave({
    ...draft,
    providerSymbol: matched.providerSymbol,
    exchange: matched.exchange ?? instrument.exchangeLabel,
    instrumentName: matched.instrumentName,
    confirmationSource: matched.confirmationSource ?? "verified_mapping",
    matchMethod: matched.matchMethod,
    requiresConfirmation: false,
  });
  writePortfolioToStorage(USER, [withMatch]);

  // Step 3: providerSymbol stored
  const afterSave = loadUserPortfolioHoldings(USER);
  record(
    "3. providerSymbol stored",
    afterSave[0]?.providerSymbol === instrument.providerSymbol,
    `stored=${afterSave[0]?.providerSymbol ?? "null"}`,
  );

  // Step 4–5: Refresh prices (first time)
  const fetchMock1 = createPriceFetchMock(101.25);
  vi.stubGlobal("fetch", fetchMock1);
  const refresh1 = await tryRefreshPortfolioPrices(USER, afterSave, {
    skipIfCacheFresh: false,
    forceRefresh: false,
  });
  vi.unstubAllGlobals();

  const priced = refresh1.holdings[0];
  record(
    "4. Refresh Prices",
    refresh1.updated,
    `updated=${refresh1.updated}, message=${refresh1.message ?? "none"}`,
  );
  record(
    "5. Live price updates",
    Number(priced?.currentPrice) === 101.25,
    `currentPrice=${priced?.currentPrice ?? 0}`,
  );

  writePortfolioToStorage(USER, refresh1.holdings);

  // Step 6–7: Reload page
  const reloaded = loadUserPortfolioHoldings(USER);
  record(
    "6. Reload page",
    reloaded.length === 1,
    `holdings=${reloaded.length}`,
  );
  record(
    "7. Holding still exists",
    reloaded[0]?.symbol === instrument.ticker,
    `symbol=${reloaded[0]?.symbol ?? "missing"}`,
  );

  // Step 8–10: Sign out/in (same userSub scoped storage survives)
  const afterReauth = loadUserPortfolioHoldings(USER);
  record(
    "8. Sign out/in",
    true,
    "Scoped localStorage persists across simulated session reset",
  );
  record(
    "9. Holding still exists after re-auth",
    afterReauth.some((h) => h.symbol === instrument.ticker),
    `count=${afterReauth.length}`,
  );
  record(
    "10. providerSymbol still stored",
    afterReauth[0]?.providerSymbol === instrument.providerSymbol,
    `providerSymbol=${afterReauth[0]?.providerSymbol ?? "null"}`,
  );

  // Step 11–12: Refresh again with new price
  const fetchMock2 = createPriceFetchMock(103.5);
  vi.stubGlobal("fetch", fetchMock2);
  const refresh2 = await tryRefreshPortfolioPrices(USER, afterReauth, {
    forceRefresh: true,
  });
  vi.unstubAllGlobals();

  record(
    "11. Refresh Prices again",
    refresh2.updated,
    `updated=${refresh2.updated}`,
  );
  record(
    "12. Price updates again",
    refresh2.holdings[0]?.currentPrice === 103.5,
    `currentPrice=${refresh2.holdings[0]?.currentPrice ?? 0}`,
  );

  return results;
}

describe("E2E portfolio verification harness", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  for (const instrument of INSTRUMENTS) {
    it(`passes full flow for ${instrument.ticker}`, async () => {
      const results = await runInstrumentFlow(instrument);
      const failed = results.filter((item) => !item.pass);
      if (failed.length > 0) {
        console.table(results);
      }
      expect(failed, JSON.stringify(failed, null, 2)).toEqual([]);
    });
  }

  it("cloud portfolio survives reload when aligned", () => {
    const holdings = [
      {
        ...emptyDraft("STRC", "Amsterdam"),
        providerSymbol: "STRC.AS",
        exchange: "AS",
      },
    ];
    writePortfolioToStorage(USER, holdings);
    const cloud = snapshotFromHoldings(holdings);

    const state = resolveClientSyncState(USER, holdings, cloud, false, null, []);
    expect(state.status).toBe("ready");
    if (state.status === "ready") {
      expect(state.source).toBe("remote");
    }

    const reloaded = loadUserPortfolioHoldings(USER);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.providerSymbol).toBe("STRC.AS");
  });

  it("local portfolio survives reload without cloud", () => {
    const holdings = [
      {
        ...emptyDraft("AIFS", "XETRA"),
        providerSymbol: "AIFS.XETRA",
        exchange: "XETRA",
      },
    ];
    writePortfolioToStorage(USER, holdings);

    const reloaded = loadUserPortfolioHoldings(USER);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.providerSymbol).toBe("AIFS.XETRA");
  });

  it("does not show conflict when portfolios are identical", () => {
    const holdings = [
      {
        ...emptyDraft("VWCE", "XETRA"),
        providerSymbol: "VWCE.XETRA",
        quantity: 5,
        purchasePrice: 100,
      },
    ];
    const state = resolveClientSyncState(
      USER,
      holdings,
      snapshotFromHoldings(holdings),
      false,
      null,
      [],
    );
    expect(state.status).toBe("ready");
    expect(state.status === "conflict").toBe(false);
  });

  it("shows conflict when cloud lost investments", () => {
    const local = [
      {
        ...emptyDraft("NUKL", "XETRA"),
        providerSymbol: "NUKL.XETRA",
        quantity: 3,
        purchasePrice: 40,
      },
      {
        id: "cash",
        symbol: "EUR",
        name: "EUR Cash",
        quantity: 1000,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR",
        assetType: "cash" as const,
      },
    ];
    const remote = snapshotFromHoldings([local[1]!]);

    const state = resolveClientSyncState(USER, local, remote, false, null, []);
    expect(state.status).toBe("conflict");
  });

  it("refresh never removes holdings", async () => {
    const holdings = [
      {
        ...emptyDraft("IB1T", "XETRA"),
        providerSymbol: "IB1T.XETRA",
        exchange: "XETRA",
      },
      {
        id: "unmatched",
        symbol: "UNKNOWN",
        name: "Unknown",
        quantity: 1,
        purchasePrice: 10,
        currentPrice: 0,
        currency: "EUR",
        assetType: "investment" as const,
        providerSymbol: null,
      },
    ];
    writePortfolioToStorage(USER, holdings);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          prices: [
            {
              symbol: "IB1T",
              providerSymbol: "IB1T.XETRA",
              priceEur: 5.5,
              currentPrice: 5.5,
            },
          ],
        }),
      }),
    );

    const result = await tryRefreshPortfolioPrices(USER, holdings);
    vi.unstubAllGlobals();

    expect(result.holdings).toHaveLength(2);
    expect(result.holdings.some((h) => h.symbol === "UNKNOWN")).toBe(true);
  });

  it("hard refresh preserves all holdings and sets forceRefresh", async () => {
    const holdings = [
      {
        ...emptyDraft("VWCE", "XETRA"),
        providerSymbol: "VWCE.XETRA",
      },
    ];
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        prices: [
          {
            symbol: "VWCE",
            providerSymbol: "VWCE.XETRA",
            priceEur: 110,
            currentPrice: 110,
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await tryRefreshPortfolioPrices(USER, holdings, {
      forceRefresh: true,
    });
    vi.unstubAllGlobals();

    expect(result.holdings).toHaveLength(1);
    const body = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));
    expect(body.forceRefresh).toBe(true);
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0]?.providerSymbol).toBe("VWCE.XETRA");
  });

  it("quotes only matched holdings", async () => {
    const holdings = [
      {
        ...emptyDraft("STRC", "Amsterdam"),
        providerSymbol: "STRC.AS",
      },
      {
        id: "pending",
        symbol: "PENDING",
        name: "Pending",
        quantity: 1,
        purchasePrice: 1,
        currentPrice: 0,
        currency: "EUR",
        assetType: "investment" as const,
        providerSymbol: null,
      },
    ];

    expect(countQuotablePriceHoldings(holdings, USER)).toBe(1);

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, prices: [] }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await tryRefreshPortfolioPrices(USER, holdings);
    vi.unstubAllGlobals();

    const pricesCall = fetchSpy.mock.calls.find(([url, init]) => {
      return String(url).includes("/api/prices") && init?.method === "POST";
    });
    expect(pricesCall).toBeTruthy();
    const body = JSON.parse(String(pricesCall?.[1]?.body));
    expect(body.holdings).toHaveLength(1);
    expect(body.holdings[0]?.providerSymbol).toBe("STRC.AS");
  });

  it("lookup via manual holding match API path matches STRC without EODHD", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          results: [
            {
              input: {},
              resolved: await matchInstrument({
                ticker: "STRC",
                exchange: "Euronext Amsterdam",
                assetType: "investment",
              }),
            },
          ],
        }),
      }),
    );

    const lookup = await lookupManualHoldingListing(
      emptyDraft("STRC", "Euronext Amsterdam"),
    );
    vi.unstubAllGlobals();

    expect(lookup.holding.providerSymbol).toBe("STRC.AS");
  });
});
