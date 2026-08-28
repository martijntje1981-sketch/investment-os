/**
 * Analysis glance synthesis — reuses stance, coverage, exposure, and scenario engines.
 * Presentation-only; does not invent models or change Phase 3 pricing definitions.
 */

import {
  formatPortfolioPercent,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import { resolvePortfolioValuationCoverage } from "@/lib/client/portfolioValuationCoverage";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildAnalysisAttention } from "@/lib/services/analysisGlance/buildAnalysisAttention";
import {
  ANALYSIS_HYPOTHETICAL_DISCLAIMER,
  ANALYSIS_INCOMPLETE_COVERAGE_COPY,
  type AnalysisGlanceMetric,
  type AnalysisGlanceView,
  type AnalysisOutlookScenarioView,
  type AnalysisOutlookView,
  type AnalysisStanceView,
} from "@/lib/services/analysisGlance/types";
import { assertNoAnalysisGlanceAdvisoryLanguage } from "@/lib/services/analysisGlance/wording";
import {
  EQUITY_EXPOSURE_GROUP_ID_SET,
  isBitcoinHolding,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";
import { buildGoalSensitivityFromScenario } from "@/lib/services/goalSensitivity";
import {
  buildPortfolioStance,
  STANCE_POSITIONING_DISCLAIMER,
} from "@/lib/services/portfolioStance";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { selectRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function groupWeight(
  allocation: PortfolioExposureAllocation,
  groupId: PortfolioExposureAllocation["groups"][number]["groupId"],
): number {
  return allocation.groups.find((group) => group.groupId === groupId)?.rawPercent ?? 0;
}

function buildStanceMetrics(input: {
  analysis: PortfolioAnalysisSnapshot;
  allocation: PortfolioExposureAllocation;
}): AnalysisGlanceMetric[] {
  const metrics: AnalysisGlanceMetric[] = [];
  const largest = input.analysis.largestPosition;
  if (largest) {
    const bitcoinLinked =
      largest.holding.assetType === "crypto" &&
      isBitcoinHolding(largest.holding);
    metrics.push({
      id: "largest",
      label: bitcoinLinked
        ? "Bitcoin-linked"
        : largest.holding.assetType === "cash"
          ? largest.holding.name
          : largest.holding.symbol,
      value: formatPortfolioPercent(largest.weightPercent),
    });
  }

  const topThree = input.analysis.topThreeWeightPercent;
  if (
    topThree > 0 &&
    (!largest || Math.abs(topThree - largest.weightPercent) >= 4)
  ) {
    metrics.push({
      id: "top3",
      label: "Top three positions",
      value: formatPortfolioPercent(topThree),
    });
  }

  const sleeves: Array<{ id: string; label: string; weight: number }> = [
    {
      id: "equity",
      label: "Classified equity",
      weight: input.allocation.groups
        .filter((group) => EQUITY_EXPOSURE_GROUP_ID_SET.has(group.groupId))
        .reduce((sum, group) => sum + group.rawPercent, 0),
    },
    {
      id: "cash",
      label: "Cash",
      weight: groupWeight(input.allocation, "cash"),
    },
    {
      id: "fixed_income",
      label: "Fixed income",
      weight: groupWeight(input.allocation, "fixed_income"),
    },
    {
      id: "resources",
      label: "Industrials & resources",
      weight: groupWeight(input.allocation, "industrials_resources"),
    },
  ];

  const largestWeight = largest?.weightPercent ?? 0;
  const extra = sleeves
    .filter(
      (sleeve) =>
        sleeve.weight >= 8 && Math.abs(sleeve.weight - largestWeight) >= 8,
    )
    .sort((left, right) => right.weight - left.weight)[0];
  if (extra) {
    metrics.push({
      id: extra.id,
      label: extra.label,
      value: formatPortfolioPercent(extra.weight),
    });
  }

  return metrics.slice(0, 3);
}

function buildStanceView(input: {
  coverageAllowsConclusions: boolean;
  holdings: StoredPortfolioHolding[];
  analysis: PortfolioAnalysisSnapshot;
  allocation: PortfolioExposureAllocation;
  resilience: ReturnType<typeof buildResilienceProfile> | null;
}): AnalysisStanceView {
  if (!input.coverageAllowsConclusions) {
    const view: AnalysisStanceView = {
      status: "incomplete",
      bandId: null,
      bandLabel: null,
      conclusion: ANALYSIS_INCOMPLETE_COVERAGE_COPY,
      metrics: [],
      disclaimer: STANCE_POSITIONING_DISCLAIMER,
      confidence: null,
      exploreHref: DASHBOARD_DEEP_LINKS.portfolioExposure,
    };
    assertNoAnalysisGlanceAdvisoryLanguage([view.conclusion, view.disclaimer]);
    return view;
  }

  const stance = buildPortfolioStance({
    holdings: input.holdings,
    allocation: input.allocation,
    analysis: input.analysis,
    resilience: input.resilience,
  });
  const metrics = buildStanceMetrics({
    analysis: input.analysis,
    allocation: input.allocation,
  });

  if (stance.status !== "ready" || !stance.bandLabel) {
    const largest = input.analysis.largestPosition;
    const conclusion = largest
      ? `The largest valued position is ${largest.holding.assetType === "cash" ? largest.holding.name : largest.holding.symbol} at ${formatPortfolioPercent(largest.weightPercent)}.`
      : "Portfolio structure is available once holdings have usable prices.";
    const view: AnalysisStanceView = {
      status: "descriptive",
      bandId: null,
      bandLabel: null,
      conclusion,
      metrics,
      disclaimer: STANCE_POSITIONING_DISCLAIMER,
      confidence: stance.confidence,
      exploreHref: DASHBOARD_DEEP_LINKS.portfolioExposure,
    };
    assertNoAnalysisGlanceAdvisoryLanguage([view.conclusion, view.disclaimer]);
    return view;
  }

  const view: AnalysisStanceView = {
    status: "ready",
    bandId: stance.bandId,
    bandLabel: stance.bandLabel,
    conclusion: stance.conclusion,
    metrics,
    disclaimer: stance.disclaimer,
    confidence: stance.confidence,
    exploreHref: DASHBOARD_DEEP_LINKS.portfolioExposure,
  };
  assertNoAnalysisGlanceAdvisoryLanguage([
    view.bandLabel ?? "",
    view.conclusion,
    view.disclaimer,
    ...view.metrics.map((metric) => `${metric.label} ${metric.value}`),
  ]);
  return view;
}

function toOutlookScenario(
  row: {
    scenarioId: AnalysisOutlookScenarioView["scenarioId"];
    scenarioName: string;
    result: {
      estimatedPortfolioImpactPercent: number | null;
      estimatedPortfolioImpactAmount: number | null;
      affectedPortfolioWeightPercent: number | null;
    };
  },
): AnalysisOutlookScenarioView {
  return {
    scenarioId: row.scenarioId,
    title: `If ${row.scenarioName}`,
    impactPercent: row.result.estimatedPortfolioImpactPercent,
    impactAmount: row.result.estimatedPortfolioImpactAmount,
    affectedWeightPercent: row.result.affectedPortfolioWeightPercent,
  };
}

function buildOutlookView(input: {
  coverageAllowsConclusions: boolean;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  relevant: ReturnType<typeof selectRelevantPortfolioScenarios> | null;
  resilience: ReturnType<typeof buildResilienceProfile> | null;
}): AnalysisOutlookView {
  if (!input.coverageAllowsConclusions) {
    const view: AnalysisOutlookView = {
      status: "incomplete",
      message: ANALYSIS_INCOMPLETE_COVERAGE_COPY,
      primary: null,
      secondary: null,
      resilienceScore: null,
      goalImpactLine: null,
      disclaimer: ANALYSIS_HYPOTHETICAL_DISCLAIMER,
      exploreHref: DASHBOARD_DEEP_LINKS.scenarioStress,
    };
    assertNoAnalysisGlanceAdvisoryLanguage([view.message ?? "", view.disclaimer]);
    return view;
  }

  const relevant = input.relevant ?? selectRelevantPortfolioScenarios(input.holdings);
  const modeled = relevant.modeled.filter(
    (row) =>
      row.result.status === "ok" &&
      row.result.estimatedPortfolioImpactPercent != null,
  );
  const primaryRow = modeled[0] ?? null;
  const secondaryRow = modeled[1] ?? null;
  const resilience =
    input.resilience ??
    buildResilienceProfile({
      holdings: input.holdings,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
    });

  let goalImpactLine: string | null = null;
  if (primaryRow && input.hasSavedGoal && input.goal) {
    const sensitivity = buildGoalSensitivityFromScenario({
      scenarioResult: primaryRow.result,
      goal: input.goal,
      hasSavedGoal: true,
    });
    if (
      sensitivity.status === "ok" &&
      sensitivity.estimatedDelayMonths != null &&
      sensitivity.estimatedDelayMonths !== 0
    ) {
      const months = Math.abs(sensitivity.estimatedDelayMonths);
      goalImpactLine =
        sensitivity.estimatedDelayMonths > 0
          ? `Modeled goal completion moves later by about ${months} month${months === 1 ? "" : "s"}.`
          : `Modeled goal completion moves earlier by about ${months} month${months === 1 ? "" : "s"}.`;
    }
  }

  if (!primaryRow) {
    const view: AnalysisOutlookView = {
      status: "unavailable",
      message:
        "No modeled stress scenario currently has enough classified exposure to estimate.",
      primary: null,
      secondary: null,
      resilienceScore:
        resilience.status === "ok" ? resilience.score : null,
      goalImpactLine: null,
      disclaimer: ANALYSIS_HYPOTHETICAL_DISCLAIMER,
      exploreHref: DASHBOARD_DEEP_LINKS.scenarioStress,
    };
    assertNoAnalysisGlanceAdvisoryLanguage([
      view.message ?? "",
      view.disclaimer,
    ]);
    return view;
  }

  const view: AnalysisOutlookView = {
    status: "ready",
    message: null,
    primary: toOutlookScenario(primaryRow),
    secondary: secondaryRow ? toOutlookScenario(secondaryRow) : null,
    resilienceScore: resilience.status === "ok" ? resilience.score : null,
    goalImpactLine,
    disclaimer: ANALYSIS_HYPOTHETICAL_DISCLAIMER,
    exploreHref: DASHBOARD_DEEP_LINKS.scenarioStress,
  };
  assertNoAnalysisGlanceAdvisoryLanguage([
    view.primary?.title ?? "",
    view.secondary?.title ?? "",
    view.goalImpactLine ?? "",
    view.disclaimer,
  ]);
  return view;
}

export function buildAnalysisGlance(input: {
  holdings: StoredPortfolioHolding[];
  analysis: PortfolioAnalysisSnapshot;
  allocation: PortfolioExposureAllocation;
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
}): AnalysisGlanceView {
  const coverage = resolvePortfolioValuationCoverage(input.holdings);
  const coverageAllowsConclusions = coverage.allowsValuationConclusions;
  const relevant = selectRelevantPortfolioScenarios(input.holdings);
  const resilience = coverageAllowsConclusions
    ? buildResilienceProfile({
        holdings: input.holdings,
        goal: input.goal ?? null,
        hasSavedGoal: Boolean(input.hasSavedGoal),
      })
    : null;

  const stance = buildStanceView({
    coverageAllowsConclusions,
    holdings: input.holdings,
    analysis: input.analysis,
    allocation: input.allocation,
    resilience,
  });
  const attention = buildAnalysisAttention({
    coverage,
    analysis: input.analysis,
    profile: relevant.profile,
  });
  const outlook = buildOutlookView({
    coverageAllowsConclusions,
    holdings: input.holdings,
    goal: input.goal ?? null,
    hasSavedGoal: Boolean(input.hasSavedGoal),
    relevant,
    resilience,
  });

  return {
    coverageComplete: coverageAllowsConclusions,
    coverageMessage: coverage.coverageMessage,
    stance,
    attention,
    outlook,
  };
}
