/**
 * Dimension scorers for Portfolio Health Score v1.
 */

import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { ExposureGroupId } from "@/lib/services/classification/types";
import {
  BROAD_ETF_CREDIT_MIN_WEIGHT,
  BROAD_ETF_CREDIT_POINTS,
  CONCENTRATION_THRESHOLDS,
  DIVERSIFICATION_COUNTABLE_GROUPS,
  DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
  LIQUIDITY_CASH,
  RISK_BALANCE,
} from "@/lib/services/portfolio/healthScore/config";
import {
  clampScore,
  formatPercent,
  interpolateAnchors,
  yearsRemaining,
} from "@/lib/services/portfolio/healthScore/math";
import type {
  DimensionScoreDraft,
  HealthScoreEvidence,
  PortfolioHealthScoreInput,
} from "@/lib/services/portfolio/healthScore/types";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";

function statusFromScore(
  score: number,
): "strong" | "adequate" | "watch" | "weak" {
  if (score >= 80) return "strong";
  if (score >= 65) return "adequate";
  if (score >= 45) return "watch";
  return "weak";
}

export { statusFromScore };

export function scoreConcentrationDimension(
  analysis: PortfolioAnalysisSnapshot,
): DimensionScoreDraft {
  const evidence: HealthScoreEvidence[] = [];
  const largest = analysis.largestPosition?.weightPercent ?? null;
  const topThree = analysis.topThreeWeightPercent;
  const hhi = analysis.hhi;

  if (!analysis.valuedPositions.length) {
    return {
      id: "concentration",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "concentration-empty",
          text: "No valued holdings available to measure concentration.",
        },
      ],
      explanation: "Concentration is not applicable without valued holdings.",
    };
  }

  const largestScore =
    largest == null
      ? 50
      : interpolateAnchors(largest, CONCENTRATION_THRESHOLDS.largest);
  const topThreeScore = interpolateAnchors(
    topThree,
    CONCENTRATION_THRESHOLDS.topThree,
  );
  const hhiScore = interpolateAnchors(hhi, CONCENTRATION_THRESHOLDS.hhi);

  const rawScore = clampScore(
    largestScore * 0.45 + topThreeScore * 0.3 + hhiScore * 0.25,
  );

  if (largest != null && analysis.largestPosition) {
    evidence.push({
      id: "largest-weight",
      text: `Largest holding (${analysis.largestPosition.holding.symbol}) represents ${formatPercent(largest)} of portfolio value.`,
      metricKey: "largestHoldingWeightPercent",
      metricValue: Number(largest.toFixed(1)),
    });
  }
  evidence.push({
    id: "top-three-weight",
    text: `Top three holdings represent ${formatPercent(topThree)} of portfolio value.`,
    metricKey: "topThreeWeightPercent",
    metricValue: Number(topThree.toFixed(1)),
  });
  evidence.push({
    id: "hhi",
    text: `Herfindahl-Hirschman Index is ${hhi.toFixed(3)} (0 = fully dispersed, 1 = single holding).`,
    metricKey: "hhi",
    metricValue: Number(hhi.toFixed(3)),
  });

  return {
    id: "concentration",
    applicable: true,
    rawScore,
    evidence,
    explanation:
      "Concentration measures how dependent portfolio value is on a small set of holdings.",
  };
}

function countableExposureGroups(
  exposure: PortfolioExposureAllocation,
): Array<{ groupId: ExposureGroupId; weight: number }> {
  const countable = new Set<string>(DIVERSIFICATION_COUNTABLE_GROUPS);
  return exposure.groups
    .filter(
      (group) =>
        countable.has(group.groupId) &&
        group.displayPercent >= DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT,
    )
    .map((group) => ({
      groupId: group.groupId,
      weight: group.displayPercent,
    }));
}

/**
 * Diversification counts economically distinct exposure groups, not ticker count.
 * Overlapping holdings in the same group count once.
 * `diversified_equity` receives extra credit as broad underlying exposure.
 */
