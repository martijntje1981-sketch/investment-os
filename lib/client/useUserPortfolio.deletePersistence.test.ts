import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  UserPortfolioProvider,
  useUserPortfolio,
} from "@/lib/client/useUserPortfolio";
import {
  fetchRemotePortfolio,
  pushPortfolioToRemote,
} from "@/lib/client/portfolioSyncApi";
import { writePortfolioToStorage } from "@/lib/client/userPortfolioStorage";
import { recordCloudHydrate } from "@/lib/client/portfolioSyncState";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { RemotePortfolioSnapshot } from "@/lib/services/portfolio/types";

vi.mock("@/lib/client/useAuthenticatedUserSub", () => ({
  useAuthenticatedUserSub: () => mockAuth,
}));

vi.mock("@/lib/client/useActivePortfolio", () => ({
  useActivePortfolioOptional: () => mockActivePortfolio,
}));

vi.mock("@/lib/client/portfolioSyncApi", () => ({
  fetchRemotePortfolio: vi.fn(),
  migratePortfolioToRemote: vi.fn(),
  pushPortfolioToRemote: vi.fn(),
  getOrCreateSyncClientId: () => "test-sync-client",
}));

vi.mock("@/lib/client/marketSnapshotSync", () => ({
  syncPortfolioPricesFromSnapshot: vi.fn(async (_user: string, holdings: StoredPortfolioHolding[]) => ({
    updated: false,
    holdings,
  })),
}));

const USER = "user-delete-persistence";
const TESTING_ID = "testing-book";
const MAIN_ID = "main-book";

let mockAuth = { userSub: USER, authReady: true };
let mockActivePortfolio: {
  ready: boolean;
  activePortfolioId: string | null;
  activePortfolio: { isPrimary: boolean } | null;
} | null = {
  ready: true,
  activePortfolioId: TESTING_ID,
  activePortfolio: { isPrimary: false },
};

function cryptoRow(id: string, symbol: string): StoredPortfolioHolding {
  return {
    id,
    symbol,
    name: symbol,
    quantity: 1,
    purchasePrice: 10,
    currentPrice: 11,
    currency: "EUR",
    assetType: "crypto",
  };
}

function snapshotOf(
  portfolioId: string,
  holdings: StoredPortfolioHolding[],
  syncVersion: number,
): RemotePortfolioSnapshot {
  return {
    holdings,
    goal: null,
    importMappings: [],
    migrationCompletedAt: null,
    remoteUpdatedAt: "2026-08-28T06:00:00.000Z",
    portfolioId,
    isPrimary: portfolioId === MAIN_ID,
    holdingCount: holdings.length,
    syncVersion,
  };
}

let api: ReturnType<typeof useUserPortfolio> | null = null;

