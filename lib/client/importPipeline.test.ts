import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  analyzePortfolioScreenshot,
  matchImportRowsViaApi,
  runImportPipeline,
} from "@/lib/client/importMatchClient";
import { saveImportedPortfolio } from "@/lib/client/importSavePortfolio";
import {
  loadUserPortfolioHoldings,
  tryRefreshPortfolioPrices,
} from "@/lib/client/portfolioPricing";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import { resetEodhdQuotaGuardForTests } from "@/lib/services/instruments/eodhdQuotaGuard";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";
import { resetProviderCircuitForTests } from "@/lib/services/marketData/providerCircuitBreaker";
import {
  EodhdProviderError,
  fetchIdMapping,
} from "@/lib/services/instruments/eodhdClient";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import { annotateImportRow } from "@/lib/services/import/confidencePolicy";
import type { ImportRow } from "@/lib/services/import/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

vi.mock("@/lib/services/instruments/eodhdClient", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/instruments/eodhdClient")
  >();
  return {
    ...actual,
    fetchIdMapping: vi.fn(),
    fetchSearch: vi.fn(),
  };
});

vi.mock("@/lib/client/portfolioSyncApi", () => ({
  pushPortfolioToRemote: vi.fn(),
}));

import { pushPortfolioToRemote } from "@/lib/client/portfolioSyncApi";

const USER = "import-test-user";

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return annotateImportRow({
    id: "row-1",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 0,
    assetType: "investment",
    isin: "IE00BK5BQT80",
    exchange: "XETRA",
    ...overrides,
  });
}

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? "holding-1",
    symbol: overrides.symbol,
    name: overrides.name ?? `${overrides.symbol} Fund`,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 0,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    isin: overrides.isin ?? null,
    priceDataStatus: overrides.priceDataStatus,
  };
}
function remoteSnapshot(holdings: StoredPortfolioHolding[]) {
  return {
    holdings,
    goal: null,
    importMappings: [],
    migrationCompletedAt: null,
    remoteUpdatedAt: "2026-07-20T12:00:00.000Z",
    portfolioId: "portfolio-1",
    holdingCount: holdings.length,
  };
}

describe("instrument matching under EODHD quota failure", () => {
  beforeEach(() => {
    resetEodhdQuotaGuardForTests();
    resetEodhdDailyQuotaForTests();
    resetProviderCircuitForTests();
    vi.mocked(fetchIdMapping).mockReset();
  });

  it("returns unresolved holdings instead of throwing on 402", async () => {
    vi.mocked(fetchIdMapping).mockRejectedValue(
      new EodhdProviderError(402, "EODHD id-mapping returned 402: quota"),
    );

    const resolved = await matchInstrument({
      ticker: null,
      isin: "IE00B4L5Y983",
      exchange: "XETRA",
      instrumentName: "Unknown Fund",
      assetType: "investment",
    });

    expect(resolved.matchMethod).toBe("unresolved");
    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.warnings.join(" ")).toMatch(/temporarily unavailable/i);
  });

  it("still matches verified ISINs locally when EODHD returns 402", async () => {
    vi.mocked(fetchIdMapping).mockRejectedValue(
      new EodhdProviderError(402, "EODHD id-mapping returned 402: quota"),
    );

    const resolved = await matchInstrument({
      ticker: null,
      isin: "IE00BK5BQT80",
      exchange: "XETRA",
      instrumentName: "Vanguard FTSE All-World",
      assetType: "investment",
    });

    expect(resolved.matchMethod).toBe("isin");
    expect(resolved.providerSymbol).toBe("VWCE.XETRA");
    expect(fetchIdMapping).not.toHaveBeenCalled();
  });

  it("skips further EODHD calls in the same session after 402", async () => {
    vi.mocked(fetchIdMapping).mockRejectedValue(
      new EodhdProviderError(402, "EODHD id-mapping returned 402: quota"),
    );

    await matchInstrument({
      ticker: null,
      isin: "IE00B4L5Y983",
      exchange: "XETRA",
      instrumentName: "Unknown Fund",
      assetType: "investment",
    });

    await matchInstrument({
      ticker: "IWDA",
      isin: null,
      exchange: "XETRA",
      instrumentName: "iShares Core MSCI World",
      assetType: "investment",
    });

    expect(fetchIdMapping).toHaveBeenCalledTimes(1);
  });
});

