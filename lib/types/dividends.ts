/**
 * Dividend Intelligence types — shared across API, services, and UI.
 */

export type DividendFrequency =
  | "monthly"
  | "quarterly"
  | "semi_annual"
  | "annual"
  | "unknown";

export type DividendApiQuote = {
  symbol: string;
  providerSymbol: string;
  paysDividends: boolean;
  dividendYield: number | null;
  forwardAnnualDividendRate: number | null;
  estimatedAnnualDividendEur: number | null;
  estimatedNextPaymentEur: number | null;
  nextExDate: string | null;
  nextPaymentDate: string | null;
  frequency: DividendFrequency;
  currency: string | null;
  updatedAt: string;
  /** Verified calendar event with positive cash amount — used for policy classification only. */
  verifiedCashDistributionEvent?: {
    date: string;
    amount: number;
    currency: string;
  } | null;
  providerUnavailable?: boolean;
};

export type DividendAllocationItem = {
  symbol: string;
  name: string;
  incomeEur: number;
  sharePercent: number;
};

export type DividendNextPayment = {
  symbol: string;
  name: string;
  paymentDate: string;
  amountEur: number;
};

export type PassiveIncomeEstimateStatus =
  | "estimated"
  | "insufficient_data"
  | "ineligible_accumulating"
  | "ineligible_unknown_policy"
  | "ineligible_conflict"
  | "not_applicable"
  | "conversion_unavailable";

export type PassiveIncomeHoldingRecord = {
  holdingId: string;
  symbol: string;
  name: string;
  distributionPolicy: import("@/lib/types/distributionPolicy").DistributionPolicy;
  classificationConfidence: import("@/lib/types/distributionPolicy").DistributionPolicyConfidence;
  eligibility: "eligible" | "ineligible";
  eligibilityReason: string | null;
  estimateStatus: PassiveIncomeEstimateStatus;
  estimatedAnnualCashDistributionEur: number | null;
  confidenceLabel: string;
  explanation: string;
  warnings: string[];
  sourceFieldsUsed: string[];
  dataUpdatedAt: string | null;
};

export type PassiveIncomeProjectionSnapshot = {
  eligibleEstimatedAnnualCashDistributionEur: number;
  eligibleHoldingsCount: number;
  contributingHoldingsCount: number;
  excludedHoldingsCount: number;
  awaitingDataHoldingsCount: number;
  hasUsableEstimate: boolean;
  holdingRecords: PassiveIncomeHoldingRecord[];
  updatedAt: string | null;
};

export type PortfolioDividendSnapshot = {
  hasDividendData: boolean;
  estimatedAnnualIncomeEur: number;
  portfolioYieldPercent: number;
  payingHoldingsCount: number;
  averageYieldPercent: number;
  highestYield: {
    symbol: string;
    name: string;
    yieldPercent: number;
  } | null;
  largestContributor: DividendAllocationItem | null;
  concentrationSharePercent: number;
  incomeDiversificationLabel: "well_diversified" | "moderate" | "concentrated";
  allocation: DividendAllocationItem[];
  nextPayment: DividendNextPayment | null;
  observations: string[];
  insight: string;
  updatedAt: string | null;
  /** Conservative passive-income projection used by Goals and Dashboard. */
  passiveIncome: PassiveIncomeProjectionSnapshot;
};

export type DividendApiResponse = {
  success: boolean;
  quotes?: DividendApiQuote[];
  error?: string;
};

export type CachedDividendQuote = DividendApiQuote;
