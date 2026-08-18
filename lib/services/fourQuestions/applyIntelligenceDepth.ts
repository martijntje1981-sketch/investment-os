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
  what_happened: 1,
  what_matters_now: 1,
  am_i_on_track: 1,
  whats_ahead: 1,
};

function preferredFreeItemIds(
  id: FourQuestionAnswer["id"],
): readonly string[] {
  switch (id) {
    case "what_happened":
      return ["trace-evidence", "period-return", "top-positive", "top-negative", "attr-"];
    case "what_matters_now":
      return ["trace-evidence"];
    case "am_i_on_track":
      return ["trace-evidence", "progress"];
    case "whats_ahead":
      return ["trace-evidence", "scenario", "resilience", "event"];
    default:
      return [];
  }
}

const TEASE_CATEGORIES: Partial<Record<string, string>> = {
  "trace-change": "See what changed and why it matters",
  "trace-meaning": "What this move means",
  "trace-relevant_context": "Relevant market context",
  "trace-perspective": "A related Perspective",
  "trace-sensitivity": "Scenario impact",
  "trace-goal_impact": "Goal impact",
};

function teaseCategories(items: FourQuestionExpandItem[]): string[] {
  const labels: string[] = [];
  for (const item of items) {
    const mapped = TEASE_CATEGORIES[item.id];
    if (mapped && !labels.includes(mapped)) labels.push(mapped);
    if (labels.length >= 3) break;
  }
  return labels;
}

function selectFreeExpandItems(
  question: FourQuestionAnswer,
): FourQuestionExpandItem[] {
  const hasChange = question.expandItems.some((item) => item.id === "trace-change");
  if (hasChange) {
    const withheld = question.expandItems;
    const categories = teaseCategories(withheld);
    return [
      {
        id: "complete-preview",
        label: "Complete analysis",
        detail: "See what changed and why it matters",
        bullets: categories.length > 0 ? categories : ["See what changed and why it matters"],
        href: question.explore.href,
        emphasis: "high",
      },
    ];
  }

  const limit = FREE_EXPAND_LIMIT[question.id];
  const preferred = preferredFreeItemIds(question.id);
  const evidenceFirst = [
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

  const kept = evidenceFirst
    .filter((item) => item.id === "trace-evidence" || preferred.includes(item.id) || item.id.startsWith("attr-") || item.id === "period-return" || item.id === "progress" || item.id === "scenario" || item.id === "event")
    .slice(0, limit);
  const keptIds = new Set(kept.map((item) => item.id));
  const withheld = question.expandItems.filter((item) => !keptIds.has(item.id));
  if (withheld.length <= 0) return kept.length > 0 ? kept : evidenceFirst.slice(0, limit);

  const categories = teaseCategories(withheld);
  return [
    ...kept,
    {
      id: "complete-preview",
      label: "Complete analysis",
      detail:
        withheld.length === 1
          ? "Tobailey found 1 deeper insight today."
          : `Tobailey found ${withheld.length} deeper insights today.`,
      bullets: categories.length > 0 ? categories : undefined,
      href: question.explore.href,
      emphasis: "high",
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
