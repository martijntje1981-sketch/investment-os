import { describe, expect, it, vi } from "vitest";

import {
  portfolioFingerprint,
  portfoliosPersistedMatch,
} from "@/lib/services/portfolio/idempotency";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { verifyPersistedPortfolioSnapshot } from "@/lib/services/portfolio/syncVerification";
import type { PortfolioRepository } from "@/lib/services/portfolio/repository";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

const USER_ID = "11111111-1111-4111-8111-111111111111";

function holding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "local-holding-id",
    symbol: "VWCE",
    name: "Vanguard FTSE All-World",
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: "VWCE.XETRA",
    isin: "IE00BK5BQT80",
    exchange: "XETRA",
    ...overrides,
  };
}

describe("portfoliosPersistedMatch", () => {
  it("matches holdings in different order", () => {
    const first = [
      holding({ id: "a", symbol: "VWCE" }),
      holding({ id: "b", symbol: "STRC", providerSymbol: "STRC.AS", isin: "NL0015001K93" }),
    ];
    const second = [first[1]!, first[0]!];

    expect(portfoliosPersistedMatch(first, second)).toBe(true);
  });

  it("ignores generated ids, timestamps, and market metadata", () => {
    const written = [holding()];
    const readBack = [
      holding({
        id: "22222222-2222-4222-8222-222222222222",
        updatedAt: "2026-07-22T09:00:00.000Z",
        currentPrice: 999,
        marketPriceUpdatedAt: "2026-07-22T09:00:00.000Z",
        priceDataStatus: "live",
      }),
    ];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(true);
  });

  it("normalizes null, undefined, and invalid isin representations", () => {
    const written = [
      holding({
        isin: undefined,
        providerSymbol: "AIFS.XETRA",
        symbol: "AIFS",
      }),
    ];
    const readBack = [
      holding({
        isin: null,
        providerSymbol: "AIFS.XETRA",
        symbol: "AIFS",
      }),
    ];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(true);
  });

  it("normalizes providerSymbol casing before comparison", () => {
    const written = [holding({ providerSymbol: "vwce.xetra" })];
    const readBack = [holding({ providerSymbol: "VWCE.XETRA" })];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(true);
  });

  it("allows harmless read-back enrichment when written holding had no providerSymbol", () => {
    const written = [
      holding({
        providerSymbol: null,
        isin: null,
      }),
    ];
    const readBack = [
      holding({
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
      }),
    ];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(true);
  });

  it("fails when a matched holding is missing after read-back", () => {
    const written = [holding(), holding({ symbol: "STRC", providerSymbol: "STRC.AS", isin: "NL0015001K93" })];
    const readBack = [holding()];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(false);
  });

  it("fails when quantity changes after read-back", () => {
    const written = [holding({ quantity: 10 })];
    const readBack = [holding({ quantity: 11 })];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(false);
  });

  it("fails when purchase price changes after read-back", () => {
    const written = [holding({ purchasePrice: 100 })];
    const readBack = [holding({ purchasePrice: 101 })];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(false);
  });

  it("fails when matched instrument identity changes after read-back", () => {
    const written = [holding({ providerSymbol: "VWCE.XETRA", isin: "IE00BK5BQT80" })];
    const readBack = [holding({ providerSymbol: "VWCE.AS", isin: "IE00BK5BQT80" })];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(false);
  });

  it("fails when currency changes after read-back", () => {
    const written = [holding({ currency: "EUR" })];
    const readBack = [
      holding({
        currency: "USD" as StoredPortfolioHolding["currency"],
      }),
    ];

    expect(portfoliosPersistedMatch(written, readBack)).toBe(false);
  });

  it("documents the prior false positive from legacy portfolioFingerprint", () => {
    const written = [
      holding({
        providerSymbol: "vwce.xetra",
        isin: "IE00BK5BQT80",
      }),
    ];
    const readBack = [
      holding({
        id: "legacy-db-id",
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
        updatedAt: "2026-07-22T09:00:00.000Z",
      }),
    ];

    expect(
      portfolioFingerprint(written, USER_ID) ===
        portfolioFingerprint(readBack, USER_ID),
    ).toBe(false);
    expect(portfoliosPersistedMatch(written, readBack)).toBe(true);
  });
});

describe("verifyPersistedPortfolioSnapshot", () => {
  function snapshotWith(holdings: StoredPortfolioHolding[]): RemotePortfolioSnapshot {
    return {
      holdings,
      goal: null,
      importMappings: [],
      migrationCompletedAt: null,
      remoteUpdatedAt: "2026-07-22T09:00:00.000Z",
      portfolioId: "portfolio-1",
      holdingCount: holdings.length,
    };
  }

  it("succeeds on a delayed read-back retry", async () => {
    const written = [holding()];
    const initial = snapshotWith([holding({ quantity: 0, purchasePrice: 0 })]);
    const corrected = snapshotWith([holding()]);

    const fetchSnapshot = vi.fn().mockResolvedValueOnce(corrected);

    const repo = {
      fetchSnapshot,
    } as unknown as PortfolioRepository;

    const verified = await verifyPersistedPortfolioSnapshot(
      repo,
      USER_ID,
      written,
      initial,
      {
        retryDelaysMs: [0, 1],
        wait: async () => undefined,
      },
    );

    expect(verified).toBe(true);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  it("returns false when read-back never matches", async () => {
    const written = [holding()];
    const initial = snapshotWith([holding({ symbol: "OTHER", providerSymbol: "OTHER.XETRA" })]);

    const repo = {
      fetchSnapshot: vi.fn(async () => initial),
    } as unknown as PortfolioRepository;

    const verified = await verifyPersistedPortfolioSnapshot(
      repo,
      USER_ID,
      written,
      initial,
      {
        retryDelaysMs: [0, 1],
        wait: async () => undefined,
      },
    );

    expect(verified).toBe(false);
  });
});
