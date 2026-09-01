import { readFileSync } from "node:fs";
import path from "node:path";
import type { User } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  NAV_SNAPSHOT_WRITE_AUTHORITY,
  type NavSnapshotClient,
} from "@/lib/services/goalPace/capturePortfolioNavSnapshot";
import type { CapturePortfolioNavSnapshotResult } from "@/lib/services/goalPace/types";
import { resolveProductAccess } from "@/lib/services/productAccess";
import {
  readRequestedPortfolioId,
  runTrustedNavSnapshotCapture,
} from "@/lib/services/goalPace/trustedNavSnapshotCapture";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PORT_A = "11111111-1111-4111-8111-111111111111";
const PORT_B = "22222222-2222-4222-8222-222222222222";
const SNAPSHOT_CLIENT = {} as NavSnapshotClient;

function user(id = USER_A): User {
  return { id } as User;
}

function captureResult(
  status: CapturePortfolioNavSnapshotResult["status"],
): CapturePortfolioNavSnapshotResult {
  return { status, snapshot: null, message: status };
}

const personalAccess = resolveProductAccess({ exampleKind: "none" });
const demoAccess = resolveProductAccess({ exampleKind: "active" });
const personalTrialAccess = resolveProductAccess({
  exampleKind: "active",
  trialKind: "personal",
  expiresAt: "2099-01-01T00:00:00.000Z",
  daysRemaining: 11,
});

function enabledEnv(): NodeJS.ProcessEnv {
  return { PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "true" };
}

describe("readRequestedPortfolioId", () => {
  it("reads only portfolioId and ignores client-supplied authority fields", () => {
    expect(
      readRequestedPortfolioId({
        portfolioId: PORT_A,
        userId: "forged-user",
        nav: 999,
        navEur: 999,
        currency: "USD",
        holdingCount: 9,
        coverage: "usable",
        goalId: "forged-goal",
        isDemo: true,
        tier: "complete",
        snapshotDate: "1999-01-01",
      }),
    ).toBe(PORT_A);
    expect(readRequestedPortfolioId({ portfolioId: "  " })).toBeNull();
    expect(readRequestedPortfolioId(null)).toBeNull();
  });
});

