/**
 * Public Portfolio Mixer — simplified allocation check.
 * Not a portfolio, not holdings, and not investment advice.
 */

export const MIXER_SLEEVE_IDS = [
  "stocks",
  "bonds",
  "bitcoin",
  "other_crypto",
  "commodities",
  "cash",
] as const;

export type MixerSleeveId = (typeof MIXER_SLEEVE_IDS)[number];

export type MixerAllocation = Record<MixerSleeveId, number>;

export type MixerEconomicSleeveId =
  | "stocks"
  | "bonds"
  | "crypto"
  | "commodities"
  | "cash";

export type MixerSimpleStance = "Defensive" | "Neutral" | "Offensive";

export type MixerInsight = {
  id: "character" | "driver" | "balance";
  label: string;
  body: string;
};

export type MixerIntelligence = {
  allocation: MixerAllocation;
  total: number;
  stance: MixerSimpleStance;
  stanceBandId: "defensive" | "moderately_defensive" | "neutral" | "moderately_offensive" | "offensive";
  stanceBandLabel: string;
  score: number;
  dominantEconomicSleeve: MixerEconomicSleeveId | null;
  concentrated: boolean;
  cryptoClusterPercent: number;
  defensivePercent: number;
  distinctEconomicSleeves: number;
  insights: readonly [MixerInsight, MixerInsight, MixerInsight];
  disclaimer: string;
};
