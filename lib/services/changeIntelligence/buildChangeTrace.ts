/**
 * Map a Change Intelligence story onto the Phase 7 trace model.
 * Surface-agnostic — Four Questions, Review, and later reports reuse this.
 */

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { ChangeIntelligenceStory } from "@/lib/services/changeIntelligence/types";
import type {
  IntelligenceTrace,
  IntelligenceTraceLayer,
} from "@/lib/services/intelligenceTrace";

function hrefFor(story: ChangeIntelligenceStory): string {
  if (story.category === "goal_progress") return "/goals";
  if (story.category === "resilience" || story.category === "scenario_sensitivity") {
    return DASHBOARD_DEEP_LINKS.resilienceSleep;
  }
  return DASHBOARD_DEEP_LINKS.portfolioExposure;
}

export function buildChangeTrace(input: {
  insight: string;
  story: ChangeIntelligenceStory;
  extraLayers?: IntelligenceTraceLayer[];
}): IntelligenceTrace {
  const { insight, story, extraLayers = [] } = input;
  const href = hrefFor(story);
  const layers: IntelligenceTraceLayer[] = [
    {
      id: "change",
      title: "What changed",
      detail: story.supportingLine
        ? `${story.supportingLine}. Compared ${story.signal.window.previousPeriodKey} with ${story.signal.window.currentPeriodKey}.`
        : story.headline,
      bullets: [
        `Comparison: ${story.signal.window.previousPeriodKey} → ${story.signal.window.currentPeriodKey}`,
        ...(story.relatedLines.length > 0 ? story.relatedLines : []),
      ],
      presentation: "expand",
      href,
      emphasis: "high",
    },
    {
      id: "meaning",
      title: "What it means",
      detail: story.meaning,
      bullets: story.relatedLines.length > 0 ? story.relatedLines : undefined,
      presentation: "expand",
      href,
      emphasis: "high",
    },
    {
      id: "evidence",
      title: "Evidence",
      detail: "These figures come from two stored intelligence snapshots — not a reconstructed history.",
      bullets: story.evidence.length > 0 ? story.evidence : undefined,
      presentation: "expand",
      href,
      emphasis: "supporting",
    },
    {
      id: "calculation",
      title: "Why this comparison is available",
      detail: story.whyAvailable,
      presentation: "explore",
      href,
      emphasis: "supporting",
    },
    {
      id: "confidence",
      title: "Data confidence",
      detail:
        story.limitations[0] ??
        "Based on two stored intelligence snapshots of the same period kind.",
      bullets: story.limitations.length > 1 ? story.limitations.slice(1) : undefined,
      presentation: "explore",
      emphasis: "low",
    },
  ];

  for (const extra of extraLayers) {
    if (layers.some((layer) => layer.id === extra.id)) continue;
    layers.push(extra);
  }

  return {
    insight,
    layers,
  };
}

export function mergeChangeIntoTrace(
  base: IntelligenceTrace | null,
  change: IntelligenceTrace,
): IntelligenceTrace {
  if (!base) return change;
  const changeIds = new Set(change.layers.map((layer) => layer.id));
  const kept = base.layers.filter((layer) => !changeIds.has(layer.id));
  return {
    insight: change.insight,
    layers: [...change.layers, ...kept],
    omittedLayerIds: (base.omittedLayerIds ?? []).filter((id) => !changeIds.has(id)),
  };
}
