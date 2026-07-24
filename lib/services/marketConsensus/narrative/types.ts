import type {
  AnalystConsensusResult,
  ConsensusAgreementLevel,
  ConsensusAvailability,
  ConsensusClassification,
  CoverageType,
} from "@/lib/services/marketConsensus/types";

export interface MarketConsensusNarrative {
  summary: string;
  supportingFactors: string[];
  riskFactors: string[];
  generatedAt: string;
  model?: string;
}

export type MarketConsensusNarrativeSource = "ai" | "fallback";

export type MarketConsensusNarrativeInput = {
  instrumentName: string;
  symbol?: string;
  instrumentType: "equity" | "etf" | "crypto" | "unknown";
  coverageType: CoverageType;
  availability: ConsensusAvailability;
  classification: ConsensusClassification;
  analystCount?: number;
  buyCount?: number;
  holdCount?: number;
  sellCount?: number;
  averageTarget?: number;
  impliedUpsidePercent?: number;
  agreementLevel?: ConsensusAgreementLevel;
  sourceName?: string;
  updatedAt?: string;
};

export type EnrichedAnalystConsensusResult = AnalystConsensusResult & {
  narrativeSource?: MarketConsensusNarrativeSource;
};

export const MARKET_CONSENSUS_NARRATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const MARKET_CONSENSUS_NARRATIVE_MODEL =
  process.env.MARKET_CONSENSUS_NARRATIVE_MODEL ?? "gpt-4o-mini";