describe("screenshot import pipeline decoupled from pricing", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reaches review with extracted rows when match API reports provider quota", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/analyze-portfolio")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              broker: "DEGIRO",
              holdings: [
                {
                  name: "Vanguard FTSE All-World",
                  ticker: "VWCE",
                  isin: "IE00BK5BQT80",
                  exchange: "XETRA",
                  assetType: "investment",
                  quantity: 10,
                  purchasePrice: 100,
                  currentPrice: null,
                  marketValue: null,
                  purchaseDate: null,
                  currency: "EUR",
                  fieldConfidence: {},
                  extractionConfidence: 0.95,
                  warnings: [],
                  normalizationNotes: [],
                },
              ],
            }),
          };
        }

        if (url.includes("/api/instruments/match")) {
          return {
            ok: false,
            json: async () => ({
              success: false,
              message: "EODHD id-mapping returned 402: payment required",
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const result = await runImportPipeline({
      source: "screenshot",
      file: new File(["x"], "portfolio.png", { type: "image/png" }),
      userSub: USER,
      parseSpreadsheet: () => [],
      applySavedMappings: (rows) => rows,
    });

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.symbol).toBe("VWCE");
    expect(result.matchQuotaWarning).toMatch(/temporarily unavailable/i);

    const priceCalls = vi
      .mocked(fetch)
      .mock.calls.filter(([url]) => String(url).includes("/api/prices"));
    expect(priceCalls).toHaveLength(0);
  });

  it("fails import processing when AI extraction fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({
          success: false,
          message: "No clear positions were found.",
        }),
      }),
    );

    await expect(
      analyzePortfolioScreenshot(
        new File(["x"], "portfolio.png", { type: "image/png" }),
      ),
    ).rejects.toThrow(/No clear positions were found/);
  });

  it("keeps unmatched rows for review without calling prices", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/instruments/match")) {
          return {
            ok: true,
            json: async () => ({
              success: true,
              results: [
                {
                  input: {
                    ticker: "VWCE",
                    isin: "IE00BK5BQT80",
                    exchange: "XETRA",
                    instrumentName: "Vanguard FTSE All-World",
                    assetType: "investment",
                  },
                  resolved: {
                    providerSymbol: null,
                    instrumentName: null,
                    exchange: null,
                    isin: "IE00BK5BQT80",
                    matchMethod: "unresolved",
                    confidence: 0,
                    requiresConfirmation: true,
                    warnings: ["Instrument lookup is temporarily unavailable"],
                  },
                },
              ],
            }),
          };
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const matched = await matchImportRowsViaApi([importRow()]);
    expect(matched.rows[0]?.reviewTier).toBe("review");
    expect(
      vi
        .mocked(fetch)
        .mock.calls.some(([url]) => String(url).includes("/api/prices")),
    ).toBe(false);
  });
});

describe("import save persistence decoupled from live prices", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves holdings when cloud push succeeds but price refresh hits 402", async () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
        priceDataStatus: "unavailable",
      }),
    ];

    vi.mocked(pushPortfolioToRemote).mockResolvedValue({
      ok: true,
      snapshot: remoteSnapshot(holdings),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          success: false,
          error: "EODHD returned 402: payment required",
        }),
      }),
    );

    const result = await saveImportedPortfolio({ userSub: USER, holdings });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.priceWarning).toMatch(/Live prices are temporarily unavailable/i);
    }

    const reloaded = loadUserPortfolioHoldings(USER);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.symbol).toBe("VWCE");
    expect(reloaded[0]?.currentPrice).toBe(0);
    expect(localStorage.getItem(portfolioStorageKey(USER))).toContain("VWCE");
  });

  it("fails import when cloud portfolio save fails", async () => {
    vi.mocked(pushPortfolioToRemote).mockResolvedValue({
      ok: false,
      error: "Cloud sync failed.",
      retryable: true,
    });

    const result = await saveImportedPortfolio({
      userSub: USER,
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World",
        }),
      ],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe("cloud_save");
    }
    expect(localStorage.getItem(portfolioStorageKey(USER))).toBeNull();
  });

  it("keeps holdings after reload when provider times out during price refresh", async () => {
    const holdings = [
      holding({
        symbol: "STRC",
        name: "Strategy Inc",
        providerSymbol: "STRC.AS",
      }),
    ];

    vi.mocked(pushPortfolioToRemote).mockResolvedValue({
      ok: true,
      snapshot: remoteSnapshot(holdings),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );

    const saved = await saveImportedPortfolio({ userSub: USER, holdings });
    expect(saved.ok).toBe(true);

    const afterReload = JSON.parse(
      localStorage.getItem(portfolioStorageKey(USER)) ?? "[]",
    );
    expect(afterReload).toHaveLength(1);
    expect(afterReload[0]?.symbol).toBe("STRC");

    const refresh = await tryRefreshPortfolioPrices(USER, afterReload);
    expect(refresh.updated).toBe(false);
    expect(loadUserPortfolioHoldings(USER)[0]?.symbol).toBe("STRC");
  });

  it("persists cloud snapshot locally for another-device reload", async () => {
    const cloudHoldings = [
      holding({
        id: "cloud-id-1",
        symbol: "VWCE",
        name: "Vanguard FTSE All-World",
        quantity: 12,
        purchasePrice: 98,
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
      }),
    ];

    vi.mocked(pushPortfolioToRemote).mockResolvedValue({
      ok: true,
      snapshot: remoteSnapshot(cloudHoldings),
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ success: false, error: "EODHD returned 402" }),
      }),
    );

    await saveImportedPortfolio({ userSub: USER, holdings: cloudHoldings });

    const deviceReload = loadUserPortfolioHoldings(USER);
    expect(deviceReload[0]?.quantity).toBe(12);
    expect(deviceReload[0]?.id).toBe("cloud-id-1");
  });
});
