/**
 * Portfolio Health Score v1 — configuration, weights, thresholds, bands.
 * Structural health only: not expected return, advice, or investment quality.
 */

export const PORTFOLIO_HEALTH_SCORE_VERSION = "phs-v1" as const;

export type HealthScoreDimensionId =
  | "concentration"
  | "diversification"
  | "risk_balance"
  | "goal_alignment"
  | "liquidity_cash"
  | "income_alignment";

/** Base weights before applicability renormalization. Sum = 100. */
export const HEALTH_SCORE_BASE_WEIGHTS: Record<HealthScoreDimensionId, number> =
  {
    concentration: 22,
    diversification: 20,
    risk_balance: 18,
    goal_alignment: 18,
    liquidity_cash: 12,
    income_alignment: 10,
  };

export const HEALTH_SCORE_DIMENSION_LABELS: Record<
  HealthScoreDimensionId,
  string
> = {
  concentration: "Concentration",
  diversification: "Diversification",
  risk_balance: "Risk balance",
  goal_alignment: "Goal alignment",
  liquidity_cash: "Liquidity & cash",
  income_alignment: "Income alignment",
};

/**
 * Smooth concentration scoring thresholds (portfolio %).
 * Interpolate between anchors — avoid cliff edges.
 */
export const CONCENTRATION_THRESHOLDS = {
  largest: [
    { at: 12, score: 96 },
    { at: 20, score: 88 },
    { at: 25, score: 78 },
    { at: 35, score: 62 },
    { at: 45, score: 45 },
    { at: 60, score: 28 },
    { at: 80, score: 12 },
    { at: 100, score: 4 },
  ],
  topThree: [
    { at: 35, score: 96 },
    { at: 50, score: 82 },
    { at: 65, score: 64 },
    { at: 80, score: 42 },
    { at: 95, score: 20 },
    { at: 100, score: 8 },
  ],
  /** HHI on 0–1 scale */
  hhi: [
    { at: 0.08, score: 96 },
    { at: 0.15, score: 82 },
    { at: 0.25, score: 60 },
    { at: 0.4, score: 38 },
    { at: 0.6, score: 18 },
    { at: 1, score: 4 },
  ],
} as const;

/** Distinct exposure groups (≥ MIN_GROUP_WEIGHT_PERCENT) that count toward breadth. */
export const DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT = 3;

/**
 * Groups that represent economically distinct exposures.
 * `diversified_equity` counts as a broad underlying (ETF-style) exposure.
 * `other_unclassified` does not count toward diversification credit.
 */
export const DIVERSIFICATION_COUNTABLE_GROUPS = [
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
  "diversified_equity",
  "crypto",
  "cash",
] as const;

/** Extra diversification credit when diversified_equity ≥ this weight. */
export const BROAD_ETF_CREDIT_MIN_WEIGHT = 25;
export const BROAD_ETF_CREDIT_POINTS = 12;

export const RISK_BALANCE = {
  /** Soft ideal crypto bands by goal years remaining (null = no goal). */
  cryptoIdealMaxNoGoal: 45,
  cryptoIdealMaxLongHorizon: 55,
  cryptoIdealMaxNearHorizon: 20,
  nearHorizonYears: 5,
  longHorizonYears: 12,
  cashDefensiveBoostMin: 8,
  cashDefensiveBoostMax: 35,
} as const;

export const LIQUIDITY_CASH = {
  /** Extreme cash concentration ceiling. */
  extremeCashPercent: 70,
  /** Near-term goal prefers some buffer. */
  nearTermBufferIdealMin: 5,
  nearTermBufferIdealMax: 25,
  nearTermYears: 5,
  /** Long-term growth: very high cash is a structural drag. */
  longTermHighCashPercent: 40,
} as const;

export type HealthScoreBandId =
  | "structurally_fragile"
  | "needs_attention"
  | "balanced_foundation"
  | "strong_structure"
  | "highly_resilient";

export type HealthScoreBandTone =
  "fragile" | "attention" | "balanced" | "strong" | "resilient";

export const HEALTH_SCORE_BANDS: Array<{
  id: HealthScoreBandId;
  min: number;
  max: number;
  label: string;
  explanation: string;
  tone: HealthScoreBandTone;
}> = [
  {
    id: "structurally_fragile",
    min: 0,
    max: 39,
    label: "Structurally fragile",
    explanation:
      "Portfolio structure shows high concentration or weak alignment relative to available data.",
    tone: "fragile",
  },
  {
    id: "needs_attention",
    min: 40,
    max: 59,
    label: "Needs structural attention",
    explanation:
      "Several structural dimensions leave the portfolio more sensitive to single drivers.",
    tone: "attention",
  },
  {
    id: "balanced_foundation",
    min: 60,
    max: 74,
    label: "Balanced foundation",
    explanation:
      "Core structure is workable, with clear room to strengthen resilience or alignment.",
    tone: "balanced",
  },
  {
    id: "strong_structure",
    min: 75,
    max: 89,
    label: "Strong structure",
    explanation:
      "Diversification, concentration, and alignment form a resilient structural profile.",
    tone: "strong",
  },
  {
    id: "highly_resilient",
    min: 90,
    max: 100,
    label: "Highly resilient structure",
    explanation:
      "Structural balance, diversification, and goal fit are strong on the available evidence.",
    tone: "resilient",
  },
];

export type HealthConfidenceLabel =
  "High confidence" | "Moderate confidence" | "Limited confidence";

export const CONFIDENCE_THRESHOLDS = {
  highMinCoverage: 90,
  moderateMinCoverage: 70,
  highMaxUnvaluedShare: 5,
  moderateMaxUnvaluedShare: 15,
} as const;

export const HEALTH_SCORE_DISCLAIMER =
  "Portfolio Health Score describes structure and alignment from available data. It does not predict returns, guarantee outcomes, or provide financial advice.";
