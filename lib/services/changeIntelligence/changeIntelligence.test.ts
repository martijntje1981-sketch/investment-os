import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "path";

import {
  CHANGE_INTELLIGENCE_THRESHOLDS,
  INSUFFICIENT_HISTORY_REASON,
  compareIntelligenceStates,
  buildIntelligenceStateSnapshot,
  insertIntelligenceStateSnapshotIfAbsent,
  resolveCompletedIntelligencePeriod,
} from "@/lib/services/changeIntelligence";
import { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    name: partial.name ?? partial.symbol,
    purchasePrice: partial.purchasePrice ?? partial.currentPrice,
    currency: "EUR",
    assetType: partial.assetType ?? "investment",
    ...partial,
  };
}

const baseGoal: GoalSettings = {
  targetValue: 750_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 20,
};

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 2,
        valuedHoldingCount: 2,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 47,
      hhi: 0.35,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: 11.3,
      monthlyContribution: 500,
      expectedAnnualReturnPercent: 20,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 68,
      bandId: "balanced",
      bandLabel: "Balanced",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 40 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin drawdown",
        estimatedPortfolioImpactPercent: 18,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> &
    Partial<Pick<IntelligenceStateSnapshot, "payload">> & {
      payload?: Partial<IntelligenceStatePayload> & {
        concentration?: Partial<IntelligenceStatePayload["concentration"]>;
        goal?: IntelligenceStatePayload["goal"];
        resilience?: IntelligenceStatePayload["resilience"];
        holdings?: IntelligenceStatePayload["holdings"];
        exposure?: IntelligenceStatePayload["exposure"];
      };
    },
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  const payload: IntelligenceStatePayload = {
    ...base,
    ...overrides.payload,
    portfolio: overrides.payload?.portfolio ?? base.portfolio,
    holdings: overrides.payload?.holdings ?? base.holdings,
    exposure: overrides.payload?.exposure ?? base.exposure,
    concentration: {
      ...base.concentration,
      ...overrides.payload?.concentration,
    },
    goal:
      overrides.payload && "goal" in overrides.payload
        ? overrides.payload.goal ?? null
        : base.goal,
    resilience:
      overrides.payload && "resilience" in overrides.payload
        ? overrides.payload.resilience ?? null
        : base.resilience,
    scorecard: overrides.payload?.scorecard ?? base.scorecard,
  };

  return {
    id: overrides.id ?? "snap-1",
    userId: overrides.userId ?? "user-1",
    portfolioId: overrides.portfolioId ?? "port-1",
    schemaVersion: 1,
    capturedAt: overrides.capturedAt ?? "2026-08-10T12:00:00.000Z",
    snapshotKind: overrides.snapshotKind ?? "weekly",
    periodKey: overrides.periodKey ?? "2026-W33",
    periodStart: overrides.periodStart ?? "2026-08-10",
    periodEnd: overrides.periodEnd ?? "2026-08-16",
    timezone: overrides.timezone ?? "Europe/Amsterdam",
    payload,
  };
}

describe("Phase 8A period keys", () => {
  it("maps 18 Aug 2026 to the completed ISO week and calendar month", () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    expect(resolveCompletedIntelligencePeriod("weekly", now)).toMatchObject({
      snapshotKind: "weekly",
      periodKey: "2026-W33",
      periodStart: "2026-08-10",
      periodEnd: "2026-08-16",
      timezone: "Europe/Amsterdam",
    });
    expect(resolveCompletedIntelligencePeriod("monthly", now)).toMatchObject({
      snapshotKind: "monthly",
      periodKey: "2026-07",
      periodStart: "2026-07-01",
      periodEnd: "2026-07-31",
    });
  });
});

describe("Phase 8A snapshot builder", () => {
  it("stores compact top holdings including quantity, without engine dumps", () => {
    const built = buildIntelligenceStateSnapshot({
      snapshotKind: "weekly",
      capturedAt: new Date("2026-08-18T12:00:00.000Z"),
      goal: baseGoal,
      goalId: "goal-1",
      hasSavedGoal: true,
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 1,
          currentPrice: 47_000,
          assetType: "crypto",
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          name: "VWCE",
          quantity: 10,
          currentPrice: 3_000,
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          name: "EUR cash",
          quantity: 23_000,
          currentPrice: 1,
          assetType: "cash",
        }),
      ],
    });

    expect(built.periodKey).toBe("2026-W33");
    expect(built.payload.holdings[0]?.symbol).toBe("BTC");
    expect(built.payload.holdings[0]?.quantity).toBe(1);
    expect(built.payload.holdings[0]?.weightPercent).toBe(47);
    expect(built.payload.concentration.largestHoldingWeightPercent).toBe(47);
    expect(built.payload.goal?.progressPercent).toBe(13.3);
    expect(JSON.stringify(built.payload)).not.toMatch(/scenarioResults/);
    expect(JSON.stringify(built.payload)).not.toMatch(/assumptions/);
    expect(JSON.stringify(built.payload)).not.toMatch(/limitations/);
  });
});

