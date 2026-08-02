/**
 * Deterministic portfolio insight — interprets the four Scorecard scores concisely.
 */

import type { PortfolioScoreId } from "@/lib/services/portfolio/scorecard/config";
import type {
  PortfolioScore,
  PortfolioScorecardResult,
} from "@/lib/services/portfolio/scorecard/types";

export const PORTFOLIO_INSIGHT_DISCLAIMER =
  "This is educational context about portfolio structure and plan tracking, not personal financial advice.";

export type PortfolioInsightScoreLine = {
  scoreId: PortfolioScoreId;
  label: string;
  value: number | null;
  text: string;
  tone: string | null;
};

export type PortfolioInsightResult = {
  headline: string;
  /** Concise lead line (often first score line). */
  leadInsight: string;
  whyItMatters: string;
  supportingEvidence: string[];
  scoreLines: PortfolioInsightScoreLine[];
  watchItem: string | null;
  resilienceNote: string | null;
  source: "ai" | "rules";
  confidenceLabel: string;
  generatedAt: string;
  fingerprint: string;
  scoreVersion: string;
  disclaimer: string;
};

function forbiddenLanguage(text: string): boolean {
  return /\b(buy|sell|guaranteed|outperform|you should|must sell|must buy|chance of)\b/i.test(
    text,
  );
}

function lineFromScore(score: PortfolioScore): PortfolioInsightScoreLine {
  if (!score.available || score.value == null) {
    return {
      scoreId: score.id,
      label: score.shortLabel,
      value: null,
      text: score.unavailableReason ?? score.summary,
      tone: null,
    };
  }
  const detail =
    score.attentionPoints[0] ??
    score.strengths[0] ??
    score.evidence[0]?.explanation ??
    score.summary;
  return {
    scoreId: score.id,
    label: score.shortLabel,
    value: score.value,
    text: detail,
    tone: score.band?.tone ?? null,
  };
}

export function buildDeterministicPortfolioInsightFromScorecard(
  scorecard: PortfolioScorecardResult,
  now = new Date(),
): PortfolioInsightResult {
  const { health, goal, momentum, readiness } = scorecard.scores;
  const headline = scorecard.summary.headline;
  const scoreLines = [health, goal, momentum, readiness].map(lineFromScore);

  const watch =
    [goal, momentum, health, readiness]
      .filter((s) => s.available && (s.value ?? 100) < 60)
      .map((s) => s.attentionPoints[0] ?? s.summary)[0] ??
    (!goal.available
      ? "Set a goal to unlock plan tracking on the scorecard."
      : !momentum.available
        ? "Build a bit more price history to unlock Momentum."
        : null);

  const displayLines = scoreLines.map((line) =>
    line.value != null
      ? `${line.label} ${line.value} — ${line.text}`
      : `${line.label} — ${line.text}`,
  );

  const result: PortfolioInsightResult = {
    headline,
    leadInsight: displayLines[0] ?? headline,
    whyItMatters:
      "These scores summarise structure, plan tracking, recent movement and data readiness — not expected returns.",
    supportingEvidence: displayLines,
    scoreLines,
    watchItem: watch,
    resilienceNote: health.strengths[0] ?? readiness.strengths[0] ?? null,
    source: "rules",
    confidenceLabel: health.confidence.label,
    generatedAt: now.toISOString(),
    fingerprint: scorecard.portfolioFingerprint,
    scoreVersion: scorecard.scorecardVersion,
    disclaimer: PORTFOLIO_INSIGHT_DISCLAIMER,
  };

  for (const field of [
    result.headline,
    result.leadInsight,
    result.whyItMatters,
    result.watchItem ?? "",
  ]) {
    if (forbiddenLanguage(field)) {
      return {
        ...result,
        headline: "Portfolio scores are ready for review.",
        leadInsight:
          "Review the scorecard for structure, goal, momentum and readiness.",
        watchItem: "Open each score for evidence-based detail.",
      };
    }
  }

  return result;
}

/** @deprecated Prefer buildDeterministicPortfolioInsightFromScorecard */
export function buildDeterministicPortfolioInsight(
  scorecardOrContext:
    | PortfolioScorecardResult
    | {
        fingerprint: string;
        score: number;
        bandLabel: string;
        confidenceLabel: string;
        scoreVersion: string;
        attentionPoints?: Array<{ title: string; detail: string }>;
        strengths?: Array<{ title: string; detail: string }>;
        largestHoldingSymbol?: string | null;
        largestHoldingWeightPercent?: number | null;
        improvementDrivers?: string[];
      },
  now = new Date(),
): PortfolioInsightResult {
  if (
    scorecardOrContext &&
    typeof scorecardOrContext === "object" &&
    "scores" in scorecardOrContext &&
    "summary" in scorecardOrContext
  ) {
    return buildDeterministicPortfolioInsightFromScorecard(
      scorecardOrContext as PortfolioScorecardResult,
      now,
    );
  }

  const ctx = scorecardOrContext as {
    fingerprint: string;
    score: number;
    bandLabel: string;
    confidenceLabel: string;
    scoreVersion: string;
    attentionPoints?: Array<{ title: string; detail: string }>;
  };
  const text = `Portfolio Health Score is ${ctx.score}/100 (${ctx.bandLabel}).`;
  return {
    headline: `Health ${ctx.score} — ${ctx.bandLabel}`,
    leadInsight: text,
    whyItMatters:
      "Structural balance and concentration explain sensitivity to a few drivers.",
    supportingEvidence: [
      `Portfolio Health Score: ${ctx.score}/100 (${ctx.bandLabel})`,
    ],
    scoreLines: [
      {
        scoreId: "health",
        label: "Health",
        value: ctx.score,
        text: ctx.bandLabel,
        tone: null,
      },
    ],
    watchItem:
      ctx.attentionPoints?.[0]?.detail ??
      "Review Portfolio Health for the evidence behind this score.",
    resilienceNote: null,
    source: "rules",
    confidenceLabel: ctx.confidenceLabel,
    generatedAt: now.toISOString(),
    fingerprint: ctx.fingerprint,
    scoreVersion: ctx.scoreVersion,
    disclaimer: PORTFOLIO_INSIGHT_DISCLAIMER,
  };
}
