import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  __countUserPortfolioRemoteHydratesForTests,
  __resetUserPortfolioRemoteHydratesForTests,
  UserPortfolioProvider,
  useUserPortfolio,
} from "@/lib/client/useUserPortfolio";

vi.mock("@/lib/client/useAuthenticatedUserSub", () => ({
  useAuthenticatedUserSub: () => mockAuth,
}));

vi.mock("@/lib/client/portfolioSyncApi", () => ({
  fetchRemotePortfolio: vi.fn(async () => ({ ok: false, offline: true })),
  migratePortfolioToRemote: vi.fn(),
  pushPortfolioToRemote: vi.fn(),
}));

let mockAuth: { userSub: string | null; authReady: boolean } = {
  userSub: "user-a",
  authReady: true,
};

function DualConsumer() {
  useUserPortfolio();
  useUserPortfolio();
  return null;
}

let lastHoldingsCount = 0;
let lastUserSub: string | null = null;

function HoldingsProbe() {
  const { holdings, userSub } = useUserPortfolio();
  lastHoldingsCount = holdings.length;
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
    mockAuth = { userSub: "user-a", authReady: true };
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
});
