/**
 * Cross-score summary + weekly email snapshot (no fake deltas).
 */

import type {
  PortfolioScore,
  PortfolioScorecardResult,
  PortfolioScorecardSnapshot,
  ScoreSnapshot,
} from "@/lib/services/portfolio/scorecard/types";

function toSnapshot(score: PortfolioScore): ScoreSnapshot {
  return {
    id: score.id,
    value: score.value,
    available: score.available,
    label: score.label,
    bandLabel: score.band?.label ?? null,
    tone: score.band?.tone ?? null,
    confidenceLabel: score.confidence.label,
    summary: score.summary,
    evidenceIds: score.evidence.map((item) => item.id),
    previousValue: null,
    delta: null,
    unavailableReason: score.unavailableReason,
  };
}

export function buildScorecardSummary(scores: {
  health: PortfolioScore;
  goal: PortfolioScore;
  momentum: PortfolioScore;
  readiness: PortfolioScore;
}): { headline: string; lines: string[] } {
  const available = [
    scores.health,
    scores.goal,
    scores.momentum,
    scores.readiness,
  ].filter((s) => s.available && s.value != null);

  const weakest = [...available].sort(
    (a, b) => (a.value ?? 100) - (b.value ?? 100),
  )[0];
  const strongest = [...available].sort(
    (a, b) => (b.value ?? 0) - (a.value ?? 0),
  )[0];

  let headline = "Portfolio scores are ready for review.";
  if (strongest && weakest && strongest.id !== weakest.id) {
    if ((weakest.value ?? 100) < 60 && (strongest.value ?? 0) >= 70) {
      headline = `${strongest.label} looks solid, but ${weakest.label.toLowerCase()} needs attention.`;
    } else if ((weakest.value ?? 100) < 55) {
      headline = `${weakest.label} is the main score to watch.`;
    } else if ((strongest.value ?? 0) >= 80) {
      headline = `${strongest.label} leads a constructive scorecard.`;
    }
  } else if (!scores.goal.available) {
    headline = "Set a goal to complete the scorecard picture.";
  } else if (!scores.momentum.available) {
    headline = "Structure is measurable; momentum needs more history.";
  }

  const lines = [
    scores.health,
    scores.goal,
    scores.momentum,
    scores.readiness,
  ].map((score) => {
    if (!score.available || score.value == null) {
      return `${score.label} — ${score.unavailableReason ?? score.summary}`;
    }
    const detail =
      score.attentionPoints[0] ??
      score.strengths[0] ??
      score.evidence[0]?.explanation ??
      score.summary;
    return `${score.label} ${score.value} — ${detail}`;
  });

  return { headline, lines };
}

export function toPortfolioScorecardSnapshot(
  result: PortfolioScorecardResult,
  userId?: string,
): PortfolioScorecardSnapshot {
  return {
    ...(userId ? { userId } : {}),
    scorecardVersion: result.scorecardVersion,
    calculatedAt: result.calculatedAt,
    portfolioFingerprint: result.portfolioFingerprint,
    scores: {
      health: toSnapshot(result.scores.health),
      goal: toSnapshot(result.scores.goal),
      momentum: toSnapshot(result.scores.momentum),
      readiness: toSnapshot(result.scores.readiness),
    },
    summary: result.summary,
  };
}

/**
 * Compact evidence payload for AI / rules insight — never asks the model to calculate scores.
 * previousValue/delta are omitted; weekly history requires stored snapshots (not fabricated).
 */
export function buildScorecardInsightContext(
  scorecard: PortfolioScorecardResult,
) {
  const pack = (score: PortfolioScore) => ({
    id: score.id,
    available: score.available,
    value: score.value,
    band: score.band?.label ?? null,
    tone: score.band?.tone ?? null,
    confidence: score.confidence.label,
    summary: score.summary,
    primaryEvidence: score.evidence[0]
      ? {
          id: score.evidence[0].id,
          explanation: score.evidence[0].explanation,
          value: score.evidence[0].value ?? null,
        }
      : null,
    primaryAttention: score.attentionPoints[0] ?? null,
    primaryStrength: score.strengths[0] ?? null,
    unavailableReason: score.unavailableReason ?? null,
  });

  return {
    scorecardVersion: scorecard.scorecardVersion,
    portfolioFingerprint: scorecard.portfolioFingerprint,
    calculatedAt: scorecard.calculatedAt,
    summaryHeadline: scorecard.summary.headline,
    scores: {
      health: pack(scorecard.scores.health),
      goal: pack(scorecard.scores.goal),
      momentum: pack(scorecard.scores.momentum),
      readiness: pack(scorecard.scores.readiness),
    },
  };
}
