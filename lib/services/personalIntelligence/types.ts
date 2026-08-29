/**
 * Personal Intelligence — Phase 1A foundation types.
 *
 * Deterministic portfolio facts first. Interpretation is optional and tagged.
 * "Nothing requires attention" is a first-class outcome.
 *
 * Reusable by web, mobile, email, and future push — no UI coupling.
 */

import type { DailyPerformanceSnapshot } from "@/lib/client/dailyPerformance";
import type { GoalProgressStatus } from "@/lib/services/goals/goalProgressEngine";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type {
  InvestmentIntelligence,
  MustWatchRecommendation,
  PortfolioStatus,
} from "@/lib/services/news/investmentIntelligence";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/** Attention level for today — never invent elevated attention without data. */
export type PersonalAttentionState =
  | "nothing_requires_attention"
  | "watch"
  | "elevated";

export type PersonalIntelligenceFactKind =
  | "portfolio_move"
  | "contributor"
  | "exposure"
  | "news"
  | "goal"
  | "coverage";

/**
 * A single fact or attention item. Generated wording must set source: "derived"
 * only when computed from inputs; never fabricate.
 */
export type PersonalIntelligenceItem = {
  id: string;
  kind: PersonalIntelligenceFactKind;
  /** Short factual label suitable for lists. */
  label: string;
  /** Optional supporting detail (already computed, not invented). */
  detail?: string | null;
  /** Why this may matter to the portfolio — omit when unknown. */
  whyItMatters?: string | null;
  /** Approximate portfolio weight affected, when known (0–100). */
  portfolioWeightPercent?: number | null;
  materiality: "low" | "medium" | "high";
  source: "portfolio" | "news" | "goals" | "derived";
};

export type DayContribution = {
  symbol: string;
  name: string;
  /** Absolute currency contribution to portfolio day move. */
  move: number;
  /** Holding session/24h percent change. */
  changePercent: number;
  /**
   * Contribution to portfolio percent move in percentage points.
   * Example: +0.8 means +0.8pp of the portfolio return.
   * Null when previous portfolio value cannot be established.
   */
  contributionPp: number | null;
  weightPercent: number | null;
  assetType?: string | null;
  /** Compact period label (e.g. "24h", "Last session") when known. */
  periodLabel?: string | null;
};

export type PersonalIntelligencePortfolioMove = {
  todayChange: number;
  todayPercent: number;
  hasDailyData: boolean;
  coverageComplete: boolean;
  validPerformanceCount: number;
  eligibleMarketHoldingCount: number;
  /** Prior-day portfolio value of valued performers (for attribution). */
  previousPortfolioValue: number | null;
};

export type PersonalIntelligenceGoalSnippet = {
  hasGoal: boolean;
  status: GoalProgressStatus | null;
  goalReached: boolean;
  currentProgressPercent: number | null;
};

export type PersonalIntelligenceToday = {
  generatedAt: string;
  version: "pi-today-v1";
  attention: PersonalAttentionState;
  /** One calm sentence — factual when possible; may be quiet-state copy. */
  headline: string;
  portfolioMove: PersonalIntelligencePortfolioMove | null;
  /** Ranked by |contributionPp| or |move|; empty when unavailable. */
  topContributors: DayContribution[];
  topDetractors: DayContribution[];
  holdingsWeights: Array<{
    symbol: string;
    name: string;
    weightPercent: number;
  }>;
  exposure: PortfolioExposureAllocation | null;
  news: {
    quietMarket: boolean;
    portfolioStatus: PortfolioStatus;
    mustWatch: MustWatchRecommendation | null;
    holdingInsights: InvestmentIntelligence["holdingInsights"];
    portfolioSummary: string;
  } | null;
  goals: PersonalIntelligenceGoalSnippet | null;
  /** Ordered attention items; empty when nothing requires attention. */
  attentionItems: PersonalIntelligenceItem[];
  /** Data-quality notes for consumers (coverage, mixed periods, etc.). */
  dataNotes: string[];
};

/** Inputs are pre-built from existing services — this layer does not fetch. */
export type BuildPersonalIntelligenceTodayInput = {
  now?: Date;
  daily: DailyPerformanceSnapshot | null;
  /** Optional full holdings for crypto structure conclusions (Phase 4A). */
  holdings?: StoredPortfolioHolding[] | null;
  holdingsWeights?: Array<{
    symbol: string;
    name: string;
    weightPercent: number;
  }> | null;
  exposure?: PortfolioExposureAllocation | null;
  intelligence?: InvestmentIntelligence | null;
  goals?: PersonalIntelligenceGoalSnippet | null;
};

/** Re-export useful source types for consumers. */
export type { DailyPerformanceSnapshot, InvestmentIntelligence };
