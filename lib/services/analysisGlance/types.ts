import type { StanceBandId, StanceConfidence } from "@/lib/services/portfolioStance";
import type { ScenarioId } from "@/lib/services/scenarioEngine";

export const ANALYSIS_INCOMPLETE_COVERAGE_COPY =
  "Portfolio structure is temporarily incomplete while prices update.";

export const ANALYSIS_QUIET_ATTENTION_COPY =
  "No material structural changes need attention right now.";

export const ANALYSIS_HYPOTHETICAL_DISCLAIMER =
  "Hypothetical model based on current classified exposure — not a prediction.";

export type AnalysisGlanceMetric = {
  id: string;
  label: string;
  value: string;
};

export type AnalysisStanceView = {
  status: "ready" | "descriptive" | "incomplete";
  bandId: StanceBandId | null;
  bandLabel: string | null;
  conclusion: string;
  metrics: AnalysisGlanceMetric[];
  disclaimer: string;
  confidence: StanceConfidence | null;
  exploreHref: string;
};

export type AnalysisAttentionItem = {
  id: string;
  title: string;
  body: string;
  href: string;
  hrefLabel: string;
};

export type AnalysisAttentionView = {
  items: AnalysisAttentionItem[];
  quietMessage: string | null;
};

export type AnalysisOutlookScenarioView = {
  scenarioId: ScenarioId;
  title: string;
  impactPercent: number | null;
  impactAmount: number | null;
  affectedWeightPercent: number | null;
};

export type AnalysisOutlookView = {
  status: "ready" | "incomplete" | "unavailable";
  message: string | null;
  primary: AnalysisOutlookScenarioView | null;
  secondary: AnalysisOutlookScenarioView | null;
  resilienceScore: number | null;
  goalImpactLine: string | null;
  disclaimer: string;
  exploreHref: string;
};

export type AnalysisGlanceView = {
  coverageComplete: boolean;
  coverageMessage: string | null;
  stance: AnalysisStanceView;
  attention: AnalysisAttentionView;
  outlook: AnalysisOutlookView;
};
