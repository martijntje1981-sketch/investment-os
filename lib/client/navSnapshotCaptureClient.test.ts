import { afterEach, describe, expect, it, vi } from "vitest";

import {
  PORTFOLIO_NAV_SNAPSHOT_CAPTURE_PATH,
  navSnapshotCaptureDedupeKey,
  requestPortfolioNavSnapshotCapture,
  resetNavSnapshotCaptureDedupeForTests,
  shouldRequestNavSnapshotCapture,
  utcSnapshotDateIso,
} from "@/lib/client/navSnapshotCaptureClient";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "user-a";
const PORT_A = "port-a";
const PORT_B = "port-b";
const NOW = new Date("2026-09-01T12:00:00.000Z");

const readyGate = {
  pathname: "/dashboard",
  authReady: true,
  userSub: USER,
  portfolioReady: true,
  activePortfolioId: PORT_A,
  holdingsBelongToActivePortfolio: true,
  pricesSettled: true,
  isRefreshing: false,
  portfolioValueAvailable: true,
  accessReady: true,
  isDemo: false,
  trigger: "settled_valuation" as const,
};

function jsonResponse(status: string, httpStatus = 200): Response {
  return new Response(JSON.stringify({ status }), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

describe("shouldRequestNavSnapshotCapture", () => {
  it("requests after a settled authenticated valuation", () => {
    expect(shouldRequestNavSnapshotCapture(readyGate)).toEqual({
      request: true,
      reason: "settled_valuation",
    });
  });

  it("does not capture homepage or login", () => {
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, pathname: "/" }).request,
    ).toBe(false);
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, pathname: "/login" })
        .request,
    ).toBe(false);
  });

  it("does not capture Demo, unresolved access, or unavailable value", () => {
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, isDemo: true }).reason,
    ).toBe("demo");
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, accessReady: false })
        .reason,
    ).toBe("access_unresolved");
    expect(
      shouldRequestNavSnapshotCapture({
        ...readyGate,
        portfolioValueAvailable: false,
      }).reason,
    ).toBe("value_unavailable");
  });

  it("does not capture until auth, portfolio identity, and prices have settled", () => {
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, authReady: false }).reason,
    ).toBe("auth_not_ready");
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, userSub: null }).reason,
    ).toBe("no_user");
    expect(
      shouldRequestNavSnapshotCapture({
        ...readyGate,
        activePortfolioId: null,
      }).reason,
    ).toBe("portfolio_identity_unresolved");
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, pricesSettled: false })
        .reason,
    ).toBe("prices_not_settled");
    expect(
      shouldRequestNavSnapshotCapture({ ...readyGate, isRefreshing: true })
        .reason,
    ).toBe("refresh_in_flight");
  });
});

describe("requestPortfolioNavSnapshotCapture", () => {
  afterEach(() => {
    resetNavSnapshotCaptureDedupeForTests();
  });

  it("sends only portfolioId on the first settled valuation", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse("created"));
    const first = await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(first).toEqual({ status: "created", requested: true });
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(PORTFOLIO_NAV_SNAPSHOT_CAPTURE_PATH);
    expect(init).toMatchObject({
      method: "POST",
      credentials: "same-origin",
    });
    expect(JSON.parse(String(init?.body))).toEqual({ portfolioId: PORT_A });
    expect(String(init?.body)).not.toContain("userId");
    expect(String(init?.body)).not.toContain("nav");
    expect(String(init?.body)).not.toContain("goal");
    expect(String(init?.body)).not.toContain("isDemo");
  });

  it("does not repeat capture on route remount for the same user/portfolio/UTC day", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse("created"));
    await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const remount = await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(remount.requested).toBe(false);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("can capture a switched owned portfolio separately", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse("created"));
    await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const switched = await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_B,
      userSub: USER,
      trigger: "portfolio_switch",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(switched.requested).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchImpl.mock.calls[1][1]?.body))).toEqual({
      portfolioId: PORT_B,
    });
  });

  it("allows a successful manual refresh to request same-day improvement", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse("already_captured"));
    await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    fetchImpl.mockResolvedValueOnce(jsonResponse("improved"));
    const improved = await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "manual_refresh",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(improved).toEqual({ status: "improved", requested: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("does not turn a snapshot failure into a thrown refresh failure", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("snapshot exploded");
    });
    await expect(
      requestPortfolioNavSnapshotCapture({
        portfolioId: PORT_A,
        userSub: USER,
        trigger: "manual_refresh",
        now: NOW,
        fetchImpl: fetchImpl as unknown as typeof fetch,
      }),
    ).resolves.toEqual({ status: "error", requested: true });
  });

  it("does not start a price-provider request", async () => {
    const fetchImpl = vi.fn(async (url: string) => {
      expect(url).not.toContain("/api/prices");
      return jsonResponse("created");
    });
    await requestPortfolioNavSnapshotCapture({
      portfolioId: PORT_A,
      userSub: USER,
      trigger: "settled_valuation",
      now: NOW,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(fetchImpl.mock.calls[0][0]).toBe(PORTFOLIO_NAV_SNAPSHOT_CAPTURE_PATH);
  });

  it("scopes the session key to user, portfolio, and UTC day", () => {
    expect(
      navSnapshotCaptureDedupeKey({
        userSub: USER,
        portfolioId: PORT_A,
        now: NOW,
      }),
    ).toBe(`${USER}:${PORT_A}:${utcSnapshotDateIso(NOW)}`);
  });
});

