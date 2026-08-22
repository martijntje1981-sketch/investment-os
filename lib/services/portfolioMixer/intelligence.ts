import {
  interpolateAnchors,
  roundScore,
} from "@/lib/services/portfolio/healthScore/math";
import {
  ASSET_POSTURE_TENDENCY,
  bandFromStanceScore,
  CONCENTRATION_STABILIZING_SCORE,
  CONCENTRATION_STANCE_ANCHORS,
  DIVERSIFICATION_STANCE_ANCHORS,
  STANCE_FACTOR_WEIGHTS,
  STANCE_POSITIONING_DISCLAIMER,
} from "@/lib/services/portfolioStance/config";
import { mixerAllocationTotal } from "@/lib/services/portfolioMixer/allocation";
import type {
  MixerAllocation,
  MixerEconomicSleeveId,
  MixerInsight,
  MixerIntelligence,
  MixerSimpleStance,
} from "@/lib/services/portfolioMixer/types";

const ECONOMIC_LABELS: Record<MixerEconomicSleeveId, string> = {
  stocks: "stocks",
  bonds: "bonds",
  crypto: "Bitcoin and other crypto",
  commodities: "commodities",
  cash: "cash",
};

const POSTURE_BY_ECONOMIC: Record<MixerEconomicSleeveId, number> = {
  stocks: ASSET_POSTURE_TENDENCY.diversified_equity,
  bonds: ASSET_POSTURE_TENDENCY.fixed_income,
  crypto: ASSET_POSTURE_TENDENCY.crypto,
  commodities: ASSET_POSTURE_TENDENCY.precious_metals,
  cash: ASSET_POSTURE_TENDENCY.cash,
};

const STABILIZING = new Set<MixerEconomicSleeveId>(["bonds", "cash"]);

const MEANINGFUL_SLEEVE = 8;
const DOMINANT_MIN = 35;
const DOMINANT_GAP = 8;
const CONCENTRATED_AT = 50;
const DEFENSIVE_HELP_AT = 25;
const LIMITED_DEFENSIVE_AT = 10;
const CRYPTO_SENSITIVE_AT = 20;
const EQUITY_SENSITIVE_AT = 60;
const BOND_SENSITIVE_AT = 40;
const COMMODITY_SENSITIVE_AT = 25;
const CASH_INSULATED_AT = 70;

export function economicWeights(allocation: MixerAllocation): Record<
  MixerEconomicSleeveId,
  number
> {
  return {
    stocks: allocation.stocks,
    bonds: allocation.bonds,
    crypto: allocation.bitcoin + allocation.other_crypto,
    commodities: allocation.commodities,
    cash: allocation.cash,
  };
}

function simpleStanceFromBand(
  bandId: MixerIntelligence["stanceBandId"],
): MixerSimpleStance {
  if (bandId === "defensive" || bandId === "moderately_defensive") {
    return "Defensive";
  }
  if (bandId === "offensive" || bandId === "moderately_offensive") {
    return "Offensive";
  }
  return "Neutral";
}

