/**
 * Apply Free vs Complete intelligence depth to Four Questions answers.
 * Uses existing answers only — never invents premium content.
 */

import { SEE_COMPLETE_ANALYSIS_LABEL } from "@/lib/services/productAccess";
import type { ProductAccess } from "@/lib/services/productAccess";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
  FourQuestionsBundle,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";

const FREE_EXPAND_LIMIT: Record<FourQuestionAnswer["id"], number> = {
  what_happened: 2,
  what_matters_now: 1,
  am_i_on_track: 1,
  whats_ahead: 1,
};

function preferredFreeItemIds(
  id: FourQuestionAnswer["id"],
): readonly string[] {
  switch (id) {
    case "what_happened":
      return ["period-return", "top-positive", "top-negative", "attr-"];
    case "what_matters_now":
      return [];
    case "am_i_on_track":
      return ["progress"];
    case "whats_ahead":
      return ["scenario", "resilience", "event"];
    default:
      return [];
  }
}

function selectFreeExpandItems(
  question: FourQuestionAnswer,
): FourQuestionExpandItem[] {
  const limit = FREE_EXPAND_LIMIT[question.id];
  const preferred = preferredFreeItemIds(question.id);
  const ranked =
    preferred.length === 0
      ? question.expandItems
      : [
          ...question.expandItems.filter((item) =>
            preferred.some(
              (prefix) => item.id === prefix || item.id.startsWith(prefix),
            ),
          ),
          ...question.expandItems.filter(
            (item) =>
              !preferred.some(
                (prefix) => item.id === prefix || item.id.startsWith(prefix),
              ),
          ),
        ];

  const kept = ranked.slice(0, limit);
  const withheld = Math.max(0, question.expandItems.length - kept.length);
  if (withheld <= 0) return kept;

  return [
    ...kept,
    {
      id: "complete-preview",
      label: "Complete analysis",
      detail:
        withheld === 1
          ? "Tobailey found 1 more thing worth understanding today."
          : `Tobailey found ${withheld} more things worth understanding today.`,
    },
  ];
}

function applyFreeDepthToQuestion(
  question: FourQuestionAnswer,
): FourQuestionAnswer {
  return {
    ...question,
    expandItems: selectFreeExpandItems(question),
    // Free keeps glance; hide methodology walls that imply full Complete.
    disclosures: [],
    explore: {
      label: SEE_COMPLETE_ANALYSIS_LABEL,
      href: question.explore.href,
    },
  };
}

export function applyFourQuestionsIntelligenceDepth(
  bundle: FourQuestionsBundle,
  depth: FourQuestionsIntelligenceDepth,
): FourQuestionsBundle {
  if (depth === "complete") {
    return { ...bundle, intelligenceDepth: "complete" };
  }
  return {
    ...bundle,
    intelligenceDepth: "free",
    questions: bundle.questions.map(applyFreeDepthToQuestion),
  };
}

export function applyFourQuestionsProductAccess(
  bundle: FourQuestionsBundle,
  access: ProductAccess,
): FourQuestionsBundle {
  return applyFourQuestionsIntelligenceDepth(bundle, access.intelligenceDepth);
}