describe("NAV snapshot capture surface wiring", () => {
  it("does not mention snapshot status in refresh success copy", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const refreshAction = readFileSync(
      resolve(process.cwd(), "lib/client/livePortfolioPriceRefreshAction.ts"),
      "utf8",
    );
    const refreshHook = readFileSync(
      resolve(process.cwd(), "lib/client/useLivePortfolioPriceRefresh.ts"),
      "utf8",
    );
    const liveRefresh = readFileSync(
      resolve(process.cwd(), "lib/client/livePortfolioPriceRefresh.ts"),
      "utf8",
    );
    expect(refreshAction).not.toContain("nav-snapshot");
    expect(refreshAction).not.toContain("NAV snapshot");
    expect(refreshHook).not.toContain("/api/portfolio/nav-snapshot");
    expect(liveRefresh).not.toContain("/api/portfolio/nav-snapshot");
  });

  it("homepage and login never trigger capture", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const home = readFileSync(resolve(process.cwd(), "app/page.tsx"), "utf8");
    const login = readFileSync(
      resolve(process.cwd(), "app/login/page.tsx"),
      "utf8",
    );
    expect(home).not.toContain("usePortfolioNavSnapshotCapture");
    expect(home).not.toContain("nav-snapshot");
    expect(login).not.toContain("usePortfolioNavSnapshotCapture");
    expect(login).not.toContain("nav-snapshot");
  });

  it("refresh hook settles prices without starting a snapshot-specific EODHD path", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const hook = readFileSync(
      resolve(process.cwd(), "lib/client/useLivePortfolioPriceRefresh.ts"),
      "utf8",
    );
    expect(hook).toContain("pricesSettled");
    expect(hook).toContain("manualRefreshGeneration");
    expect(hook).not.toContain("eodhd");
    expect(hook).not.toContain("capturePortfolioNavSnapshot");
  });
});

describe("cash-only client availability", () => {
  it("treats cash-only holdings as available for a capture request", async () => {
    const { activePortfolioValueAvailable } = await import(
      "@/lib/client/navSnapshotCaptureClient"
    );
    const cash: StoredPortfolioHolding[] = [
      {
        id: "cash-1",
        symbol: "EUR",
        name: "Euro cash",
        quantity: 250,
        purchasePrice: 1,
        currentPrice: 1,
        currency: "EUR",
        assetType: "cash",
      },
    ];
    expect(activePortfolioValueAvailable(cash)).toBe(true);
    const unpriced: StoredPortfolioHolding[] = [
      {
        id: "h-1",
        symbol: "AIFS",
        name: "Unpriced",
        quantity: 10,
        purchasePrice: 0,
        currentPrice: 0,
        currency: "EUR",
        assetType: "investment",
        priceDataStatus: "unavailable",
      },
    ];
    expect(activePortfolioValueAvailable(unpriced)).toBe(false);
  });
});
