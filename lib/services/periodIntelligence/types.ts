/**
 * Phase 8C — canonical period review model.
 * Composes Companion + ChangeIntelligenceSummary. No React. No new math engines.
 */

import type { CompanionPeriodKind } from "@/lib/services/portfolio/companion/types";
import type { ChangeIntelligenceConfidence } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { PeriodReportBrief } from "@/lib/services/periodIntelligence/periodReportBrief";

export type PeriodIntelligenceKind = "weekly" | "monthly";

export type PeriodIntelligenceSectionId =
  | "happened"
  | "changed"
  | "matters"
  | "goal"
  | "ahead";

export type PeriodInsightKind =
  | "resilience_deterioration"
  | "concentration_change"
  | "goal_change"
  | "exposure_change"
  | "concentrated_performance"
  | "meaningful_improvement"
  | "no_material_change"
  | "insufficient_history";

export type PeriodIntelligenceSection = {
  id: PeriodIntelligenceSectionId;
  title: string;
  headline: string;
  whyItMatters: string | null;
  evidence: string[];
  confidenceNotes: string[];
};

export type PeriodIntelligenceContextKind = "news" | "perspective";

export type PeriodIntelligenceContextItem = {
  kind: PeriodIntelligenceContextKind;
  /** Distinguishes news/market context from Perspective/opinion. */
  channelLabel: "News / market context" | "Perspective / opinion";
  headline: string;
  detail: string;
  href: string | null;
  hrefExternal: boolean;
};

export type PeriodIntelligencePeriod = {
  kind: PeriodIntelligenceKind;
  periodKind: CompanionPeriodKind;
  label: string;
  dateRangeLabel: string;
  startDate: string | null;
  endDate: string | null;
  comparisonPreviousKey: string | null;
  comparisonCurrentKey: string | null;
};

export type PeriodReportHeroMetric = {
  id: string;
  label: string;
  value: string;
};

export type PeriodReportHero = {
  kicker: "Your week" | "Your month";
  conclusion: string;
  dateRangeLabel: string;
  metrics: PeriodReportHeroMetric[];
};

export type PeriodReportExploreHrefs = {
  happened: string;
  changed: string;
  matters: string;
  goal: string | null;
  ahead: string;
};

/**
 * Surface-agnostic weekly/monthly review object.
 * Later renderers (in-app, email, PDF) should consume this without recalculating.
 */
export type PeriodIntelligenceReview = {
  kind: PeriodIntelligenceKind;
  ready: boolean;
  readinessReason: string | null;
  period: PeriodIntelligencePeriod;
  headline: string | null;
  summary: string | null;
  /** Cover metrics already formatted by Companion — not recalculated in the renderer. */
  hero: PeriodReportHero | null;
  /** Max 3 supporting points. Omit empty. */
  executiveSummary: string[];
  explore: PeriodReportExploreHrefs;
  happened: PeriodIntelligenceSection | null;
  changed: PeriodIntelligenceSection | null;
  matters: PeriodIntelligenceSection | null;
  goal: PeriodIntelligenceSection | null;
  ahead: PeriodIntelligenceSection | null;
  context: PeriodIntelligenceContextItem | null;
  confidence: ChangeIntelligenceConfidence;
  dataAsOf: string | null;
  insightKind: PeriodInsightKind;
  /** High-level conclusion without exact previous → current chains. Used for Free. */
  freeHeadline: string | null;
  firstHistory: boolean;
  noMaterialChange: boolean;
  intelligenceDepth: FourQuestionsIntelligenceDepth;
  isDemo: boolean;
  completeTease: string | null;
  /**
   * Optional visual brief for the premium PDF.
   * Omit on archived/legacy payloads — renderer stays text-only when absent.
   */
  brief?: PeriodReportBrief | null;
};
