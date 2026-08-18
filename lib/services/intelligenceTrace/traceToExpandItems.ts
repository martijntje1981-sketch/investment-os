/**
 * Map trace layers → Four Questions expand rows.
 * Presentation-only — never recalculates financial values.
 */

import type {
  FourQuestionExpandItem,
  FourQuestionId,
  FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions/types";
import type {
  IntelligenceTrace,
  IntelligenceTraceEmphasis,
  IntelligenceTraceLayer,
  IntelligenceTraceLayerId,
} from "./types";

const EXPAND_LAYER_ORDER: IntelligenceTraceLayer["id"][] = [
  "meaning",
  "relevant_context",
  "perspective",
  "sensitivity",
  "goal_impact",
  "evidence",
  "change",
  "calculation",
  "confidence",
];

const DEFAULT_EMPHASIS: Record<IntelligenceTraceLayerId, IntelligenceTraceEmphasis> = {
  meaning: "high",
  relevant_context: "high",
  perspective: "high",
  sensitivity: "high",
  goal_impact: "high",
  evidence: "supporting",
  change: "supporting",
  calculation: "supporting",
  confidence: "low",
};

const FREE_TEASE_CATEGORIES: Partial<Record<string, string>> = {
  "trace-meaning": "What this move means",
  "trace-relevant_context": "Relevant market context",
  "trace-perspective": "A related Perspective",
  "trace-sensitivity": "Scenario impact",
  "trace-goal_impact": "Goal impact",
};

function resolveEmphasis(layer: IntelligenceTraceLayer): IntelligenceTraceEmphasis {
  return layer.emphasis ?? DEFAULT_EMPHASIS[layer.id] ?? "supporting";
}

function layerToExpandItem(layer: IntelligenceTraceLayer): FourQuestionExpandItem {
  return {
    id: `trace-${layer.id}`,
    label: layer.title,
    detail: layer.detail,
    bullets: layer.bullets,
    href: layer.href ?? null,
    hrefExternal: layer.hrefExternal,
    emphasis: resolveEmphasis(layer),
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
  what_happened: 1,
  what_matters_now: 0,
  am_i_on_track: 1,
  whats_ahead: 1,
};

function teaseCategories(withheld: FourQuestionExpandItem[]): string[] {
  const labels: string[] = [];
  for (const item of withheld) {
    const mapped = FREE_TEASE_CATEGORIES[item.id];
    if (mapped && !labels.includes(mapped)) labels.push(mapped);
    if (labels.length >= 3) break;
  }
  return labels;
}

function completePreviewItem(input: {
  withheldCount: number;
  withheld: FourQuestionExpandItem[];
  exploreHref?: string | null;
}): FourQuestionExpandItem {
  const categories = teaseCategories(input.withheld);
  return {
    id: "complete-preview",
    label: "Complete analysis",
    detail:
      input.withheldCount === 1
        ? "Tobailey found 1 deeper insight today."
        : `Tobailey found ${input.withheldCount} deeper insights today.`,
    bullets: categories.length > 0 ? categories : undefined,
    href: input.exploreHref?.trim() || null,
    emphasis: "high",
  };
}

/**
 * Convert trace layers to expand rows for the requested intelligence depth.
 */
export function traceToExpandItems(input: {
  trace: IntelligenceTrace | null | undefined;
  questionId: FourQuestionId;
  depth: FourQuestionsIntelligenceDepth;
  exploreHref?: string | null;
}): FourQuestionExpandItem[] {
  const { trace, questionId, depth } = input;
  if (!trace || trace.layers.length === 0) return [];

  const sorted = sortLayers(trace.layers);

  if (depth === "complete") {
    return sorted.map(layerToExpandItem);
  }

  const expandLayers = sorted.filter((layer) => layer.presentation === "expand");
  const preferred = expandLayers.filter((layer) => layer.id === "evidence");
  const fallback = preferred.length > 0 ? preferred : expandLayers;
  const limit = FREE_EXPAND_LAYER_LIMIT[questionId] ?? 1;
  const keptLayers = fallback.slice(0, limit);
  const keptIds = new Set(keptLayers.map((layer) => `trace-${layer.id}`));
  const allRows = sorted.map(layerToExpandItem);
  const kept = allRows.filter((row) => keptIds.has(row.id)).slice(0, limit);
  const withheld = allRows.filter((row) => !keptIds.has(row.id));

  if (withheld.length <= 0) return kept;

  return [
    ...kept,
    completePreviewItem({
      withheldCount: withheld.length,
      withheld,
      exploreHref: input.exploreHref,
    }),
  ];
}