export function scoreDiversificationDimension(
  exposure: PortfolioExposureAllocation,
  profile: PortfolioHealthProfile,
  analysis: PortfolioAnalysisSnapshot,
): DimensionScoreDraft {
  const evidence: HealthScoreEvidence[] = [];

  if (!profile.hasValuedPortfolio || analysis.totalValue <= 0) {
    return {
      id: "diversification",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "diversification-empty",
          text: "No valued holdings available to measure diversification.",
        },
      ],
      explanation: "Diversification is not applicable without valued holdings.",
    };
  }

  const groups = countableExposureGroups(exposure);
  const distinctCount = groups.length;
  const cryptoWeight = profile.classification.cryptoWeight;
  const cryptoDominant = cryptoWeight >= 70;

  // Breadth curve: 1 group → low, 4+ → high
  let breadthScore = interpolateAnchors(distinctCount, [
    { at: 1, score: 22 },
    { at: 2, score: 48 },
    { at: 3, score: 68 },
    { at: 4, score: 82 },
    { at: 5, score: 90 },
    { at: 6, score: 94 },
  ]);

  const diversifiedEquity = exposure.groups.find(
    (group) => group.groupId === "diversified_equity",
  );
  const broadEtfWeight = diversifiedEquity?.displayPercent ?? 0;
  if (broadEtfWeight >= BROAD_ETF_CREDIT_MIN_WEIGHT) {
    breadthScore = clampScore(breadthScore + BROAD_ETF_CREDIT_POINTS);
    evidence.push({
      id: "broad-etf-credit",
      text: `Diversified equity exposure of ${formatPercent(broadEtfWeight)} receives broad-market diversification credit.`,
      metricKey: "diversifiedEquityWeightPercent",
      metricValue: Number(broadEtfWeight.toFixed(1)),
    });
  }

  // Crypto-only books: reward within-crypto breadth instead of traditional asset-class count.
  if (cryptoDominant) {
    const within =
      profile.dna.characteristics.find((c) => c.id === "within_crypto_breadth")
        ?.value ?? null;
    const withinScore =
      within === "Broad" ? 78 : within === "Moderate" ? 58 : 32;
    breadthScore = clampScore(breadthScore * 0.35 + withinScore * 0.65);
    evidence.push({
      id: "within-crypto-breadth",
      text: `Crypto-dominant portfolio: within-crypto breadth is ${within ?? "Limited"}.`,
      metricKey: "withinCryptoBreadth",
      metricValue: within,
    });
  }

  // Soft penalty when many holdings collapse into one exposure group (overlap).
  const investmentCount = analysis.investmentCount;
  const overlapRatio =
    distinctCount > 0 ? investmentCount / Math.max(distinctCount, 1) : 1;
  if (investmentCount >= 4 && distinctCount <= 2 && !cryptoDominant) {
    breadthScore = clampScore(breadthScore - 12);
    evidence.push({
      id: "overlapping-exposures",
      text: `${investmentCount} market holdings map to only ${distinctCount} economically distinct exposure groups — overlapping exposures are not fully independent.`,
      metricKey: "distinctExposureGroups",
      metricValue: distinctCount,
    });
  } else if (overlapRatio > 3 && distinctCount <= 3 && !cryptoDominant) {
    breadthScore = clampScore(breadthScore - 6);
  }

  evidence.unshift({
    id: "distinct-groups",
    text: `Portfolio spans ${distinctCount} economically distinct exposure group${distinctCount === 1 ? "" : "s"} at or above ${DIVERSIFICATION_MIN_GROUP_WEIGHT_PERCENT}% weight.`,
    metricKey: "distinctExposureGroups",
    metricValue: distinctCount,
  });

  return {
    id: "diversification",
    applicable: true,
    rawScore: breadthScore,
    evidence,
    explanation:
      "Diversification counts distinct exposure groups and broad-market ETFs — not raw ticker count.",
  };
}

