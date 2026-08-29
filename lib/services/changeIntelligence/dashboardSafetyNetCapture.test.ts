import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "path";

import {
  captureIntelligenceSnapshotsDashboardSafetyNet,
} from "@/lib/client/captureIntelligenceSnapshots";
import {
  dashboardSafetyNetAttemptKey,
  resolveDashboardSafetyNetCapturePlan,
  resolveCompletedIntelligencePeriod,
} from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const NOW = new Date("2026-08-18T12:00:00.000Z");

function valuedHolding(): StoredPortfolioHolding {
  return {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    purchasePrice: 40_000,
    currentPrice: 50_000,
    previousClose: 49_000,
    currency: "EUR",
    portfolioCurrency: "EUR",
    assetType: "crypto",
    createdAt: "2026-08-01T12:00:00.000Z",
    updatedAt: "2026-08-18T12:00:00.000Z",
    priceDataStatus: "live",
    platform: null,
  };
}

function unvaluedHolding(): StoredPortfolioHolding {
  return {
    ...valuedHolding(),
    id: "x",
    symbol: "UNKN",
    name: "Unknown",
    currentPrice: 0,
    purchasePrice: 0,
    quantity: 0,
    assetType: "investment",
    priceDataStatus: "missing",
  };
}

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 50_000,
      coverage: {
        holdingCount: 1,
        valuedHoldingCount: 1,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [],
      classifiedHoldingCount: 1,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 100,
      hhi: 1,
      concentrationLevel: "highly_concentrated",
    },
    goal: null,
    resilience: null,
    scorecard: null,
  };
}

function storedSnapshot(
  kind: "weekly" | "monthly",
  periodKey: string,
): IntelligenceStateSnapshot {
  return {
    id: `${kind}-${periodKey}`,
    userId: "user-1",
    portfolioId: "port-1",
    schemaVersion: 1,
    capturedAt: "2026-08-18T12:00:00.000Z",
    snapshotKind: kind,
    periodKey,
    periodStart: kind === "weekly" ? "2026-08-10" : "2026-07-01",
    periodEnd: kind === "weekly" ? "2026-08-16" : "2026-07-31",
    timezone: "Europe/Amsterdam",
    payload: emptyPayload(),
  };
}

function plan(input: {
  isDemo?: boolean;
  holdings?: StoredPortfolioHolding[];
  snapshotsLoaded?: boolean;
  snapshots?: IntelligenceStateSnapshot[];
}) {
  return resolveDashboardSafetyNetCapturePlan({
    isDemo: input.isDemo ?? false,
    holdings: input.holdings ?? [valuedHolding()],
    snapshotsLoaded: input.snapshotsLoaded ?? true,
    snapshots: input.snapshots ?? [],
    now: NOW,
  });
}

describe("Dashboard safety-net capture", () => {
  const weeklyKey = resolveCompletedIntelligencePeriod("weekly", NOW).periodKey;
  const monthlyKey = resolveCompletedIntelligencePeriod("monthly", NOW).periodKey;

  it("missing completed week → one weekly capture allowed", () => {
    const result = plan({
      snapshots: [storedSnapshot("monthly", monthlyKey)],
    });
    expect(weeklyKey).toBe("2026-W33");
    expect(result.kinds).toEqual(["weekly"]);
    expect(result.skipReason).toBeNull();
  });

  it("existing week → no weekly capture", () => {
    const result = plan({
      snapshots: [storedSnapshot("weekly", weeklyKey)],
    });
    expect(result.kinds).not.toContain("weekly");
  });

  it("existing month → no monthly capture", () => {
    const result = plan({
      snapshots: [storedSnapshot("monthly", monthlyKey)],
    });
    expect(result.kinds).not.toContain("monthly");
  });

  it("missing week + month → bounded/idempotent capture of both", () => {
    const result = plan({ snapshots: [] });
    expect(result.kinds).toEqual(["weekly", "monthly"]);
    expect(result.kinds).toHaveLength(2);
    const key = dashboardSafetyNetAttemptKey(result, NOW);
    expect(key).toBe(`${weeklyKey}|${monthlyKey}|weekly,monthly`);
    expect(dashboardSafetyNetAttemptKey(result, NOW)).toBe(key);
  });

  it("Demo → no capture", async () => {
    const result = plan({ isDemo: true, snapshots: [] });
    expect(result.kinds).toEqual([]);
    expect(result.skipReason).toBe("demo");
    const attempted = await captureIntelligenceSnapshotsDashboardSafetyNet({
      isDemo: true,
      holdings: [valuedHolding()],
      goal: null,
      hasSavedGoal: false,
      snapshotsLoaded: true,
      snapshots: [],
      now: NOW,
    });
    expect(attempted.attempted).toEqual([]);
  });

  it("unreliable/unvalued portfolio → no capture", () => {
    expect(plan({ holdings: [], snapshots: [] }).skipReason).toBe(
      "unvalued_portfolio",
    );
    expect(
      plan({ holdings: [unvaluedHolding()], snapshots: [] }).skipReason,
    ).toBe("unvalued_portfolio");
    expect(
      plan({ snapshotsLoaded: false, snapshots: [] }).skipReason,
    ).toBe("snapshots_unknown");
  });

  it("repeated Dashboard render → no repeated successful writes", async () => {
    const first = plan({ snapshots: [] });
    expect(first.kinds).toEqual(["weekly", "monthly"]);

    const afterCapture = plan({
      snapshots: [
        storedSnapshot("weekly", weeklyKey),
        storedSnapshot("monthly", monthlyKey),
      ],
    });
    expect(afterCapture.kinds).toEqual([]);
    expect(afterCapture.skipReason).toBe("already_present");

    const secondAttempt = await captureIntelligenceSnapshotsDashboardSafetyNet({
      isDemo: false,
      holdings: [valuedHolding()],
      goal: null,
      hasSavedGoal: false,
      snapshotsLoaded: true,
      snapshots: [
        storedSnapshot("weekly", weeklyKey),
        storedSnapshot("monthly", monthlyKey),
      ],
      now: NOW,
    });
    expect(secondAttempt.attempted).toEqual([]);

    const hook = read("lib/client/useChangeIntelligence.ts");
    expect(hook).toContain("lastDashboardAttemptKey");
    expect(hook).toContain("listReady");
  });

  it("no external market/API calls", () => {
    const files = [
      "lib/services/changeIntelligence/capturePolicy.ts",
      "lib/client/captureIntelligenceSnapshots.ts",
      "lib/client/useChangeIntelligence.ts",
      "app/dashboard/page.tsx",
      "app/api/intelligence/snapshots/route.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|anthropic|setInterval|setTimeout/i);
      expect(source).not.toMatch(/fetchEodhd|market-snapshot/i);
    }
    expect(read("vercel.json")).not.toMatch(/intelligence\/snapshots/);
    expect(read("app/dashboard/page.tsx")).toContain("dashboardCapture");
    expect(read("components/fourQuestions/QuestionHubPage.tsx")).not.toContain(
      "dashboardCapture",
    );
    const hook = read("lib/client/useChangeIntelligence.ts");
    expect(hook).toContain("if (!dashboardCaptureEnabled || !listReady) return");
  });
});
