/**
 * News hub projection of holding intelligence.
 * Rank by portfolio impact — never by article count.
 * Coverage-before-repetition is applied after materiality.
 */

import { ATTRIBUTION_DISPLAY_MIN_PP } from "@/lib/services/personalIntelligence/attribution";
import {
  CONFIDENCE_LABEL_BY_STATUS,
  MACRO_CONTEXT_NOTE,
  NEWS_HUB_NO_CATALYST,
  type HoldingIntelligenceCandidate,
} from "@/lib/services/holdingIntelligence/types";
import {
  coverageThemeFromCandidate,
  selectCoverageFirstHoldings,
} from "@/lib/services/news/portfolioCoverage";
import type { NewsContentItem } from "@/lib/types/newsContent";

type IntelligenceDepth = "free" | "complete";

export const NEWS_HUB_HOLDING_LIMIT = 8;

export type NewsHubHoldingRow = {
  candidate: HoldingIntelligenceCandidate;
  exposureLabel: string;
  moveLabel: string;
  impactLabel: string;
  contextCopy: string;
  contextHeadline: string | null;
  contextItem: NewsContentItem | null;
  confidenceLabel: "High" | "Medium" | "Low" | null;
  matchRole: "catalyst_context" | "sector_context" | "macro_context" | "none";
};

function signedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function signedPp(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} pp`;
}

export function isNewsHubMaterialHolding(
  candidate: HoldingIntelligenceCandidate,
): boolean {
  return (
    candidate.contributionPp != null &&
    Number.isFinite(candidate.contributionPp) &&
    Math.abs(candidate.contributionPp) >= ATTRIBUTION_DISPLAY_MIN_PP
  );
}

function hasStrongHoldingContext(
  candidate: HoldingIntelligenceCandidate,
): boolean {
  return candidate.matchType === "direct_instrument";
}

function isVerifiedThematicContext(
  candidate: HoldingIntelligenceCandidate,
): boolean {
  if (candidate.matchType === "instrument_alias") return true;
  return candidate.matchType === "sector_theme" && !candidate.isBitcoin;
}

export function selectNewsHubHoldingCandidates(
  candidates: HoldingIntelligenceCandidate[],
  limit = NEWS_HUB_HOLDING_LIMIT,
): HoldingIntelligenceCandidate[] {
  return selectCoverageFirstHoldings(candidates, limit);
}

export function buildNewsHubHoldingRow(
  candidate: HoldingIntelligenceCandidate,
  depth: IntelligenceDepth = "complete",
): NewsHubHoldingRow {
  const strong = hasStrongHoldingContext(candidate);
  const thematic = isVerifiedThematicContext(candidate);
  const macro = candidate.matchType === "macro_context";
  const fixedIncomeMacro =
    macro && candidate.exposureGroupId === "fixed_income";
  const showArticle =
    Boolean(candidate.newsItem) && (strong || thematic || fixedIncomeMacro);
  const confidenceLabel = CONFIDENCE_LABEL_BY_STATUS[candidate.explanationStatus];
  const exposureLabel = coverageThemeFromCandidate(candidate).label;

  let contextCopy = NEWS_HUB_NO_CATALYST;
  let matchRole: NewsHubHoldingRow["matchRole"] = "none";

  if (showArticle && candidate.newsItem && strong) {
    matchRole = "catalyst_context";
    contextCopy = candidate.newsItem.title;
  } else if (showArticle && candidate.newsItem && thematic) {
    matchRole = "sector_context";
    contextCopy =
      depth === "complete"
        ? `Sector context: ${candidate.newsItem.title}`
        : "Related sector context, not a proven cause.";
  } else if (showArticle && candidate.newsItem && fixedIncomeMacro) {
    matchRole = "macro_context";
    contextCopy =
      depth === "complete"
        ? `${MACRO_CONTEXT_NOTE} ${candidate.newsItem.title}`
        : MACRO_CONTEXT_NOTE;
  } else if (macro && depth === "complete" && candidate.newsItem) {
    matchRole = "none";
    contextCopy = `${candidate.explanationNote} Official macro context is shown in Markets/Macro when relevant, not as a holding catalyst.`;
  } else if (
    candidate.isBitcoin &&
    candidate.matchType === "sector_theme" &&
    depth === "complete" &&
    candidate.newsItem
  ) {
    matchRole = "none";
    contextCopy = `${candidate.explanationNote} ${candidate.newsItem.title}`;
  }

  return {
    candidate,
    exposureLabel,
    moveLabel:
      candidate.changePercent == null
        ? "Unavailable"
        : signedPercent(candidate.changePercent),
    impactLabel:
      candidate.contributionPp == null
        ? "Unavailable"
        : signedPp(candidate.contributionPp),
    contextCopy,
    contextHeadline: showArticle ? candidate.newsItem?.title ?? null : null,
    contextItem: showArticle ? candidate.newsItem : null,
    confidenceLabel: depth === "complete" ? confidenceLabel : null,
    matchRole,
  };
}

export function buildNewsHubHoldingRows(
  candidates: HoldingIntelligenceCandidate[],
  depth: IntelligenceDepth = "complete",
  limit = NEWS_HUB_HOLDING_LIMIT,
): NewsHubHoldingRow[] {
  return selectNewsHubHoldingCandidates(candidates, limit).map((candidate) =>
    buildNewsHubHoldingRow(candidate, depth),
  );
}