describe("Phase 8A change intelligence", () => {
  const previous = snapshot({
    periodKey: "2026-W33",
    capturedAt: "2026-08-17T08:00:00.000Z",
    payload: {
      holdings: [
        {
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 1,
          value: 47_000,
          weightPercent: 47,
          assetType: "crypto",
          providerSymbol: "BTC-USD",
        },
      ],
      exposure: {
        groups: [
          {
            groupId: "crypto",
            displayLabel: "Crypto",
            weightPercent: 47,
          },
        ],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });

  const current = snapshot({
    id: "snap-2",
    periodKey: "2026-W34",
    periodStart: "2026-08-17",
    periodEnd: "2026-08-23",
    capturedAt: "2026-08-24T08:00:00.000Z",
    payload: {
      concentration: { largestHoldingWeightPercent: 52 },
      goal: {
        goalId: "goal-1",
        targetValue: 750_000,
        targetYear: 2035,
        progressPercent: 12,
        monthlyContribution: 500,
        expectedAnnualReturnPercent: 20,
        portfolioValueAvailable: true,
      },
      resilience: {
        status: "ok",
        score: 61,
        bandId: "moderate",
        bandLabel: "Moderate",
        primaryDriver: "concentration",
        factors: [{ id: "concentration", score: 32 }],
        mostSensitive: {
          scenarioId: "bitcoin_minus_20",
          scenarioName: "Bitcoin drawdown",
          estimatedPortfolioImpactPercent: 22,
        },
      },
      holdings: [
        {
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 1,
          value: 52_000,
          weightPercent: 52,
          assetType: "crypto",
          providerSymbol: "BTC-USD",
        },
      ],
      exposure: {
        groups: [
          {
            groupId: "crypto",
            displayLabel: "Crypto",
            weightPercent: 52,
          },
        ],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });

  it("A. first snapshot returns insufficient history and no fabricated changes", () => {
    const result = compareIntelligenceStates({ previous: null, current });
    expect(result.status).toBe("insufficient_history");
    expect(result.reason).toBe(INSUFFICIENT_HISTORY_REASON);
    expect(result.signals).toEqual([]);
    expect(result.window).toBeNull();
  });

  it("B. concentration 47% → 52% is material", () => {
    const result = compareIntelligenceStates({ previous, current });
    const row = result.signals.find((item) => item.category === "concentration");
    expect(row?.delta).toBe(5);
    expect(row?.materiality).toBe("material");
    expect(row?.headline).toMatch(/Bitcoin concentration increased by 5 percentage points/);
    expect(row?.explanation).toContain("2026-W33");
    expect(row?.explanation).toContain("2026-W34");
    expect(row?.previousValue).toBe(47);
    expect(row?.currentValue).toBe(52);
  });

  it("C. concentration 52.0% → 52.4% is suppressed as noise", () => {
    const result = compareIntelligenceStates({
      previous: snapshot({
        payload: { concentration: { largestHoldingWeightPercent: 52 } },
      }),
      current: snapshot({
        periodKey: "2026-W34",
        payload: { concentration: { largestHoldingWeightPercent: 52.4 } },
      }),
    });
    expect(result.signals.some((item) => item.category === "concentration")).toBe(
      false,
    );
    expect(CHANGE_INTELLIGENCE_THRESHOLDS.concentrationPp).toBe(2);
  });

  it("D. crypto exposure 47% → 52% is material", () => {
    const result = compareIntelligenceStates({ previous, current });
    const row = result.signals.find((item) => item.category === "exposure");
    expect(row?.subject).toBe("crypto");
    expect(row?.delta).toBe(5);
    expect(row?.headline).toMatch(/Crypto exposure increased/);
  });

  it("E. goal progress 11.3% → 12.0% is material when definition is unchanged", () => {
    const result = compareIntelligenceStates({ previous, current });
    const row = result.signals.find((item) => item.category === "goal_progress");
    expect(row?.delta).toBe(0.7);
    expect(row?.materiality).toBe("material");
    expect(row?.headline).toMatch(/Goal progress increased by 0\.7 percentage points/);
  });

  it("F. goal target edit suppresses the progress-change narrative", () => {
    const result = compareIntelligenceStates({
      previous,
      current: snapshot({
        periodKey: "2026-W34",
        payload: {
          goal: {
            goalId: "goal-1",
            targetValue: 1_000_000,
            targetYear: 2035,
            progressPercent: 12,
            monthlyContribution: 500,
            expectedAnnualReturnPercent: 20,
            portfolioValueAvailable: true,
          },
        },
      }),
    });
    const row = result.signals.find((item) => item.category === "goal_progress");
    expect(row?.materiality).toBe("definition_changed");
    expect(row?.headline).toMatch(/goal definition changed/i);
    expect(row?.headline).not.toMatch(/progress increased/i);
  });

  it("G. resilience 68 → 61 is a material decline", () => {
    const result = compareIntelligenceStates({ previous, current });
    const row = result.signals.find((item) => item.category === "resilience");
    expect(row?.delta).toBe(-7);
    expect(row?.headline).toMatch(/Resilience decreased by 7 points \(68 → 61\)/);
  });

  it("H. quantity change is preserved without buy/sell causal wording", () => {
    const result = compareIntelligenceStates({
      previous,
      current: snapshot({
        periodKey: "2026-W34",
        payload: {
          concentration: { largestHoldingWeightPercent: 52 },
          holdings: [
            {
              id: "btc",
              symbol: "BTC",
              name: "Bitcoin",
              quantity: 1.2,
              value: 52_000,
              weightPercent: 52,
              assetType: "crypto",
              providerSymbol: "BTC-USD",
            },
          ],
        },
      }),
    });
    const row = result.signals.find((item) => item.category === "concentration");
    expect(row?.quantityChanged).toBe(true);
    expect(row?.previousQuantity).toBe(1);
    expect(row?.currentQuantity).toBe(1.2);
    const blob = `${row?.headline} ${row?.explanation} ${row?.limitations.join(" ")}`;
    expect(blob).not.toMatch(/\bbought\b|\bsold\b|\bbuy\b|\bsell\b/i);
    expect(blob).toMatch(/quantity also changed/i);
  });

  it("I. missing comparison fields are omitted safely", () => {
    const result = compareIntelligenceStates({
      previous: snapshot({
        payload: { resilience: null, goal: null },
      }),
      current,
    });
    expect(result.signals.some((item) => item.category === "resilience")).toBe(
      false,
    );
    expect(result.signals.some((item) => item.category === "goal_progress")).toBe(
      false,
    );
  });

  it("J. the same inputs produce the same signals", () => {
    const first = compareIntelligenceStates({ previous, current });
    const second = compareIntelligenceStates({ previous, current });
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.status).toBe("ready");
  });

  it("does not emit buy/sell/rebalance advice", () => {
    const result = compareIntelligenceStates({ previous, current });
    const blob = result.signals
      .map((row) => `${row.headline} ${row.explanation}`)
      .join("\n");
    for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
  });
});

describe("Phase 8A persistence", () => {
  it("inserts a period once and does not overwrite", async () => {
    const rows: Record<string, unknown>[] = [];
    const client = {
      from(table: string) {
        const filters: Record<string, unknown> = {};
        const api = {
          select() {
            return api;
          },
          eq(column: string, value: unknown) {
            filters[column] = value;
            return api;
          },
          async maybeSingle() {
            const match = rows.find((row) =>
              Object.entries(filters).every(([key, value]) => row[key] === value),
            );
            return { data: match ?? null, error: null };
          },
          insert(row: Record<string, unknown>) {
            const stored = { id: "row-1", ...row };
            rows.push(stored);
            return {
              select() {
                return {
                  async maybeSingle() {
                    return { data: stored, error: null };
                  },
                };
              },
            };
          },
        };
        void table;
        return api;
      },
    };

    const snap = snapshot({ id: null, periodKey: "2026-W33" });
    const first = await insertIntelligenceStateSnapshotIfAbsent(client, {
      userId: "user-1",
      portfolioId: "port-1",
      snapshot: snap,
    });
    const second = await insertIntelligenceStateSnapshotIfAbsent(client, {
      userId: "user-1",
      portfolioId: "port-1",
      snapshot: {
        ...snap,
        payload: {
          ...snap.payload,
          concentration: {
            ...snap.payload.concentration,
            largestHoldingWeightPercent: 99,
          },
        },
      },
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(rows).toHaveLength(1);
    expect(
      (rows[0]?.payload as IntelligenceStatePayload).concentration
        .largestHoldingWeightPercent,
    ).toBe(47);
  });

  it("does not write on every Dashboard render and has no new cron", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const vercel = read("vercel.json");
    const migration = read(
      "supabase/migrations/20260818120000_intelligence_state_snapshots.sql",
    );
    const api = read("app/api/intelligence/snapshots/route.ts");
    const capture = read("lib/client/captureIntelligenceSnapshots.ts");
    const reviewPage = read("components/companion/CompanionReviewPage.tsx");
    const hook = read("lib/client/useChangeIntelligence.ts");

    expect(dashboard).not.toMatch(/insertIntelligenceStateSnapshotIfAbsent/);
    expect(dashboard).not.toMatch(/captureIntelligenceSnapshotsFromReview/);
    expect(dashboard).not.toMatch(/method:\s*["']POST["']/);
    expect(dashboard).toContain("dashboardCapture");
    expect(hook).toContain("listReady");
    expect(hook).toContain("captureIntelligenceSnapshotsDashboardSafetyNet");
    expect(vercel).not.toMatch(/intelligence\/snapshots/);
    expect(migration).toContain("intelligence_state_snapshots");
    expect(migration).toContain(
      "UNIQUE (user_id, portfolio_id, snapshot_kind, period_key)",
    );
    expect(api).toContain("insertIntelligenceStateSnapshotIfAbsent");
    expect(api).not.toMatch(/eodhd|openai|fetchEodhd/i);
    expect(capture).toContain("/api/intelligence/snapshots");
    expect(reviewPage).toContain("useChangeIntelligence");
    expect(reviewPage).toContain("capture:");
  });
});
