/**
 * Central portfolio-exposure classification types.
 * Informational only — not sector look-through and not investment advice.
 */

import type {
  FixedIncomeClassification,
  FixedIncomeType,
} from "@/lib/services/classification/classifyFixedIncome";

export const EXPOSURE_GROUP_IDS = [
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
  "diversified_equity",
  "fixed_income",
  "crypto",
  "cash",
  "other_unclassified",
] as const;

export type ExposureGroupId = (typeof EXPOSURE_GROUP_IDS)[number];

export const EXPOSURE_GROUP_LABELS: Record<ExposureGroupId, string> = {
  technology_communication: "Technology & communication",
  healthcare: "Healthcare",
  consumer: "Consumer",
  financials_real_estate: "Financials & real estate",
  industrials_resources: "Industrials & resources",
  diversified_equity: "Diversified equity",
  fixed_income: "Fixed income",
  crypto: "Crypto",
  cash: "Cash",
  other_unclassified: "Other / Unclassified",
};

/** Traditional + diversified buckets retained in the taxonomy (excludes crypto/cash). */
export const MAIN_EXPOSURE_GROUP_IDS: ExposureGroupId[] = [
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
  "diversified_equity",
  "fixed_income",
  "other_unclassified",
];

/**
 * Classified equity / equity-like exposure groups (whole-instrument).
 * Excludes cash, crypto, fixed income, and other_unclassified.
 * Shared by Portfolio Health DNA and Scenario Engine.
 */
export const EQUITY_EXPOSURE_GROUP_IDS: readonly ExposureGroupId[] = [
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
  "diversified_equity",
] as const;

export const EQUITY_EXPOSURE_GROUP_ID_SET = new Set<ExposureGroupId>(
  EQUITY_EXPOSURE_GROUP_IDS,
);

export const FIXED_INCOME_EXPOSURE_GROUP_ID: ExposureGroupId = "fixed_income";

export type ExposureClassificationSource =
  | "asset_type"
  | "research_profile"
  | "name_heuristic"
  | "provider_type"
  | "unclassified";

export type ExposureClassificationConfidence = "high" | "medium" | "low";

export type HoldingExposureClassification = {
  normalizedGroupId: ExposureGroupId;
  displayLabel: string;
  classificationSource: ExposureClassificationSource;
  confidence: ExposureClassificationConfidence;
  /** Original research sectorExposure / fundCategory when used. */
  researchExposure?: string[] | null;
  fundCategory?: string | null;
  /** Short reason for tests and debugging. */
  reason: string;
  /** Present when the holding is classified as fixed income. */
  fixedIncome?: FixedIncomeClassification | null;
};

/** Contributing holding included in a valued exposure group. */
export type PortfolioExposureHoldingContribution = {
  id: string;
  symbol: string;
  name: string;
  value: number;
  assetType?: "investment" | "cash" | "crypto";
};

export type PortfolioExposureSubgroupSlice = {
  subgroupId: string;
  displayLabel: string;
  type: FixedIncomeType;
  value: number;
  rawPercent: number;
  displayPercent: number;
  holdingCount: number;
  confidence: "known" | "inferred" | "unknown";
};

export type PortfolioExposureGroupSlice = {
  groupId: ExposureGroupId;
  displayLabel: string;
  value: number;
  rawPercent: number;
  displayPercent: number;
  holdingCount: number;
  /** Valued holdings in this group, highest value first. */
  holdings: PortfolioExposureHoldingContribution[];
  /** Supporting subtype rows (fixed income only). Portfolio %, not sleeve %. */
  subgroups?: PortfolioExposureSubgroupSlice[];
};

export type PortfolioFixedIncomeSleeve = {
  weightPercent: number;
  classificationIncomplete: boolean;
  subgroups: PortfolioExposureSubgroupSlice[];
  durationKnownSharePercent: number;
  /** Share with a duration bucket (known or inferred), not a precise duration. */
  durationClassifiedSharePercent: number;
  creditKnownSharePercent: number;
  creditClassifiedSharePercent: number;
  dominantType: FixedIncomeType | null;
  majorityIsGovernment: boolean;
  majorityIsLongDuration: boolean;
  /** Majority of classified (not only known) duration is long. */
  majorityIsClassifiedLongDuration: boolean;
  majorityIsClassifiedShortDuration: boolean;
};

export type PortfolioExposureAllocation = {
  groups: PortfolioExposureGroupSlice[];
  totalValue: number;
  classifiedHoldingCount: number;
  unclassifiedHoldingCount: number;
  excludedHoldingCount: number;
  includedHoldingCount: number;
  hasAnyValue: boolean;
  coverageLabel: string | null;
  fixedIncome: PortfolioFixedIncomeSleeve | null;
};
