/**
 * Analyst Intelligence types — provider-independent normalized model.
 */

export type NormalizedAnalystRating =
  | "Strong Buy"
  | "Buy"
  | "Hold"
  | "Sell"
  | "Strong Sell"
  | "No Coverage";

export type AnalystCoverageState =
  | "live"
  | "cached"
  | "pending"
  | "no_coverage"
  | "provider_unavailable";

export type AnalystDataConfidence = "complete" | "partial" | "none";

export type AnalystCoverageKind = "company" | "fund_or_etc" | "unsupported";

export type AnalystRatingCounts = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
};

export type AnalystRecentActionType =
  | "upgrade"
  | "downgrade"
  | "initiation"
  | "target_increase"
  | "target_decrease"
  | "estimate_revision"
  | "reaffirmation";

export type AnalystRecentAction = {
  id: string;
  symbol: string;
  name: string;
  firm: string | null;
  actionType: AnalystRecentActionType;
  previousValue: string | null;
  newValue: string | null;
  occurredAt: string;
  sourceName: string;
  sourceUrl: string;
  whyItMatters: string;
};

/** Normalized per-holding analyst quote from a provider adapter. */
export type AnalystApiQuote = {
  symbol: string;
  providerSymbol: string;
  coverageState: AnalystCoverageState;
  coverageKind: AnalystCoverageKind;
  dataConfidence: AnalystDataConfidence;
  consensusRating: NormalizedAnalystRating;
  ratingCounts: AnalystRatingCounts;
  analystCount: number;
  averagePriceTarget: number | null;
  medianPriceTarget: number | null;
  highPriceTarget: number | null;
  lowPriceTarget: number | null;
  targetCurrency: string | null;
  source: string;
  updatedAt: string;
};

export type AnalystHoldingMetrics = AnalystApiQuote & {
  currentPriceEur: number | null;
  impliedUpsidePercent: number | null;
};

export type AnalystRankedHolding = {
  symbol: string;
  name: string;
  consensusRating: NormalizedAnalystRating;
  impliedUpsidePercent: number | null;
  portfolioWeightPercent: number;
  analystCount: number;
};

export type PortfolioAnalystSnapshot = {
  hasMeaningfulCoverage: boolean;
  coverageState: AnalystCoverageState;
  coveredHoldingsCount: number;
  totalInvestmentsCount: number;
  coveragePercentOfInvested: number;
  weightedConsensus: NormalizedAnalystRating;
  weightedImpliedUpsidePercent: number | null;
  averageImpliedUpsidePercent: number | null;
  mostBullish: AnalystRankedHolding | null;
  mostCautious: AnalystRankedHolding | null;
  rankedHoldings: AnalystRankedHolding[];
  recentActions: AnalystRecentAction[];
  dataCompletenessPercent: number;
  source: string | null;
  updatedAt: string | null;
  observations: string[];
  insight: string;
  disclaimer: string;
};

export type AnalystApiResponse = {
  success: boolean;
  quotes?: AnalystApiQuote[];
  recentActions?: AnalystRecentAction[];
  providerAvailable?: boolean;
  generatedAt?: string;
  error?: string;
};

/** Integration point for future Upcoming Events layer. */
export type AnalystUpcomingEventLink = {
  symbol: string;
  providerSymbol: string;
  eventType: "earnings" | "investor_day" | "estimate_revision_window";
  eventDate: string | null;
  analystQuoteUpdatedAt: string | null;
};

export const ANALYST_DISCLAIMER =
  "Analyst estimates and price targets are opinions, not guarantees or personalized investment advice.";
