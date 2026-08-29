/**
 * Phase 12 — canonical deterministic What-if result.
 * Composes Scenario Engine + Goal Progress Engine. Never persists.
 */

import type { ScenarioId, ScenarioResult } from "@/lib/services/scenarioEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

export type WhatIfUnsupportedScenarioId =
  | "rates_plus_1"
  | "rates_minus_1"
  | "credit_spreads_widen"
  | "inflation_shock"
  | "eur_plus_10_vs_usd";

export type WhatIfScenarioSelection =
  | { kind: "modeled"; scenarioId: ScenarioId }
  | { kind: "unsupported"; scenarioId: WhatIfUnsupportedScenarioId }
  | { kind: "none" };

export type WhatIfAccessMode = "free_preview" | "complete" | "demo";

export type WhatIfStatus =
  | "modeled"
  | "unavailable_portfolio_value"
  | "unavailable_no_goal"
  | "educational_only"
  | "insufficient_data";

export type WhatIfConfidence = "high" | "medium" | "low" | "insufficient";

export type WhatIfPathSnapshot = {
  portfolioValue: number | null;
  goalProgressPercent: number | null;
  monthlyContribution: number | null;
  planningAssumptionPercent: number | null;
  estimatedCompletionLabel: string | null;
  estimatedCompletionDate: string | null;
};

export type WhatIfComparisonRow = {
  id:
    | "portfolio_value"
    | "goal_progress"
    | "monthly_contribution"
    | "planning_assumption"
    | "estimated_goal_path";
  label: string;
  current: string;
  whatIf: string;
};

export type WhatIfScenarioResult = {
  status: WhatIfStatus;
  accessMode: WhatIfAccessMode;
  /** Full explorer vs one-scenario headline preview. */
  explorer: "full" | "preview";
  scenarioId: ScenarioId | WhatIfUnsupportedScenarioId | null;
  scenarioName: string;
  scenarioModeled: boolean;
  shockPercent: number | null;
  /** True when this result must never be written back to saved goal/holdings. */
  persistedGoalUnchanged: true;
  goal: GoalSettings | null;
  current: WhatIfPathSnapshot;
  whatIf: WhatIfPathSnapshot;
  portfolioImpactAmount: number | null;
  portfolioImpactPercent: number | null;
  progressDelta: number | null;
  affectedPortfolioWeightPercent: number | null;
  currentContribution: number | null;
  whatIfContribution: number | null;
  currentPlanningAssumption: number | null;
  whatIfPlanningAssumption: number | null;
  comparison: WhatIfComparisonRow[];
  headline: string;
  whatChanged: string[];
  whatStayedConstant: string[];
  calculationBullets: string[];
  assumptions: string[];
  limitations: string[];
  confidence: WhatIfConfidence;
  disclaimer: string;
  /** Present only when the underlying scenario engine ran a modeled shock. */
  scenarioResult: ScenarioResult | null;
  /** True when a contribution was saved (including explicit €0). */
  hasSavedContribution: boolean;
  /** True when a finite saved planning assumption exists. */
  hasSavedPlanningAssumption: boolean;
};

export type WhatIfScenarioInput = {
  holdings: import("@/lib/types/portfolioStorage").StoredPortfolioHolding[];
  currentPortfolioValue: number | null;
  portfolioValueAvailable: boolean;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  selection: WhatIfScenarioSelection;
  contributionOverride?: number | null;
  planningAssumptionOverride?: number | null;
  access: import("@/lib/services/productAccess").ProductAccess;
};
