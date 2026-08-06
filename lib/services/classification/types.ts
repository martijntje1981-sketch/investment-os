/**
 * Central portfolio-exposure classification types.
 * Informational only — not sector look-through and not investment advice.
 */

export const EXPOSURE_GROUP_IDS = [
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
  "diversified_equity",
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
  "other_unclassified",
];

export type ExposureClassificationSource =
  | "asset_type"
  | "research_profile"
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
};

/** Contributing holding included in a valued exposure group. */
export type PortfolioExposureHoldingContribution = {
  id: string;
  symbol: string;
  name: string;
  value: number;
  assetType?: "investment" | "cash" | "crypto";
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
};