export function scoreRiskBalanceDimension(
  input: PortfolioHealthScoreInput,
): DimensionScoreDraft {
  const { profile, goal, hasSavedGoal, now } = input;
  const evidence: HealthScoreEvidence[] = [];

  if (!profile.hasValuedPortfolio) {
    return {
      id: "risk_balance",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "risk-empty",
          text: "Expected volatility is unavailable without valued holdings.",
        },
      ],
      explanation: "Risk balance is not applicable without valued holdings.",
    };
  }

  const volIndex = profile.expectedVolatility.index;
  const volLevel = profile.expectedVolatility.level;
  const crypto = profile.classification.cryptoWeight;
  const cash = profile.classification.cashWeight;
  const years = hasSavedGoal ? yearsRemaining(goal?.targetYear, now) : null;

  evidence.push({
    id: "expected-volatility",
    text: `Expected volatility is ${volLevel} (structural index ${volIndex.toFixed(2)}).`,
    metricKey: "expectedVolatilityIndex",
    metricValue: Number(volIndex.toFixed(2)),
  });
  evidence.push({
    id: "crypto-weight",
    text: `Crypto allocation is ${formatPercent(crypto)} of portfolio value.`,
    metricKey: "cryptoWeightPercent",
    metricValue: Number(crypto.toFixed(1)),
  });

  // Appropriateness: mid-range risk is fine for long growth; high risk weak for near-term goals.
  let appropriateness = 70;

  if (years != null && years <= RISK_BALANCE.nearHorizonYears) {
    // Near-term: prefer lower crypto / lower vol
    if (crypto > RISK_BALANCE.cryptoIdealMaxNearHorizon) {
      appropriateness -= Math.min(
        35,
        (crypto - RISK_BALANCE.cryptoIdealMaxNearHorizon) * 0.7,
      );
    }
    if (volIndex >= 0.72) appropriateness -= 18;
    else if (volIndex >= 0.55) appropriateness -= 10;
    else if (volIndex <= 0.35) appropriateness += 8;
    evidence.push({
      id: "near-horizon-risk",
      text: `Goal horizon is about ${years.toFixed(1)} years — elevated volatility increases near-term structural mismatch.`,
      metricKey: "goalYearsRemaining",
      metricValue: Number(years.toFixed(1)),
    });
  } else if (years != null && years >= RISK_BALANCE.longHorizonYears) {
    // Long horizon: moderate-high risk is acceptable; very low risk + high cash is a drag
    if (crypto <= RISK_BALANCE.cryptoIdealMaxLongHorizon) {
      appropriateness += 6;
    } else if (crypto > 75) {
      appropriateness -= 10;
    }
    if (volIndex < 0.2 && cash > 40) {
      appropriateness -= 12;
      evidence.push({
        id: "long-horizon-cash-drag",
        text: `Long horizon with cash at ${formatPercent(cash)} and very low expected volatility may under-use growth capacity.`,
        metricKey: "cashWeightPercent",
        metricValue: Number(cash.toFixed(1)),
      });
    }
  } else {
    // No goal: score balance — extreme concentration in high-vol assets reduces score
    if (crypto > RISK_BALANCE.cryptoIdealMaxNoGoal) {
      appropriateness -= Math.min(
        28,
        (crypto - RISK_BALANCE.cryptoIdealMaxNoGoal) * 0.55,
      );
    }
    if (volIndex >= 0.85) appropriateness -= 12;
    else if (volIndex <= 0.25 && cash < 5) appropriateness += 4;
  }

  // Defensive cash within a sensible band can improve balance for high-vol books
  if (
    volIndex >= 0.55 &&
    cash >= RISK_BALANCE.cashDefensiveBoostMin &&
    cash <= RISK_BALANCE.cashDefensiveBoostMax
  ) {
    appropriateness += 6;
  }

  const rawScore = clampScore(appropriateness);

  return {
    id: "risk_balance",
    applicable: true,
    rawScore,
    evidence,
    explanation:
      "Risk balance scores appropriateness of volatility and crypto allocation for the goal horizon — not “lower risk is always better.”",
  };
}

export function scoreGoalAlignmentDimension(
  input: PortfolioHealthScoreInput,
): DimensionScoreDraft {
  const { profile, hasSavedGoal, goal, now } = input;

  if (!hasSavedGoal || !goal) {
    return {
      id: "goal_alignment",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "goal-missing",
          text: "No savings goal is configured — goal alignment is excluded and remaining weights are renormalized.",
        },
      ],
      explanation:
        "Goal alignment is not applicable without a configured goal.",
    };
  }

  const label = profile.goalAlignment.label;
  const base =
    label === "Strong alignment"
      ? 88
      : label === "Partial alignment"
        ? 64
        : label === "Limited alignment"
          ? 38
          : 55;

  const years = yearsRemaining(goal.targetYear, now);
  const volIndex = profile.expectedVolatility.index;
  let score = base;

  if (years != null && years <= 5 && volIndex >= 0.72) {
    score -= 12;
  }
  if (years != null && years >= 12 && volIndex >= 0.35 && volIndex <= 0.75) {
    score += 6;
  }

  const evidence: HealthScoreEvidence[] = [
    {
      id: "goal-fit-label",
      text: `Goal-fit assessment: ${label}. ${profile.goalAlignment.reason}`,
      metricKey: "goalAlignmentLabel",
      metricValue: label,
    },
  ];
  if (years != null) {
    evidence.push({
      id: "goal-years",
      text: `About ${years.toFixed(1)} years remain until the target year ${goal.targetYear}.`,
      metricKey: "goalYearsRemaining",
      metricValue: Number(years.toFixed(1)),
    });
  }

  return {
    id: "goal_alignment",
    applicable: true,
    rawScore: clampScore(score),
    evidence,
    explanation:
      "Goal alignment compares portfolio risk identity with horizon and goal assumptions.",
  };
}

