/**
 * Distribution policy classification — Phase 1A conservative model.
 * Prefer unknown over incorrect classification.
 */

export type DistributionPolicy =
  | "distributing"
  | "accumulating"
  | "non_distributing"
  | "unknown"
  | "not_applicable";

export type DistributionPolicyConfidence =
  | "verified"
  | "reviewed"
  | "user_confirmed"
  | "unknown";

export type DistributionEvidenceType =
  | "user_confirmed"
  | "reviewed_registry"
  | "provider_metadata"
  | "cash_distribution_history"
  | "name_marker_supporting"
  | "instrument_type_rule"
  | "none";

/**
 * User override stored on the exact holding.
 * null = use automatic classification ("Not sure").
 */
export type DistributionPolicyUserOverride =
  | "distributing"
  | "accumulating"
  | "non_distributing"
  | null;

export type VerifiedCashDistributionEvent = {
  date: string;
  amount: number;
  currency: string;
};

export type DistributionPolicyClassification = {
  policy: DistributionPolicy;
  instrumentIdentity: string;
  isin: string | null;
  providerSymbol: string | null;
  classificationSource: string;
  classificationConfidence: DistributionPolicyConfidence;
  evidenceType: DistributionEvidenceType;
  evidenceSummary: string;
  verifiedAt: string | null;
  dataUpdatedAt: string | null;
  isUserConfirmed: boolean;
  isReviewedOverride: boolean;
  conflictDetected: boolean;
  conflictSummary: string | null;
  providerUnavailable: boolean;
  /** Official issuer documentation URL — only populated for reviewed-registry evidence. */
  sourceUrl: string | null;
};

export type DistributionPolicySummaryCounts = {
  distributing: number;
  accumulating: number;
  nonDistributing: number;
  unknown: number;
  notApplicable: number;
  conflicted: number;
  totalInvestments: number;
};

export type PortfolioDistributionPolicySnapshot = {
  summary: DistributionPolicySummaryCounts;
  classifications: DistributionPolicyClassification[];
  generatedAt: string;
};
