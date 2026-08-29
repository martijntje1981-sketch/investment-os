import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __countUserPortfolioRemoteHydratesForTests,
  __resetUserPortfolioRemoteHydratesForTests,
  UserPortfolioProvider,
  useUserPortfolio,
} from "@/lib/client/useUserPortfolio";
import {
  fetchRemotePortfolio,
  pushPortfolioToRemote,
} from "@/lib/client/portfolioSyncApi";
import { readPortfolioSyncMeta } from "@/lib/client/portfolioSyncState";

vi.mock("@/lib/client/useAuthenticatedUserSub", () => ({
  useAuthenticatedUserSub: () => mockAuth,
}));

vi.mock("@/lib/client/useActivePortfolio", () => ({
  useActivePortfolioOptional: () => mockActivePortfolio,
}));

vi.mock("@/lib/client/portfolioSyncApi", () => ({
  fetchRemotePortfolio: vi.fn(async () => ({ ok: false, offline: true })),
  migratePortfolioToRemote: vi.fn(),
  pushPortfolioToRemote: vi.fn(),
  getOrCreateSyncClientId: () => "test-sync-client",
}));

let mockAuth: { userSub: string | null; authReady: boolean } = {
  userSub: "user-a",
  authReady: true,
};

let mockActivePortfolio: {
  ready: boolean;
  activePortfolioId: string | null;
  activePortfolio: { isPrimary: boolean } | null;
} | null = null;

function DualConsumer() {
  useUserPortfolio();
  useUserPortfolio();
  return null;
}

let lastHoldingsCount = 0;
let lastUserSub: string | null = null;
let lastHoldingSymbols: string[] = [];

function HoldingsProbe() {
  const { holdings, userSub } = useUserPortfolio();
  lastHoldingsCount = holdings.length;
  lastHoldingSymbols = holdings.map((holding) => holding.symbol);
  lastUserSub = userSub;
  return null;
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("UserPortfolioProvider hydrate sharing", () => {
  let root: Root | null = null;
  let host: HTMLDivElement | null = null;

  beforeEach(() => {
    __resetUserPortfolioRemoteHydratesForTests();
    lastHoldingsCount = 0;
    lastUserSub = null;
    lastHoldingSymbols = [];
    mockAuth = { userSub: "user-a", authReady: true };
    mockActivePortfolio = null;
    localStorage.clear();
    vi.mocked(fetchRemotePortfolio).mockResolvedValue({ ok: false, offline: true });
    vi.mocked(pushPortfolioToRemote).mockReset();
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

  it("A/B. hydrates remotely once for two descendant consumers", async () => {
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(DualConsumer)),
      );
    });
    await flush();

    expect(__countUserPortfolioRemoteHydratesForTests()).toBe(1);
  });

  it("C. switching the authenticated user starts a new hydrate", async () => {
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(DualConsumer)),
      );
    });
    await flush();
    expect(__countUserPortfolioRemoteHydratesForTests()).toBe(1);

    mockAuth = { userSub: "user-b", authReady: true };
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(DualConsumer)),
      );
    });
    await flush();

    expect(__countUserPortfolioRemoteHydratesForTests()).toBeGreaterThan(1);
  });

  it("C. logout clears the shared portfolio and does not hydrate remotely", async () => {
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(HoldingsProbe)),
      );
    });
    await flush();
    expect(lastHoldingsCount).toBe(0);
    expect(lastUserSub).toBe("user-a");
    const hydratesAfterLogin = __countUserPortfolioRemoteHydratesForTests();

    mockAuth = { userSub: null, authReady: true };
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(HoldingsProbe)),
      );
    });
    await flush();

    expect(lastUserSub).toBeNull();
    expect(lastHoldingsCount).toBe(0);
    expect(__countUserPortfolioRemoteHydratesForTests()).toBe(hydratesAfterLogin);
  });

  it("does not PUT a fresh-device cache before GET hydrate succeeds", async () => {
    const snapshot = {
      holdings: [
        {
          id: "aifs",
          symbol: "AIFS",
          name: "AIFS",
          quantity: 4,
          purchasePrice: 20,
          currentPrice: 21,
          currency: "EUR",
          assetType: "investment" as const,
        },
      ],
      goal: null,
      importMappings: [],
      migrationCompletedAt: null,
      remoteUpdatedAt: "2026-08-25T11:28:00.000Z",
      portfolioId: "main-book",
      holdingCount: 1,
      syncVersion: 2,
    };
    vi.mocked(fetchRemotePortfolio).mockResolvedValue({
      ok: true,
      snapshot,
    });

    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(HoldingsProbe)),
      );
    });
    await flush();
    await flush();

    expect(fetchRemotePortfolio).toHaveBeenCalled();
    expect(pushPortfolioToRemote).not.toHaveBeenCalled();
    expect(readPortfolioSyncMeta("user-a", "main-book").lastHydratedSyncVersion).toBe(
      2,
    );
    expect(lastHoldingsCount).toBe(1);
  });

  it("ignores a delayed GET for Main after switching to kids", async () => {
    let resolveMain: ((value: unknown) => void) | null = null;
    let resolveKids: ((value: unknown) => void) | null = null;
    vi.mocked(fetchRemotePortfolio).mockImplementation(async (portfolioId) => {
      if (portfolioId === "main-book") {
        return new Promise((resolve) => {
          resolveMain = resolve;
        });
      }
      return new Promise((resolve) => {
        resolveKids = resolve;
      });
    });

    mockActivePortfolio = {
      ready: true,
      activePortfolioId: "main-book",
      activePortfolio: { isPrimary: true },
    };

    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(HoldingsProbe)),
      );
    });
    await flush();

    mockActivePortfolio = {
      ready: true,
      activePortfolioId: "kids-book",
      activePortfolio: { isPrimary: false },
    };
    await act(async () => {
      root!.render(
        createElement(UserPortfolioProvider, null, createElement(HoldingsProbe)),
      );
    });
    await flush();

    await act(async () => {
      resolveKids?.({
        ok: true,
        snapshot: {
          holdings: [
            {
              id: "vusa",
              symbol: "VUSA",
              name: "VUSA",
              quantity: 2,
              purchasePrice: 80,
              currentPrice: 81,
              currency: "EUR",
              assetType: "investment" as const,
            },
          ],
          goal: null,
          importMappings: [],
          migrationCompletedAt: null,
          remoteUpdatedAt: "2026-08-25T11:28:00.000Z",
          portfolioId: "kids-book",
          holdingCount: 1,
          syncVersion: 0,
        },
      });
    });
    await flush();

    expect(lastHoldingSymbols).toEqual(["VUSA"]);
    expect(readPortfolioSyncMeta("user-a", "kids-book").lastHydratedSyncVersion).toBe(
      0,
    );

    await act(async () => {
      resolveMain?.({
        ok: true,
        snapshot: {
          holdings: [
            {
              id: "aifs",
              symbol: "AIFS",
              name: "AIFS",
              quantity: 4,
              purchasePrice: 20,
              currentPrice: 21,
              currency: "EUR",
              assetType: "investment" as const,
            },
          ],
          goal: null,
          importMappings: [],
          migrationCompletedAt: null,
          remoteUpdatedAt: "2026-08-25T11:28:00.000Z",
          portfolioId: "main-book",
          holdingCount: 1,
          syncVersion: 0,
        },
      });
    });
    await flush();

    expect(lastHoldingSymbols).toEqual(["VUSA"]);
    expect(readPortfolioSyncMeta("user-a", "main-book").lastHydratedSyncVersion).toBeUndefined();
    expect(pushPortfolioToRemote).not.toHaveBeenCalled();
  });
});
