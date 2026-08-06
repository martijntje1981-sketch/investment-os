import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const DISCOVER_SNAPSHOT_VERSION = 1 as const;

export type DiscoverFreshness = "fresh" | "stale" | "partial";

export type DiscoverSourceStatus = {
  newsFromCache: boolean;
  newsStale: boolean;
  intelligenceAvailable: boolean;
  briefingGeneratedAt: string | null;
};

export type MissedItemKind =
  | "holding_risk"
  | "upcoming_event"
  | "holding_development"
  | "macro_development"
  | "must_watch"
  | "analyst_change"
  | "dividend_event"
  | "quiet_state";

export type MissedItem = {
  id: string;
  kind: MissedItemKind;
  priority: number;
  headline: string;
  explanation: string;
  affectedHolding?: string | null;
  eventDate?: string | null;
  eventTime?: string | null;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

export type CoverageLevel =
  | "represented"
  | "limited"
  | "not_represented"
  | "unknown";

export type PortfolioCoverageCategory = {
  id: string;
  label: string;
  level: CoverageLevel;
  detail: string;
  classifiedHoldingCount: number;
  unknownHoldingCount: number;
};

export type PortfolioCoverage = {
  summary: string;
  categories: PortfolioCoverageCategory[];
  unclassifiedHoldings: string[];
  disclaimer: string;
};

export type RelatedInstrument = {
  providerSymbol: string;
  symbol: string;
  name: string;
  exchange: string;
  relationshipLabel: string;
  researchContext: string;
  oneYearReturn: {
    available: false;
    label: "1-year return unavailable";
  };
};

export type HoldingSpotlight = {
  holdingId: string;
  symbol: string;
  name: string;
  selectionReason: string;
  relatedInstruments: RelatedInstrument[];
  unavailableMessage?: string | null;
};

export type RelatedInvestmentGroups = {
  spotlight: HoldingSpotlight | null;
  eligibleHoldingIds: string[];
};

export type DiscoverSnapshot = {
  version: typeof DISCOVER_SNAPSHOT_VERSION;
  portfolioFingerprint: string;
  generatedAt: string;
  expiresAt: string;
  freshness: DiscoverFreshness;
  sourceStatus: DiscoverSourceStatus;
  thingsYouMayHaveMissed: MissedItem[];
  portfolioCoverage: PortfolioCoverage;
  blindSpots: PortfolioCoverageCategory[];
  relatedInvestmentGroups: RelatedInvestmentGroups;
  warnings: string[];
};

export type DiscoverBuildInput = {
  holdings: StoredPortfolioHolding[];
  portfolioFingerprint: string;
  newsPayload: NewsApiResponse | null;
  intelligence: InvestmentIntelligence | null;
  intelligenceFromCache: boolean;
  newsStale: boolean;
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  now?: Date;
};