function ApiProbe() {
  api = useUserPortfolio();
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("useUserPortfolio delete persistence", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  const initial = [
    cryptoRow("btc", "BTC"),
    cryptoRow("eth", "ETH"),
    cryptoRow("sol", "SOL"),
    cryptoRow("xrp", "XRP"),
  ];

  beforeEach(() => {
    api = null;
    mockAuth = { userSub: USER, authReady: true };
    mockActivePortfolio = {
      ready: true,
      activePortfolioId: TESTING_ID,
      activePortfolio: { isPrimary: false },
    };
    localStorage.clear();
    writePortfolioToStorage(USER, initial, TESTING_ID, { isPrimary: false });
    recordCloudHydrate(USER, snapshotOf(TESTING_ID, initial, 4));
    vi.mocked(fetchRemotePortfolio).mockResolvedValue({
      ok: true,
      snapshot: snapshotOf(TESTING_ID, initial, 4),
    });
    vi.mocked(pushPortfolioToRemote).mockReset();
    vi.mocked(pushPortfolioToRemote).mockImplementation(async (input) => ({
      ok: true as const,
      snapshot: snapshotOf(
        input.portfolioId ?? TESTING_ID,
        input.holdings,
        (input.baseVersion ?? 0) + 1,
      ),
    }));
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(() => {
    act(() => {
      root?.unmount();
    });
    host?.remove();
    root = null;
    host = null;
  });

  async function renderBook() {
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(ApiProbe)),
      );
    });
    await flush();
    await flush();
  }

  it("delete one holding then hydrate keeps it deleted and PUTs the omission", async () => {
    await renderBook();
    expect(api?.holdings.map((row) => row.id)).toEqual(["btc", "eth", "sol", "xrp"]);

    act(() => {
      api!.saveHoldings((current) => current.filter((row) => row.id !== "btc"));
    });
    await flush();

    expect(api?.holdings.map((row) => row.id)).toEqual(["eth", "sol", "xrp"]);
    expect(pushPortfolioToRemote).toHaveBeenCalled();
    const sent = vi.mocked(pushPortfolioToRemote).mock.calls.at(-1)?.[0];
    expect(sent?.holdings.map((row) => row.id)).toEqual(["eth", "sol", "xrp"]);

    vi.mocked(fetchRemotePortfolio).mockResolvedValue({
      ok: true,
      snapshot: snapshotOf(TESTING_ID, initial, 4),
    });
    await act(async () => {
      await api!.retrySync();
    });
    await flush();

    expect(api?.holdings.map((row) => row.id)).toEqual(["eth", "sol", "xrp"]);
    expect(api?.holdings.some((row) => row.id === "btc")).toBe(false);
  });

  it("delete multiple holdings in one session coalesces to one latest PUT", async () => {
    let releaseFirst: ((value: unknown) => void) | null = null;
    vi.mocked(pushPortfolioToRemote).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          releaseFirst = resolve;
        }),
    );

    await renderBook();

    act(() => {
      api!.saveHoldings((current) => current.filter((row) => row.id !== "btc"));
      api!.saveHoldings((current) => current.filter((row) => row.id !== "eth"));
      api!.saveHoldings((current) => current.filter((row) => row.id !== "sol"));
    });
    await flush();

    expect(api?.holdings.map((row) => row.id)).toEqual(["xrp"]);
    expect(pushPortfolioToRemote).toHaveBeenCalledTimes(1);

    await act(async () => {
      releaseFirst?.({
        ok: true,
        snapshot: snapshotOf(
          TESTING_ID,
          [cryptoRow("eth", "ETH"), cryptoRow("sol", "SOL"), cryptoRow("xrp", "XRP")],
          5,
        ),
      });
    });
    await flush();
    await flush();

    expect(pushPortfolioToRemote.mock.calls.length).toBeGreaterThanOrEqual(2);
    const lastSent = vi.mocked(pushPortfolioToRemote).mock.calls.at(-1)?.[0];
    expect(lastSent?.holdings.map((row) => row.id)).toEqual(["xrp"]);
    expect(api?.holdings.map((row) => row.id)).toEqual(["xrp"]);
  });

  it("price refresh of a stale array cannot restore a deleted holding", async () => {
    await renderBook();
    act(() => {
      api!.saveHoldings((current) => current.filter((row) => row.id !== "btc"));
    });
    await flush();

    act(() => {
      api!.saveHoldings(initial);
    });
    await flush();

    expect(api?.holdings.some((row) => row.id === "btc")).toBe(false);
    expect(api?.holdings.map((row) => row.id)).toEqual(["eth", "sol", "xrp"]);
  });

  it("switching book and back does not resurrect Testing deletes onto Main or Testing", async () => {
    writePortfolioToStorage(USER, [cryptoRow("aifs", "AIFS")], MAIN_ID, {
      isPrimary: true,
    });
    recordCloudHydrate(USER, snapshotOf(MAIN_ID, [cryptoRow("aifs", "AIFS")]));

    await renderBook();
    act(() => {
      api!.saveHoldings((current) => current.filter((row) => row.id !== "btc"));
    });
    await flush();

    vi.mocked(fetchRemotePortfolio).mockImplementation(async (portfolioId) => {
      if (portfolioId === MAIN_ID) {
        return {
          ok: true as const,
          snapshot: snapshotOf(MAIN_ID, [cryptoRow("aifs", "AIFS")], 1),
        };
      }
      return {
        ok: true as const,
        snapshot: snapshotOf(TESTING_ID, initial, 4),
      };
    });

    mockActivePortfolio = {
      ready: true,
      activePortfolioId: MAIN_ID,
      activePortfolio: { isPrimary: true },
    };
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(ApiProbe)),
      );
    });
    await flush();
    await flush();
    expect(api?.holdings.map((row) => row.id)).toEqual(["aifs"]);

    mockActivePortfolio = {
      ready: true,
      activePortfolioId: TESTING_ID,
      activePortfolio: { isPrimary: false },
    };
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(ApiProbe)),
      );
    });
    await flush();
    await flush();

    expect(api?.holdings.some((row) => row.id === "btc")).toBe(false);
    expect(api?.holdings.some((row) => row.id === "aifs")).toBe(false);
  });
});