function scoreMix(weights: Record<MixerEconomicSleeveId, number>): {
  score: number;
  bandId: MixerIntelligence["stanceBandId"];
  bandLabel: string;
  distinct: number;
  largest: { id: MixerEconomicSleeveId; percent: number };
} {
  const entries = (
    Object.entries(weights) as Array<[MixerEconomicSleeveId, number]>
  ).filter(([, percent]) => percent > 0);

  let postureWeighted = 0;
  let classified = 0;
  for (const [id, percent] of entries) {
    postureWeighted += percent * POSTURE_BY_ECONOMIC[id];
    classified += percent;
  }
  const posture = classified > 0 ? postureWeighted / classified : 50;

  const largest = entries.reduce(
    (current, [id, percent]) =>
      percent > current.percent ? { id, percent } : current,
    { id: "stocks" as MixerEconomicSleeveId, percent: 0 },
  );
  const concentration = STABILIZING.has(largest.id)
    ? CONCENTRATION_STABILIZING_SCORE
    : interpolateAnchors(largest.percent, CONCENTRATION_STANCE_ANCHORS);

  const distinct = entries.filter(
    ([, percent]) => percent >= MEANINGFUL_SLEEVE,
  ).length;
  const diversification = interpolateAnchors(
    Math.max(1, distinct),
    DIVERSIFICATION_STANCE_ANCHORS,
  );

  const factors = [
    { score: posture, weight: STANCE_FACTOR_WEIGHTS.asset_posture },
    { score: concentration, weight: STANCE_FACTOR_WEIGHTS.concentration },
    { score: diversification, weight: STANCE_FACTOR_WEIGHTS.diversification },
  ];
  const weightSum = factors.reduce((sum, row) => sum + row.weight, 0);
  const score = roundScore(
    factors.reduce((sum, row) => sum + (row.score * row.weight) / weightSum, 0),
  );
  const band = bandFromStanceScore(score);

  return {
    score,
    bandId: band.id,
    bandLabel: band.label,
    distinct,
    largest,
  };
}

function dominantEconomicSleeve(
  weights: Record<MixerEconomicSleeveId, number>,
): MixerEconomicSleeveId | null {
  const ranked = (
    Object.entries(weights) as Array<[MixerEconomicSleeveId, number]>
  ).sort((left, right) => right[1] - left[1]);
  const [first, second] = ranked;
  if (!first || first[1] < DOMINANT_MIN) return null;
  if (second && first[1] - second[1] < DOMINANT_GAP) return null;
  return first[0];
}

function characterInsight(
  stance: MixerSimpleStance,
  dominant: MixerEconomicSleeveId | null,
): MixerInsight {
  if (stance === "Offensive") {
    return {
      id: "character",
      label: "Portfolio character",
      body: "Growth and risk assets dominate how this mix behaves.",
    };
  }
  if (stance === "Defensive") {
    return {
      id: "character",
      label: "Portfolio character",
      body: "Bonds and cash dominate how this mix behaves.",
    };
  }
  if (!dominant) {
    return {
      id: "character",
      label: "Portfolio character",
      body: "This mix does not lean strongly defensive or offensive.",
    };
  }
  return {
    id: "character",
    label: "Portfolio character",
    body: "This mix sits near the middle: neither clearly defensive nor clearly offensive.",
  };
}

function driverInsight(
  weights: Record<MixerEconomicSleeveId, number>,
  dominant: MixerEconomicSleeveId | null,
): MixerInsight {
  if (weights.crypto >= CRYPTO_SENSITIVE_AT || dominant === "crypto") {
    return {
      id: "driver",
      label: "What matters",
      body: "Bitcoin and other crypto would likely drive a disproportionate amount of short-term volatility.",
    };
  }
  if (dominant === "stocks") {
    return {
      id: "driver",
      label: "What matters",
      body: "Stocks are likely to drive most of this mix's day-to-day behaviour.",
    };
  }
  if (dominant === "bonds") {
    return {
      id: "driver",
      label: "What matters",
      body: "Bonds are likely to drive how this mix responds to interest-rate moves.",
    };
  }
  if (dominant === "cash") {
    return {
      id: "driver",
      label: "What matters",
      body: "Cash is the largest sleeve, so market moves would likely have a smaller effect than in a growth-heavy mix.",
    };
  }
  if (dominant === "commodities") {
    return {
      id: "driver",
      label: "What matters",
      body: "Commodities are likely to drive a large share of this mix's behaviour.",
    };
  }
  return {
    id: "driver",
    label: "What matters",
    body: "No single sleeve is large enough to dominate this mix on its own.",
  };
}

