import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ConsensusClassification =
  | "positive"
  | "neutral"
  | "mixed"
  | "negative"
  | "unavailable";

export type CoverageType =
  | "equity-analyst"
  | "underlying-market"
  | "sector-outlook"
  | "crypto-market-outlook"
  | "unavailable";

export type ConsensusAvailability =
  | "available"
  | "limited"
  | "unavailable"
  | "error";

export type ConsensusAgreementLevel = "high" | "moderate" | "divided" | "limited";

export interface AnalystConsensusResult {
  instrumentId: string;
  symbol?: string;
  coverageType: CoverageType;
  availability: ConsensusAvailability;
  classification: ConsensusClassification;
  analystCount?: number;
  buyCount?: number;
  holdCount?: number;
  sellCount?: number;
  currentPrice?: number;
  averageTarget?: number;
  highTarget?: number;
  lowTarget?: number;
  impliedUpsidePercent?: number;
  agreementLevel?: ConsensusAgreementLevel;
  positiveFactors?: string[];
  riskFactors?: string[];
  summary?: string;
  sourceName?: string;
  sourceUrl?: string;
  updatedAt?: string;
  isStale?: boolean;
  errorCode?: string;
  narrativeSource?: "ai" | "fallback";
}

export type PortfolioConsensusSummary = {
  summary: string;
  holdingsWithCoverage: number;
  positiveConsensus: number;
  mixedConsensus: number;
  limitedCoverage: number;
  totalInvestments: number;
  providerAvailable: boolean;
  generatedAt: string;
};

export type MarketConsensusApiResponse = {
  success: boolean;
  results: AnalystConsensusResult[];
  summary: PortfolioConsensusSummary;
  providerAvailable: boolean;
  generatedAt: string;
  error?: string;
};

export type MarketConsensusProviderContext = {
  fxRateToEur: number | null;
};

export interface MarketConsensusProvider {
  id: string;
  supports(holding: Pick<
    StoredPortfolioHolding,
    "name" | "symbol" | "providerSymbol" | "assetType"
  >): boolean;
  getConsensus(
    holding: StoredPortfolioHolding,
    context: MarketConsensusProviderContext,
  ): Promise<AnalystConsensusResult>;
}

export const MARKET_CONSENSUS_CACHE_TTL_MS = {
  available: 24 * 60 * 60 * 1000,
  unavailable: 12 * 60 * 60 * 1000,
  error: 30 * 60 * 1000,
} as const;