export function scoreLiquidityCashDimension(
  input: PortfolioHealthScoreInput,
): DimensionScoreDraft {
  const { profile, hasSavedGoal, goal, now, analysis } = input;
  const cash = profile.classification.cashWeight;
  const evidence: HealthScoreEvidence[] = [];

  if (!profile.hasValuedPortfolio && analysis.totalValue <= 0) {
    return {
      id: "liquidity_cash",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "liquidity-empty",
          text: "Cash resilience cannot be scored without portfolio value.",
        },
      ],
      explanation: "Liquidity is not applicable without valued holdings.",
    };
  }

  evidence.push({
    id: "cash-weight",
    text: `Recorded cash allocation is ${formatPercent(cash)} of portfolio value.`,
    metricKey: "cashWeightPercent",
    metricValue: Number(cash.toFixed(1)),
  });

  const years = hasSavedGoal ? yearsRemaining(goal?.targetYear, now) : null;
  let score = 72;

  if (cash >= LIQUIDITY_CASH.extremeCashPercent) {
    score = interpolateAnchors(cash, [
      { at: 70, score: 42 },
      { at: 85, score: 28 },
      { at: 100, score: 18 },
    ]);
    evidence.push({
      id: "extreme-cash",
      text: "Cash concentration is extreme relative to a diversified invested portfolio.",
    });
  } else if (years != null && years <= LIQUIDITY_CASH.nearTermYears) {
    if (
      cash >= LIQUIDITY_CASH.nearTermBufferIdealMin &&
      cash <= LIQUIDITY_CASH.nearTermBufferIdealMax
    ) {
      score = 88;
    } else if (cash < LIQUIDITY_CASH.nearTermBufferIdealMin) {
      score = 52;
      evidence.push({
        id: "near-term-buffer",
        text: "Near-term goal horizon with little recorded cash buffer increases liquidity sensitivity.",
      });
    } else {
      score = 60;
    }
  } else if (cash >= LIQUIDITY_CASH.longTermHighCashPercent) {
    score = interpolateAnchors(cash, [
      { at: 40, score: 58 },
      { at: 55, score: 45 },
      { at: 70, score: 36 },
    ]);
    evidence.push({
      id: "long-term-cash",
      text: "Elevated cash on a longer horizon reduces invested diversification capacity.",
    });
  } else if (cash === 0) {
    score = years != null && years <= LIQUIDITY_CASH.nearTermYears ? 48 : 70;
  } else if (cash > 0 && cash < 40) {
    score = 80;
  }

  // Cash-only portfolio
  if (cash >= 95) {
    score = 40;
    evidence.push({
      id: "cash-only",
      text: "Portfolio is effectively cash-only — resilient for liquidity, limited for growth diversification.",
    });
  }

  return {
    id: "liquidity_cash",
    applicable: true,
    rawScore: clampScore(score),
    evidence,
    explanation:
      "Liquidity scores cash resilience in context of horizon — not a universal ideal cash percentage.",
  };
}

export function scoreIncomeAlignmentDimension(
  input: PortfolioHealthScoreInput,
): DimensionScoreDraft {
  const { goal, hasSavedGoal, dividends, profile } = input;
  const target = goal?.passiveIncomeTarget;

  if (
    !hasSavedGoal ||
    target == null ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return {
      id: "income_alignment",
      applicable: false,
      rawScore: null,
      evidence: [
        {
          id: "income-na",
          text: "No passive-income goal is configured — income alignment is excluded.",
        },
      ],
      explanation:
        "Income alignment applies only when a passive-income goal exists.",
    };
  }

  const evidence: HealthScoreEvidence[] = [
    {
      id: "income-target",
      text: `Passive-income goal target is configured (${target}).`,
      metricKey: "passiveIncomeTarget",
      metricValue: target,
    },
  ];

  const estimated = dividends?.passiveIncome?.hasUsableEstimate
    ? dividends.estimatedAnnualIncomeEur
    : null;
  const identity = profile.hero.identity;
  const isIncomeBuilder = identity === "Income Builder";

  let score = 50;
  if (estimated != null && estimated > 0) {
    const coverage = Math.min(1.5, estimated / target);
    score = clampScore(40 + coverage * 40);
    evidence.push({
      id: "income-estimate",
      text: `Estimated annual portfolio income is available relative to the passive-income target (coverage ratio ${(estimated / target).toFixed(2)}).`,
      metricKey: "incomeCoverageRatio",
      metricValue: Number((estimated / target).toFixed(2)),
    });
  } else {
    score = isIncomeBuilder ? 58 : 34;
    evidence.push({
      id: "income-structure",
      text: isIncomeBuilder
        ? "Portfolio identity suggests income orientation, but quantified income coverage is incomplete."
        : "Passive-income goal is set, yet estimated distributing income coverage is unavailable or low.",
    });
  }

  return {
    id: "income_alignment",
    applicable: true,
    rawScore: clampScore(score),
    evidence,
    explanation:
      "Income alignment compares distributing/income capacity with a configured passive-income goal.",
  };
}
