/**
 * Map existing Change Signals + daily/news candidates into PortfolioChangeSignal.
 * Reuses comparison math. Does not invent previous values.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { CHANGE_INTELLIGENCE_THRESHOLDS } from "@/lib/services/changeIntelligence/config";
import type { ChangeSignal } from "@/lib/services/changeIntelligence/types";
import type { HoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/types";
import {
  NEWS_CAUSALITY_LIMITATION,
  PORTFOLIO_CHANGE_CONTRIBUTION_PP,
  PORTFOLIO_CHANGE_NEWS_BACKED_PP,
  STRUCTURAL_COMPARISON_LIMITATION,
} from "@/lib/services/portfolioChangeDetection/config";
import type {
  PortfolioChangeSeverity,
  PortfolioChangeSignal,
  PortfolioChangeType,
} from "@/lib/services/portfolioChangeDetection/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function abs(value: number | null | undefined): number {
  return value == null || !Number.isFinite(value) ? 0 : Math.abs(value);
}

function severityFromImpact(
  impactPp: number | null,
  type: PortfolioChangeType,
): PortfolioChangeSeverity {
  const magnitude = abs(impactPp);
  if (type === "goal_progress_changed" && magnitude >= 2) return "high";
  if (type === "resilience_changed" && magnitude >= 8) return "high";
  if (magnitude >= 1) return "high";
  return "watch";
}

function scoreFrom(input: {
  impactPp: number | null;
  type: PortfolioChangeType;
  confidence: PortfolioChangeSignal["confidence"];
  today: boolean;
}): number {
  const impact = abs(input.impactPp);
  const structural =
    input.type === "largest_holding_changed" ||
    input.type === "concentration_changed" ||
    input.type === "holding_weight_changed" ||
    input.type === "exposure_mix_changed"
      ? 8
      : input.type === "goal_progress_changed"
        ? 6
        : input.type === "resilience_changed" ||
            input.type === "scenario_sensitivity_changed"
          ? 6
          : 0;
  const evidence =
    input.confidence === "high" ? 3 : input.confidence === "moderate" ? 1 : 0;
  const recency = input.today ? 4 : 2;
  return impact * 100 + structural + evidence + recency;
}

export function mapStructuralChangeSignal(
  signal: ChangeSignal,
  detectedAt: string,
): PortfolioChangeSignal | null {
  if (signal.materiality === "insufficient") return null;

  let type: PortfolioChangeType;
  let destination: { href: string; label: string } = {
    href: DASHBOARD_DEEP_LINKS.portfolioXray,
    label: "Open portfolio X-ray",
  };
  let fourQuestionId: PortfolioChangeSignal["fourQuestionId"] = "what_matters_now";

  if (signal.category === "concentration") {
    type = /largest holding changed/i.test(signal.headline)
      ? "largest_holding_changed"
      : "concentration_changed";
    destination = {
      href: DASHBOARD_DEEP_LINKS.portfolioXray,
      label: "See concentration",
    };
  } else if (signal.category === "holding_weight") {
    type = "holding_weight_changed";
    destination = {
      href: holdingDetailPath(signal.subject),
      label: `Open ${signal.subject}`,
    };
  } else if (signal.category === "exposure") {
    type = "exposure_mix_changed";
    destination = {
      href: DASHBOARD_DEEP_LINKS.portfolioExposure,
      label: "See exposure mix",
    };
  } else if (signal.category === "goal_progress") {
    type = "goal_progress_changed";
    fourQuestionId = "am_i_on_track";
    destination = {
      href: DASHBOARD_DEEP_LINKS.goalProgress,
      label: "Open goal progress",
    };
  } else if (signal.category === "resilience") {
    type = "resilience_changed";
    fourQuestionId = "whats_ahead";
    destination = {
      href: DASHBOARD_DEEP_LINKS.resilienceSleep,
      label: "See resilience",
    };
  } else if (signal.category === "scenario_sensitivity") {
    type = "scenario_sensitivity_changed";
    fourQuestionId = "whats_ahead";
    destination = {
      href: DASHBOARD_DEEP_LINKS.scenarioStress,
      label: "See scenario stress",
    };
  } else {
    return null;
  }

  const impactPp =
    signal.unit === "percentage_points" ? signal.delta : signal.delta;
  const severity: PortfolioChangeSeverity =
    signal.materiality === "definition_changed"
      ? "info"
      : severityFromImpact(impactPp, type);

  const whyItMatters =
    type === "goal_progress_changed"
      ? "This changes how far the current portfolio sits from the saved goal."
      : type === "resilience_changed" || type === "scenario_sensitivity_changed"
        ? "This changes how the current mix may respond in a supported stress case."
        : "This is a structural shift in how portfolio value is concentrated.";

  return {
    id: `structural:${signal.id}`,
    type,
    severity,
    title: signal.headline,
    summary: signal.explanation,
    whyItMatters,
    currentValue: signal.currentValue,
    previousValue: signal.previousValue,
    delta: signal.delta,
    unit: signal.unit,
    holdingSymbol:
      type === "holding_weight_changed" ||
      type === "concentration_changed" ||
      type === "largest_holding_changed"
        ? signal.subject
        : null,
    holdingName: signal.subject,
    portfolioImpactPp: impactPp,
    confidence: signal.confidence,
    detectedAt,
    destination,
    evidence: {
      whyAmISeeingThis:
        "Tobailey compared your last stored intelligence snapshot with the current portfolio.",
      whatChanged: signal.headline,
      whyItMattersToPortfolio: whyItMatters,
      howCalculated: `Existing Change Intelligence comparison. Thresholds: concentration ${CHANGE_INTELLIGENCE_THRESHOLDS.concentrationPp} pp, holding weight ${CHANGE_INTELLIGENCE_THRESHOLDS.holdingWeightPp} pp, exposure ${CHANGE_INTELLIGENCE_THRESHOLDS.exposureGroupPp} pp, goal ${CHANGE_INTELLIGENCE_THRESHOLDS.goalProgressPp} pp, resilience ${CHANGE_INTELLIGENCE_THRESHOLDS.resiliencePoints} points, scenario ${CHANGE_INTELLIGENCE_THRESHOLDS.scenarioImpactPp} pp.`,
      confidenceNote:
        signal.confidence === "high"
          ? "High — both states are stored or live portfolio figures Tobailey already uses."
          : signal.confidence === "moderate"
            ? "Moderate — the comparison is valid but a definition or identity also changed."
            : "Limited — some comparison fields were incomplete.",
    },
    limitations: [...signal.limitations, STRUCTURAL_COMPARISON_LIMITATION],
    fourQuestionId,
    windowKind: "live_vs_snapshot",
    materialityScore: scoreFrom({
      impactPp,
      type,
      confidence: signal.confidence,
      today: false,
    }),
  };
}

export function mapHoldingCandidateSignal(
  candidate: HoldingIntelligenceCandidate,
  detectedAt: string,
): PortfolioChangeSignal | null {
  const contribution = candidate.contributionPp;
  if (contribution == null || !Number.isFinite(contribution)) return null;

  const magnitude = Math.abs(contribution);
  const hasSupportedContext =
    candidate.matchType === "direct_instrument" ||
    candidate.matchType === "instrument_alias";
  const newsBacked =
    hasSupportedContext &&
    (candidate.explanationStatus === "supported" ||
      candidate.explanationStatus === "probable_contextual");

  if (newsBacked && magnitude < PORTFOLIO_CHANGE_NEWS_BACKED_PP) return null;
  if (!newsBacked && magnitude < PORTFOLIO_CHANGE_CONTRIBUTION_PP) return null;

  const type: PortfolioChangeType = newsBacked
    ? "holding_move_with_context"
    : "holding_contribution";
  const signedPp = `${contribution > 0 ? "+" : ""}${round1(contribution).toFixed(1)} pp`;
  const moveLabel =
    candidate.changePercent != null
      ? `${candidate.changePercent > 0 ? "+" : ""}${round1(candidate.changePercent).toFixed(1)}%`
      : "a material move";
  const title = newsBacked
    ? `${candidate.name} moved ${moveLabel} and has relevant portfolio context.`
    : `${candidate.name} contributed ${signedPp} to today’s portfolio move.`;
  const whyItMatters = `This holding accounts for ${signedPp} of today’s portfolio change.`;
  const confidence: PortfolioChangeSignal["confidence"] = newsBacked
    ? candidate.explanationStatus === "supported"
      ? "high"
      : "moderate"
    : candidate.moveAvailable
      ? "high"
      : "limited";

  const limitations = [
    "Daily contribution uses existing performance math, not a second pricing engine.",
  ];
  if (newsBacked) limitations.push(NEWS_CAUSALITY_LIMITATION);

  return {
    id: `daily:${candidate.symbol.toUpperCase()}:${type}`,
    type,
    severity: severityFromImpact(contribution, type),
    title,
    summary: newsBacked
      ? `${candidate.explanationNote} Portfolio impact ${signedPp}.`
      : `${candidate.name} is a material contributor to today’s portfolio percent move (${signedPp}).`,
    whyItMatters,
    currentValue: candidate.changePercent,
    previousValue: null,
    delta: round1(contribution),
    unit: "percentage_points",
    holdingSymbol: candidate.symbol,
    holdingName: candidate.name,
    portfolioImpactPp: round1(contribution),
    confidence,
    detectedAt,
    destination: {
      href: holdingDetailPath(candidate.symbol),
      label: `Open ${candidate.symbol}`,
    },
    evidence: {
      whyAmISeeingThis: newsBacked
        ? "This holding moved enough to affect the portfolio, and existing matching found relevant context."
        : "This holding’s contribution crossed Tobailey’s materiality floor.",
      whatChanged: title,
      whyItMattersToPortfolio: whyItMatters,
      howCalculated: `contributionPp = (holding move / previous portfolio value) × 100. Floor: ${
        newsBacked
          ? PORTFOLIO_CHANGE_NEWS_BACKED_PP
          : PORTFOLIO_CHANGE_CONTRIBUTION_PP
      } pp. Rank uses contribution, then weight, then move — never article count.`,
      confidenceNote:
        confidence === "high"
          ? newsBacked
            ? "High — instrument-level context was matched, not proven as the cause."
            : "High — contribution is derived from prices already on the holding."
          : confidence === "moderate"
            ? "Moderate — related context was found, but it is not a confirmed explanation."
            : "Limited — the move is visible, but context is thin.",
    },
    limitations,
    fourQuestionId: "what_happened",
    windowKind: "today",
    materialityScore: scoreFrom({
      impactPp: contribution,
      type,
      confidence,
      today: true,
    }),
  };
}
