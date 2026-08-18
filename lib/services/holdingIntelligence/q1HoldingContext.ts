/**
 * Four Questions Q1 supporting context from holding intelligence.
 * Does not replace contribution attribution. Unavailable omits the layer.
 */

import {
  CONFIDENCE_LABEL_BY_STATUS,
  ETF_CONTEXTUAL_NOTE,
  HOLDING_EXPLANATION_NOTES,
  NEWS_HUB_NO_CATALYST,
  type HoldingIntelligenceCandidate,
} from "@/lib/services/holdingIntelligence/types";
import { buildHoldingStoryIdentity } from "@/lib/services/holdingIntelligence/storyIdentity";
import type { IntelligenceTraceLayer } from "@/lib/services/intelligenceTrace/types";

export function buildQ1HoldingContextLayer(
  candidate: HoldingIntelligenceCandidate | null,
): IntelligenceTraceLayer | null {
  if (!candidate) return null;
  if (candidate.explanationStatus === "unavailable") return null;

  const confidence = CONFIDENCE_LABEL_BY_STATUS[candidate.explanationStatus];
  const headline = candidate.newsItem?.title?.trim() || null;
  const source = candidate.newsItem?.sourceName?.trim() || null;

  if (candidate.explanationStatus === "insufficient_evidence") {
    return {
      id: "relevant_context",
      title: "Relevant context",
      detail: NEWS_HUB_NO_CATALYST,
      bullets: confidence ? [`Confidence: ${confidence}`] : undefined,
      presentation: "expand",
      emphasis: "supporting",
    };
  }

  const notCause = "Related context, not a proven cause.";
  const bullets = [
    ...(confidence ? [`Confidence: ${confidence}`] : []),
    candidate.matchType === "sector_theme" || candidate.isEtfLike
      ? "Sector context, not a proven cause."
      : notCause,
  ];

  if (candidate.explanationStatus === "supported") {
    const lead = headline
      ? source
        ? `${headline} (${source}). ${HOLDING_EXPLANATION_NOTES.supported}`
        : `${headline}. ${HOLDING_EXPLANATION_NOTES.supported}`
      : HOLDING_EXPLANATION_NOTES.supported;
    return {
      id: "relevant_context",
      title: "Relevant context",
      detail: lead,
      bullets,
      presentation: "expand",
      href: candidate.newsItem?.canonicalUrl ?? null,
      hrefExternal: Boolean(candidate.newsItem?.canonicalUrl),
      emphasis: "supporting",
    };
  }

  const contextualLead = headline
    ? candidate.isEtfLike
      ? `Sector context: ${headline}. ${ETF_CONTEXTUAL_NOTE}`
      : `${headline}. ${candidate.explanationNote}`
    : candidate.explanationNote;

  return {
    id: "relevant_context",
    title: "Relevant context",
    detail: `${contextualLead} ${notCause}`,
    bullets,
    presentation: "expand",
    href: candidate.newsItem?.canonicalUrl ?? null,
    hrefExternal: Boolean(candidate.newsItem?.canonicalUrl),
    emphasis: "supporting",
  };
}

export function q1StoryExcludeHrefs(
  candidate: HoldingIntelligenceCandidate | null,
): string[] {
  const identity = candidate ? buildHoldingStoryIdentity(candidate) : null;
  const hrefs: string[] = [];
  if (candidate?.newsItem?.canonicalUrl) {
    hrefs.push(candidate.newsItem.canonicalUrl);
  }
  if (identity?.canonicalUrl && !hrefs.includes(identity.canonicalUrl)) {
    hrefs.push(identity.canonicalUrl);
  }
  return hrefs;
}