function balanceInsight(input: {
  allocation: MixerAllocation;
  weights: Record<MixerEconomicSleeveId, number>;
  concentrated: boolean;
  largest: { id: MixerEconomicSleeveId; percent: number };
  distinct: number;
}): MixerInsight {
  const { allocation, weights, concentrated, largest, distinct } = input;
  const defensive = weights.bonds + weights.cash;
  const splitCrypto =
    allocation.bitcoin >= MEANINGFUL_SLEEVE &&
    allocation.other_crypto >= MEANINGFUL_SLEEVE;

  if (splitCrypto) {
    return {
      id: "balance",
      label: "Diversification",
      body: "Bitcoin and other crypto are treated as one risk family, not as diversification away from each other.",
    };
  }

  if (concentrated) {
    return {
      id: "balance",
      label: "Concentration",
      body: `This mix is concentrated in ${ECONOMIC_LABELS[largest.id]}.`,
    };
  }

  if (defensive >= DEFENSIVE_HELP_AT) {
    return {
      id: "balance",
      label: "What helps",
      body: "Bonds and cash provide some defensive balance.",
    };
  }

  if (weights.crypto >= CRYPTO_SENSITIVE_AT) {
    return {
      id: "balance",
      label: "Sensitivity",
      body: "This mix may be particularly sensitive to sharp crypto price moves. That is a description of exposure, not a forecast.",
    };
  }
  if (weights.stocks >= EQUITY_SENSITIVE_AT) {
    return {
      id: "balance",
      label: "Sensitivity",
      body: "This mix may be particularly sensitive to broad equity-market declines. That is a description of exposure, not a forecast.",
    };
  }
  if (weights.bonds >= BOND_SENSITIVE_AT) {
    return {
      id: "balance",
      label: "Sensitivity",
      body: "This mix may be particularly sensitive to interest-rate moves. That is a description of exposure, not a forecast.",
    };
  }
  if (weights.commodities >= COMMODITY_SENSITIVE_AT) {
    return {
      id: "balance",
      label: "Sensitivity",
      body: "This mix may be particularly sensitive to commodity-price swings. That is a description of exposure, not a forecast.",
    };
  }
  if (weights.cash >= CASH_INSULATED_AT) {
    return {
      id: "balance",
      label: "Sensitivity",
      body: "Market shocks would likely move this mix less than a growth-heavy allocation.",
    };
  }

  if (defensive < LIMITED_DEFENSIVE_AT) {
    return {
      id: "balance",
      label: "Defensive balance",
      body: "This mix has little in bonds or cash, so there is limited defensive balance.",
    };
  }

  if (distinct >= 4) {
    return {
      id: "balance",
      label: "Diversification",
      body: "This mix contains several meaningfully different asset types.",
    };
  }

  return {
    id: "balance",
    label: "Diversification",
    body: "This mix uses more than one asset type, without a single sleeve taking most of the weight.",
  };
}

export function buildMixerIntelligence(
  allocation: MixerAllocation,
): MixerIntelligence {
  const weights = economicWeights(allocation);
  const scored = scoreMix(weights);
  const stance = simpleStanceFromBand(scored.bandId);
  const dominant = dominantEconomicSleeve(weights);
  const concentrated = scored.largest.percent >= CONCENTRATED_AT;
  const insights: [MixerInsight, MixerInsight, MixerInsight] = [
    characterInsight(stance, dominant),
    driverInsight(weights, dominant),
    balanceInsight({
      allocation,
      weights,
      concentrated,
      largest: scored.largest,
      distinct: scored.distinct,
    }),
  ];

  return {
    allocation,
    total: mixerAllocationTotal(allocation),
    stance,
    stanceBandId: scored.bandId,
    stanceBandLabel: scored.bandLabel,
    score: scored.score,
    dominantEconomicSleeve: dominant,
    concentrated,
    cryptoClusterPercent: weights.crypto,
    defensivePercent: weights.bonds + weights.cash,
    distinctEconomicSleeves: scored.distinct,
    insights,
    disclaimer: STANCE_POSITIONING_DISCLAIMER,
  };
}