describe("runTrustedNavSnapshotCapture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns disabled and does not write when the flag is absent", async () => {
    const resolveProductAccessFn = vi.fn();
    const createSnapshotClient = vi.fn();
    const capture = vi.fn();
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: {},
      resolveProductAccess: resolveProductAccessFn,
      createSnapshotClient,
      capture,
    });
    expect(result).toEqual({
      httpStatus: 200,
      body: { status: "disabled" },
    });
    expect(resolveProductAccessFn).not.toHaveBeenCalled();
    expect(createSnapshotClient).not.toHaveBeenCalled();
    expect(capture).not.toHaveBeenCalled();
  });

  it("returns disabled and does not write when the flag is not exact true", async () => {
    const capture = vi.fn();
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: {
        PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED: "false",
        VERCEL_ENV: "preview",
      },
      createSnapshotClient: vi.fn(() => SNAPSHOT_CLIENT),
      capture,
    });
    expect(result.body.status).toBe("disabled");
    expect(capture).not.toHaveBeenCalled();
  });

  it("allows the trusted path when the flag is true", async () => {
    const order: string[] = [];
    const capture = vi.fn(async (input) => {
      order.push("capture");
      expect(input.authority).toBe(NAV_SNAPSHOT_WRITE_AUTHORITY);
      expect(input.userId).toBe(USER_A);
      expect(input.requestedPortfolioId).toBe(PORT_A);
      expect(input.client).toBe(SNAPSHOT_CLIENT);
      return captureResult("created");
    });
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: enabledEnv(),
      resolveProductAccess: async () => {
        order.push("access");
        return personalAccess;
      },
      createSnapshotClient: () => {
        order.push("admin");
        return SNAPSHOT_CLIENT;
      },
      capture,
    });
    expect(order).toEqual(["access", "admin", "capture"]);
    expect(result.body.status).toBe("created");
  });

  it("ignores client-supplied user/NAV/Goal/Demo fields and uses the session user", async () => {
    const capture = vi.fn(async (input) => {
      expect(input.userId).toBe(USER_A);
      expect(input.authority).toBe(NAV_SNAPSHOT_WRITE_AUTHORITY);
      expect(input.productAccess).toEqual(personalAccess);
      return captureResult("created");
    });
    await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: readRequestedPortfolioId({
        portfolioId: PORT_A,
        userId: "attacker",
        navEur: 1,
        isDemo: true,
        goalId: "g",
      }),
      env: enabledEnv(),
      resolveProductAccess: async () => personalAccess,
      createSnapshotClient: () => SNAPSHOT_CLIENT,
      capture,
    });
    expect(capture).toHaveBeenCalledOnce();
  });

  it("skips Demo without writing", async () => {
    const capture = vi.fn(async () => captureResult("skipped_demo"));
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: enabledEnv(),
      resolveProductAccess: async () => demoAccess,
      createSnapshotClient: () => SNAPSHOT_CLIENT,
      capture,
    });
    expect(result.body.status).toBe("skipped_demo");
    expect(capture.mock.calls[0][0].productAccess).toMatchObject({
      isDemo: true,
    });
  });

  it("treats a personal Complete trial as personal, not Demo", async () => {
    const capture = vi.fn(async (input) => {
      expect(input.productAccess.isCompleteTrial).toBe(true);
      expect(input.productAccess.isDemo).toBe(false);
      return captureResult("created");
    });
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: enabledEnv(),
      resolveProductAccess: async () => personalTrialAccess,
      createSnapshotClient: () => SNAPSHOT_CLIENT,
      capture,
    });
    expect(result.body.status).toBe("created");
  });

  it("skips when Product Access is unresolved", async () => {
    const capture = vi.fn(async () =>
      captureResult("skipped_unresolved_access"),
    );
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: enabledEnv(),
      resolveProductAccess: async () => personalAccess,
      createSnapshotClient: () => SNAPSHOT_CLIENT,
      capture,
    });
    expect(result.body.status).toBe("skipped_unresolved_access");
    expect(capture).toHaveBeenCalledOnce();
  });

  it("forbids a cross-portfolio request", async () => {
    const capture = vi.fn(async () => captureResult("forbidden"));
    const result = await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_B,
      env: enabledEnv(),
      resolveProductAccess: async () => personalAccess,
      createSnapshotClient: () => SNAPSHOT_CLIENT,
      capture,
    });
    expect(result).toEqual({
      httpStatus: 403,
      body: { status: "forbidden" },
    });
  });

  it("does not create an admin snapshot client until identity is present", async () => {
    const createSnapshotClient = vi.fn(() => SNAPSHOT_CLIENT);
    await runTrustedNavSnapshotCapture({
      user: user(),
      requestedPortfolioId: PORT_A,
      env: {},
      createSnapshotClient,
      capture: vi.fn(),
    });
    expect(createSnapshotClient).not.toHaveBeenCalled();
  });
});

describe("trusted capture wiring sources", () => {
  const repoRoot = path.resolve(__dirname, "../../..");
  function read(rel: string): string {
    return readFileSync(path.join(repoRoot, rel), "utf8");
  }

  it("never exposes the flag as NEXT_PUBLIC", () => {
    const flag = read("lib/services/goalPace/navSnapshotCaptureFlag.ts");
    const route = read("app/api/portfolio/nav-snapshot/route.ts");
    const vercel = read("vercel.json");
    expect(flag).not.toContain("NEXT_PUBLIC_PORTFOLIO_NAV_SNAPSHOT");
    expect(flag).not.toMatch(/process\.env\.NEXT_PUBLIC_/);
    expect(route).not.toContain("NEXT_PUBLIC_PORTFOLIO_NAV_SNAPSHOT");
    expect(vercel).not.toContain("PORTFOLIO_NAV_SNAPSHOT_CAPTURE_ENABLED");
  });
});
