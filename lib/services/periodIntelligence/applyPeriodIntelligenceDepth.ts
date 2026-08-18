/**
 * Free vs Complete presentation for PeriodIntelligenceReview.
 * Uses the same object — Complete trial shares Complete depth.
 */

import { SEE_COMPLETE_ANALYSIS_LABEL } from "@/lib/services/productAccess";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import { PERIOD_COMPLETE_TEASE } from "@/lib/services/periodIntelligence/config";
import type {
  PeriodIntelligenceReview,
  PeriodIntelligenceSection,
} from "@/lib/services/periodIntelligence/types";

function trimSection(
  section: PeriodIntelligenceSection | null,
  evidenceLimit: number,
): PeriodIntelligenceSection | null {
  if (!section) return null;
  return {
    ...section,
    whyItMatters: null,
    evidence: section.evidence.slice(0, evidenceLimit),
    confidenceNotes: [],
  };
}

export function applyPeriodIntelligenceDepth(
  review: PeriodIntelligenceReview,
  depth: FourQuestionsIntelligenceDepth,
): PeriodIntelligenceReview {
  if (depth === "complete") {
    return { ...review, intelligenceDepth: "complete", completeTease: null };
  }

  const freeChanged = review.freeHeadline
    ? {
        id: "changed" as const,
        title: "What changed",
        headline: review.freeHeadline,
        whyItMatters: null,
        evidence: [] as string[],
        confidenceNotes: [] as string[],
      }
    : null;

  const freeGoal = review.goal
    ? {
        ...review.goal,
        whyItMatters: null,
        evidence: [],
        confidenceNotes: [],
        headline: review.goal.headline.includes("definition changed")
          ? review.goal.headline
          : review.goal.headline.replace(/\s+from\s+.+$/i, "").replace(/:$/, "").trim(),
      }
    : null;

  return {
    ...review,
    intelligenceDepth: "free",
    headline: review.happened?.headline ?? review.headline,
    happened: trimSection(review.happened, 2),
    changed: freeChanged,
    matters: null,
    goal: freeGoal,
    ahead: null,
    context: null,
    confidence: { level: review.confidence.level, notes: [] },
    completeTease: PERIOD_COMPLETE_TEASE,
  };
}

export function periodIntelligenceExploreLabel(
  depth: FourQuestionsIntelligenceDepth,
): string {
  return depth === "free" ? SEE_COMPLETE_ANALYSIS_LABEL : "Open Portfolio History";
}
