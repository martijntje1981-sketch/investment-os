/**
 * Phase 21 — Portfolio Stance, history, and goal trade-offs.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { buildFourQuestions } from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import {
  STANCE_BANDS,
  STANCE_CHANGE_MATERIAL_SCORE,
  STANCE_FACTOR_WEIGHTS,
  STANCE_HISTORY_BUILDING,
  STANCE_ILLUSTRATIVE_DISCLAIMER,
  STANCE_POSITIONING_DISCLAIMER,
  STANCE_PROHIBITED_PATTERNS,
  STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON,
  buildGoalTradeOffs,
  buildPortfolioStance,
  buildPortfolioStanceHistory,
  buildStanceDiscoveredCandidate,
  mergeStanceIntoFourQuestions,
} from "@/lib/services/portfolioStance";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string): string {
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

const goal: GoalSettings = {
  targetValue: 250_000,
  targetYear: 2036,
  monthlyContribution: 750,
  expectedAnnualReturn: 6,
};

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 3,
        valuedHoldingCount: 3,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [
        { groupId: "crypto", displayLabel: "Crypto", weightPercent: 43 },
        {
          groupId: "diversified_equity",
          displayLabel: "Diversified equity",
          weightPercent: 33,
        },
        { groupId: "cash", displayLabel: "Cash", weightPercent: 24 },
      ],
      classifiedHoldingCount: 3,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 43,
      hhi: 0.3,
      concentrationLevel: "concentrated",
    },
    goal: null,
    resilience: {
      status: "ok",
      score: 55,
      bandId: "moderate",
      bandLabel: "Moderate",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 40 }],
      mostSensitive: {
        scenarioId: "crypto_minus_20",
        scenarioName: "Crypto −20%",
        estimatedPortfolioImpactPercent: -8.6,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload> & {
      concentration?: Partial<IntelligenceStatePayload["concentration"]>;
      exposure?: IntelligenceStatePayload["exposure"];
      resilience?: IntelligenceStatePayload["resilience"];
      portfolio?: IntelligenceStatePayload["portfolio"];
    };
  } = {},
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
    resilience:
      overrides.payload && "resilience" in overrides.payload
        ? overrides.payload.resilience ?? null
        : base.resilience,
    scorecard: overrides.payload?.scorecard ?? base.scorecard,
  };
  return {
    id: overrides.id ?? "snap-1",
    userId: "user-1",
    portfolioId: "port-1",
    schemaVersion: 1,
    capturedAt: overrides.capturedAt ?? "2026-07-31T12:00:00.000Z",
    snapshotKind: overrides.snapshotKind ?? "weekly",
    periodKey: overrides.periodKey ?? "2026-W31",
    periodStart: overrides.periodStart ?? "2026-07-27",
    periodEnd: overrides.periodEnd ?? "2026-07-31",
    timezone: "Europe/Amsterdam",
    payload,
  };
}

describe("Phase 21 Portfolio Stance model", () => {
  it("A. 100% cash is Defensive, never Offensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "cash",
          symbol: "EUR",
          name: "Euro cash",
          quantity: 100_000,
          currentPrice: 1,
          assetType: "cash",
        }),
      ],
    });
    expect(stance.status).toBe("ready");
    expect(stance.score).toBeLessThanOrEqual(24);
    expect(stance.bandId).toBe("defensive");
    expect(stance.drivers.some((row) => row.id === "cash")).toBe(true);
  });

  it("B. cash/bonds heavy stays Defensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 80_000,
          currentPrice: 1,
          assetType: "cash",
        }),
        holding({
          id: "aggh",
          symbol: "AGGH",
          name: "iShares Core Global Aggregate Bond UCITS ETF",
          quantity: 200,
          currentPrice: 100,
        }),
      ],
    });
    expect(stance.bandId).toBe("defensive");
    expect(stance.score).toBeLessThan(30);
  });

  it("C. 100% global diversified equity is not Defensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "vwce",
          symbol: "VWCE",
          name: "FTSE All-World",
          quantity: 100,
          currentPrice: 120,
          providerSymbol: "VWCE.XETRA",
        }),
      ],
    });
    expect(stance.bandId).not.toBe("defensive");
    expect(stance.bandId).not.toBe("moderately_defensive");
    expect(stance.score).toBeGreaterThanOrEqual(56);
    expect(stance.score).toBeLessThan(76);
    expect(stance.bandId).toBe("moderately_offensive");
  });

  it("D. balanced equity / bonds / cash is Neutral", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "vwce",
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 50,
          currentPrice: 100,
        }),
        holding({
          id: "aggh",
          symbol: "AGGH",
          name: "iShares Core Global Aggregate Bond UCITS ETF",
          quantity: 30,
          currentPrice: 100,
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 20,
          currentPrice: 100,
          assetType: "cash",
        }),
      ],
    });
    expect(stance.bandId).toBe("neutral");
    expect(stance.score).toBeGreaterThanOrEqual(45);
    expect(stance.score).toBeLessThanOrEqual(55);
  });

  it("E. concentrated thematic tech is more offensive than global equity", () => {
    const tech = buildPortfolioStance({
      holdings: [
        holding({
          id: "aifs",
          symbol: "AIFS",
          name: "AI infrastructure",
          quantity: 100,
          currentPrice: 100,
          providerSymbol: "AIFS.XETRA",
        }),
      ],
    });
    const global = buildPortfolioStance({
      holdings: [
        holding({
          id: "vwce",
          symbol: "VWCE",
          quantity: 100,
          currentPrice: 100,
          providerSymbol: "VWCE.XETRA",
        }),
      ],
    });
    expect(tech.score!).toBeGreaterThan(global.score!);
    expect(["moderately_offensive", "offensive"]).toContain(tech.bandId);
  });

  it("F. 80% crypto is Offensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.8,
          currentPrice: 100_000,
          assetType: "crypto",
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          quantity: 200,
          currentPrice: 100,
          providerSymbol: "VWCE.XETRA",
        }),
      ],
    });
    expect(stance.bandId).toBe("offensive");
    expect(stance.score).toBeGreaterThanOrEqual(76);
  });

  it("G. 55% crypto + 24% cash is Moderately offensive near 68", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 0.55,
          currentPrice: 100_000,
          assetType: "crypto",
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 24_000,
          currentPrice: 1,
          assetType: "cash",
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          quantity: 210,
          currentPrice: 100,
          providerSymbol: "VWCE.XETRA",
        }),
      ],
    });
    expect(stance.bandId).toBe("moderately_offensive");
    expect(stance.score).toBeGreaterThanOrEqual(60);
    expect(stance.score).toBeLessThanOrEqual(75);
    expect(stance.drivers.some((row) => row.id === "crypto")).toBe(true);
    expect(stance.drivers.some((row) => row.id === "cash")).toBe(true);
  });

  it("H. diversified sleeves sit near Neutral", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "vwce",
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 25,
          currentPrice: 100,
        }),
        holding({
          id: "aifs",
          symbol: "AIFS",
          providerSymbol: "AIFS.XETRA",
          quantity: 15,
          currentPrice: 100,
        }),
        holding({
          id: "aggh",
          symbol: "AGGH",
          name: "iShares Core Global Aggregate Bond UCITS ETF",
          quantity: 20,
          currentPrice: 100,
        }),
        holding({
          id: "ppfb",
          symbol: "PPFB",
          name: "WisdomTree Physical Gold",
          providerSymbol: "PPFB.XETRA",
          quantity: 15,
          currentPrice: 100,
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 15,
          currentPrice: 100,
          assetType: "cash",
        }),
        holding({
          id: "btc",
          symbol: "BTC",
          quantity: 0.0001,
          currentPrice: 100_000,
          assetType: "crypto",
        }),
      ],
    });
    expect(["neutral", "moderately_defensive", "moderately_offensive"]).toContain(
      stance.bandId,
    );
    expect(stance.score).toBeGreaterThanOrEqual(40);
    expect(stance.score).toBeLessThanOrEqual(62);
  });

  it("I / Z. high unclassified lowers confidence and is not redistributed as offensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "mystery",
          symbol: "XYZ",
          name: "Unknown holding",
          quantity: 80,
          currentPrice: 100,
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 20,
          currentPrice: 100,
        }),
      ],
    });
    expect(stance.confidence).toBe("limited");
    expect(stance.bandId).not.toBe("offensive");
    expect(stance.drivers.every((row) => row.id !== "unclassified")).toBe(true);
  });

  it("J. precious-metals heavy is not automatically Defensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "ppfb",
          symbol: "PPFB",
          name: "WisdomTree Physical Gold",
          providerSymbol: "PPFB.XETRA",
          quantity: 40,
          currentPrice: 100,
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 60,
          currentPrice: 100,
        }),
      ],
    });
    expect(stance.bandId).not.toBe("defensive");
    expect(stance.conclusion).not.toMatch(/safe|defensive hedge/i);
  });

  it("K. fixed-income heavy is Defensive", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "aggh",
          symbol: "AGGH",
          name: "iShares Core Global Aggregate Bond UCITS ETF",
          quantity: 80,
          currentPrice: 100,
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 20,
          currentPrice: 100,
          assetType: "cash",
        }),
      ],
    });
    expect(["defensive", "moderately_defensive"]).toContain(stance.bandId);
    expect(stance.score).toBeLessThanOrEqual(30);
  });

  it("reconciles factor contributions to the displayed score", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          quantity: 0.55,
          currentPrice: 100_000,
          assetType: "crypto",
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 24_000,
          currentPrice: 1,
          assetType: "cash",
        }),
        holding({
          id: "vwce",
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 210,
          currentPrice: 100,
        }),
      ],
    });
    const sum = stance.factors
      .filter((factor) => factor.applicable)
      .reduce((total, factor) => total + factor.contributionPoints, 0);
    expect(sum).toBe(stance.score);
    expect(STANCE_FACTOR_WEIGHTS.asset_posture).toBe(0.4);
    expect(STANCE_FACTOR_WEIGHTS.concentration).toBe(0.25);
    expect(STANCE_FACTOR_WEIGHTS.modeled_sensitivity).toBe(0.2);
    expect(STANCE_FACTOR_WEIGHTS.diversification).toBe(0.15);
  });

  it("does not invert the whole resilience score", () => {
    const engine = read("lib/services/portfolioStance/buildPortfolioStance.ts");
    expect(engine).not.toMatch(/100 - .*resilience|invert.*resilience/i);
    expect(engine).toContain("Modeled sensitivity");
  });

  it("records representative fixture scores", () => {
    const scoreOf = (holdings: StoredPortfolioHolding[]) => {
      const stance = buildPortfolioStance({ holdings });
      return `${stance.score} ${stance.bandLabel} ${stance.confidence}`;
    };
    expect({
      A_cash: scoreOf([
        holding({ id: "cash", symbol: "EUR", quantity: 100_000, currentPrice: 1, assetType: "cash" }),
      ]),
      C_global_equity: scoreOf([
        holding({ id: "vwce", symbol: "VWCE", quantity: 100, currentPrice: 120, providerSymbol: "VWCE.XETRA" }),
      ]),
      G_crypto_cash: scoreOf([
        holding({ id: "btc", symbol: "BTC", quantity: 0.55, currentPrice: 100_000, assetType: "crypto" }),
        holding({ id: "cash", symbol: "EUR", quantity: 24_000, currentPrice: 1, assetType: "cash" }),
        holding({ id: "vwce", symbol: "VWCE", quantity: 210, currentPrice: 100, providerSymbol: "VWCE.XETRA" }),
      ]),
    }).toEqual({
      A_cash: "20 Defensive medium",
      C_global_equity: "72 Moderately offensive high",
      G_crypto_cash: "67 Moderately offensive high",
    });
  });
});

describe("Phase 21 stance history", () => {
  const currentHoldings = [
    holding({
      id: "btc",
      symbol: "BTC",
      quantity: 0.55,
      currentPrice: 100_000,
      assetType: "crypto",
    }),
    holding({
      id: "cash",
      symbol: "EUR",
      quantity: 24_000,
      currentPrice: 1,
      assetType: "cash",
    }),
    holding({
      id: "vwce",
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 210,
      currentPrice: 100,
    }),
  ];

  it("K. Neutral → more offensive from stored snapshots only", () => {
    const current = buildPortfolioStance({ holdings: currentHoldings });
    const history = buildPortfolioStanceHistory({
      current,
      asOfDate: "2026-08-21",
      snapshots: [
        snapshot({
          id: "then",
          periodEnd: "2026-07-31",
          payload: {
            exposure: {
              groups: [
                { groupId: "crypto", displayLabel: "Crypto", weightPercent: 20 },
                {
                  groupId: "diversified_equity",
                  displayLabel: "Diversified equity",
                  weightPercent: 50,
                },
                { groupId: "cash", displayLabel: "Cash", weightPercent: 30 },
              ],
              classifiedHoldingCount: 3,
              unclassifiedHoldingCount: 0,
              coverageLabel: null,
            },
            concentration: { largestHoldingWeightPercent: 20 },
            resilience: {
              status: "ok",
              score: 70,
              bandId: "balanced",
              bandLabel: "Balanced",
              primaryDriver: null,
              factors: [],
              mostSensitive: {
                scenarioId: "crypto_minus_20",
                scenarioName: "Crypto −20%",
                estimatedPortfolioImpactPercent: -4,
              },
            },
          },
        }),
      ],
    });
    expect(history.status).toBe("ready");
    expect(history.prior?.bandId).not.toBe("offensive");
    expect(history.change?.material).toBe(true);
    expect(history.change?.toScore).toBeGreaterThan(history.change!.fromScore);
    expect(history.change?.attribution?.some((row) => row.id === "asset_posture")).toBe(
      true,
    );
  });

  it("M. small same-zone movement is not announced as a change", () => {
    const current = buildPortfolioStance({ holdings: currentHoldings });
    const history = buildPortfolioStanceHistory({
      current,
      asOfDate: "2026-08-21",
      snapshots: [
        snapshot({
          periodEnd: "2026-08-16",
          payload: {
            exposure: {
              groups: [
                { groupId: "crypto", displayLabel: "Crypto", weightPercent: 55 },
                { groupId: "cash", displayLabel: "Cash", weightPercent: 24 },
                {
                  groupId: "diversified_equity",
                  displayLabel: "Diversified equity",
                  weightPercent: 21,
                },
              ],
              classifiedHoldingCount: 3,
              unclassifiedHoldingCount: 0,
              coverageLabel: null,
            },
            concentration: { largestHoldingWeightPercent: 54 },
            resilience: {
              status: "ok",
              score: 40,
              bandId: "sensitive",
              bandLabel: "Sensitive",
              primaryDriver: null,
              factors: [],
              mostSensitive: {
                scenarioId: "crypto_minus_20",
                scenarioName: "Crypto −20%",
                estimatedPortfolioImpactPercent: -11,
              },
            },
          },
        }),
      ],
    });
    if (history.change && !history.change.zoneChanged) {
      expect(Math.abs(history.change.pointChange) < STANCE_CHANGE_MATERIAL_SCORE || history.change.material).toBeTruthy();
      if (Math.abs(history.change.pointChange) < STANCE_CHANGE_MATERIAL_SCORE) {
        expect(history.change.material).toBe(false);
      }
    }
  });

  it("N. insufficient history shows building copy", () => {
    const current = buildPortfolioStance({ holdings: currentHoldings });
    const history = buildPortfolioStanceHistory({
      current,
      snapshots: [],
    });
    expect(history.status).toBe("building");
    expect(history.buildingCopy).toBe(STANCE_HISTORY_BUILDING);
  });

  it("O / Y. historical partial coverage does not invent current holdings on old dates", () => {
    const historyEngine = read(
      "lib/services/portfolioStance/buildPortfolioStanceHistory.ts",
    );
    expect(historyEngine).toContain("collectStanceInputsFromSnapshot");
    expect(historyEngine).not.toContain("collectStanceInputsFromHoldings");
    const current = buildPortfolioStance({ holdings: currentHoldings });
    const history = buildPortfolioStanceHistory({
      current,
      snapshots: [
        snapshot({
          payload: {
            portfolio: {
              totalValue: null,
              coverage: {
                holdingCount: 1,
                valuedHoldingCount: 0,
                unvaluedHoldingCount: 1,
                portfolioValueAvailable: false,
              },
            },
          },
        }),
      ],
    });
    expect(history.status).toBe("building");
    expect(history.checkpoints.filter((row) => row.sourceQuality === "stored_snapshot")).toHaveLength(0);
  });
});

describe("Phase 21 goal trade-offs", () => {
  const holdings = [
    holding({
      id: "vwce",
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 400,
      currentPrice: 100,
    }),
  ];

  it("P. behind goal + higher contribution uses the existing goal engine", () => {
    const stance = buildPortfolioStance({ holdings });
    const behindGoal: GoalSettings = {
      ...goal,
      targetYear: 2027,
      monthlyContribution: 750,
      expectedAnnualReturn: 2,
    };
    const tradeOffs = buildGoalTradeOffs({
      goal: behindGoal,
      hasSavedGoal: true,
      currentPortfolioValue: 40_000,
      portfolioValueAvailable: true,
      stance,
      complete: true,
    });
    expect(tradeOffs.pathCopy).toBe(
      "Your current path is behind the target timeline.",
    );
    expect(tradeOffs.pathCopy).not.toMatch(/take more risk/i);
    expect(tradeOffs.contribution.options.some((row) => row.monthly > 750)).toBe(
      true,
    );
  });

  it("Q. on-track copy has no urgency", () => {
    const stance = buildPortfolioStance({ holdings });
    const tradeOffs = buildGoalTradeOffs({
      goal: {
        ...goal,
        targetValue: 50_000,
        targetYear: 2040,
        monthlyContribution: 1_000,
        expectedAnnualReturn: 8,
      },
      hasSavedGoal: true,
      currentPortfolioValue: 45_000,
      portfolioValueAvailable: true,
      stance,
      complete: true,
    });
    expect(tradeOffs.pathCopy).toMatch(/on track/i);
    expect(tradeOffs.pathCopy).not.toMatch(/behind|urgent|take more/i);
  });

  it("R. no goal is unavailable, not invented", () => {
    const stance = buildPortfolioStance({ holdings });
    const tradeOffs = buildGoalTradeOffs({
      goal: null,
      hasSavedGoal: false,
      currentPortfolioValue: 40_000,
      portfolioValueAvailable: true,
      stance,
      complete: true,
    });
    expect(tradeOffs.available).toBe(false);
  });

  it("S. unavailable portfolio value blocks trade-offs", () => {
    const stance = buildPortfolioStance({ holdings });
    const tradeOffs = buildGoalTradeOffs({
      goal,
      hasSavedGoal: true,
      currentPortfolioValue: 0,
      portfolioValueAvailable: false,
      stance,
      complete: true,
    });
    expect(tradeOffs.available).toBe(false);
  });

  it("T. stance return assumptions are blocked", () => {
    const stance = buildPortfolioStance({ holdings });
    const tradeOffs = buildGoalTradeOffs({
      goal,
      hasSavedGoal: true,
      currentPortfolioValue: 40_000,
      portfolioValueAvailable: true,
      stance,
      complete: true,
    });
    expect(tradeOffs.stance.returnAssumptionsAvailable).toBe(false);
    expect(tradeOffs.stance.returnAssumptionsBlockedReason).toBe(
      STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON,
    );
    expect(
      tradeOffs.stance.paths
        .filter((path) => path.id !== "current")
        .every((path) => path.completionAvailable === false),
    ).toBe(true);
    expect(tradeOffs.disclaimer).toBe(STANCE_ILLUSTRATIVE_DISCLAIMER);
  });
});

describe("Phase 21 safety + integration contracts", () => {
  it("V/W/X. copy never advises, never guarantees returns, never uses danger language", () => {
    const stance = buildPortfolioStance({
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          quantity: 1,
          currentPrice: 100_000,
          assetType: "crypto",
        }),
      ],
    });
    const blob = [
      stance.conclusion,
      stance.disclaimer,
      ...stance.drivers.map((row) => `${row.label} ${row.effect}`),
      STANCE_POSITIONING_DISCLAIMER,
    ].join("\n");
    for (const pattern of STANCE_PROHIBITED_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
    expect(stance.disclaimer).toBe(STANCE_POSITIONING_DISCLAIMER);
  });

  it("centralizes bands and change thresholds", () => {
    expect(STANCE_BANDS[0]?.id).toBe("defensive");
    expect(STANCE_CHANGE_MATERIAL_SCORE).toBe(6);
    expect(read("components/portfolioStance/PortfolioStanceMeter.tsx")).not.toMatch(
      /minScore: 56|0–24/,
    );
  });

  it("Four Questions merge does not rewrite glance answers", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        quantity: 0.55,
        currentPrice: 100_000,
        assetType: "crypto",
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 24_000,
        currentPrice: 1,
        assetType: "cash",
      }),
    ];
    const progress = deriveGoalProgress({
      holdings,
      goal,
      hasSavedGoal: true,
    });
    const bundle = buildFourQuestions({
      holdings,
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
    });
    const glance = bundle.questions.map((row) => row.answer);
    const history = buildPortfolioStanceHistory({
      current: buildPortfolioStance({ holdings }),
      asOfDate: "2026-08-21",
      snapshots: [
        snapshot({
          payload: {
            exposure: {
              groups: [
                { groupId: "cash", displayLabel: "Cash", weightPercent: 80 },
                {
                  groupId: "fixed_income",
                  displayLabel: "Fixed income",
                  weightPercent: 20,
                },
              ],
              classifiedHoldingCount: 2,
              unclassifiedHoldingCount: 0,
              coverageLabel: null,
            },
            concentration: { largestHoldingWeightPercent: 80 },
            resilience: {
              status: "ok",
              score: 80,
              bandId: "strong",
              bandLabel: "Strong resilience",
              primaryDriver: null,
              factors: [],
              mostSensitive: {
                scenarioId: "crypto_minus_20",
                scenarioName: "Crypto −20%",
                estimatedPortfolioImpactPercent: -1,
              },
            },
          },
        }),
      ],
    });
    const merged = mergeStanceIntoFourQuestions(bundle, history);
    expect(merged.questions.map((row) => row.answer)).toEqual(glance);
    const q2 = merged.questions.find((row) => row.id === "what_matters_now");
    expect(q2?.expandItems.some((item) => item.id === "stance-zone-shift")).toBe(
      true,
    );
    expect(buildStanceDiscoveredCandidate(history)?.id).toBe("stance-zone-shift");
  });

  it("does not add prices, OpenAI, migrations, cron, or polling", () => {
    const files = [
      "lib/services/portfolioStance/buildCurrentStance.ts",
      "lib/services/portfolioStance/buildPortfolioStanceHistory.ts",
      "lib/services/portfolioStance/buildGoalTradeOffs.ts",
      "components/portfolioStance/DashboardPortfolioStance.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|\/api\/prices|cron|setInterval/i);
    }
  });

  it("integrates compact stance into Evolution, not a new Dashboard card", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const evolutionCard = read(
      "components/portfolioEvolution/DashboardPortfolioEvolutionCard.tsx",
    );
    expect(dashboard).toContain("buildPortfolioStanceHistory");
    expect(dashboard).toContain("stanceHistory={stanceHistory}");
    expect(dashboard).not.toContain("<DashboardPortfolioStance");
    expect(evolutionCard).toContain("DashboardPortfolioStance");
    expect(dashboard.match(/usePortfolioPerformanceHistory\(/g)?.length).toBe(2);
    expect(dashboard).toContain("stanceHistory");
    expect(read("lib/services/fourQuestions/buildFourQuestions.ts")).toContain(
      "mergeStanceIntoFourQuestions",
    );
  });
});
