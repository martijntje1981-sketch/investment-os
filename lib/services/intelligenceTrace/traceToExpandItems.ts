/**
 * Map trace layers → Four Questions expand rows.
 * Presentation-only — never recalculates financial values.
 */

import type {
  FourQuestionExpandItem,
  FourQuestionId,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

const EXPAND_LAYER_ORDER: IntelligenceTraceLayer["id"][] = [
  "evidence",
  "change",
  "meaning",
  "sensitivity",
  "goal_impact",
  "calculation",
  "confidence",
];

function layerToExpandItem(layer: IntelligenceTraceLayer): FourQuestionExpandItem {
  return {
    id: `trace-${layer.id}`,
    label: layer.title,
    detail: layer.detail,
    bullets: layer.bullets,
    href: layer.href ?? null,
    hrefExternal: layer.hrefExternal,
  };
}

function sortLayers(layers: IntelligenceTraceLayer[]): IntelligenceTraceLayer[] {
  return [...layers].sort(
    (left, right) =>
      EXPAND_LAYER_ORDER.indexOf(left.id) - EXPAND_LAYER_ORDER.indexOf(right.id),
  );
}

const FREE_EXPAND_LAYER_LIMIT: Partial<
  Record<FourQuestionId, number>
> = {
  what_matters_now: 0,
  whats_ahead: 1,
};

/**
 * Convert trace layers to expand rows for the requested intelligence depth.
 */
export function traceToExpandItems(input: {
  trace: IntelligenceTrace | null | undefined;
  questionId: FourQuestionId;
  depth: FourQuestionsIntelligenceDepth;
}): FourQuestionExpandItem[] {
  const { trace, questionId, depth } = input;
  if (!trace || trace.layers.length === 0) return [];

  const sorted = sortLayers(trace.layers);

  if (depth === "complete") {
    return sorted.map(layerToExpandItem);
  }

  const expandLayers = sorted.filter((layer) => layer.presentation === "expand");
  const limit = FREE_EXPAND_LAYER_LIMIT[questionId] ?? 1;
  const kept = expandLayers.slice(0, limit);
  const withheld = Math.max(0, sorted.length - kept.length);

  const rows = kept.map(layerToExpandItem);
  if (withheld <= 0) return rows;

  return [
    ...rows,
    {
      id: "complete-preview",
      label: "Complete analysis",
      detail:
        withheld === 1
          ? "Tobailey found 1 more traceable insight behind this conclusion."
          : `Tobailey found ${withheld} more traceable insights behind this conclusion.`,
    },
  ];
}
