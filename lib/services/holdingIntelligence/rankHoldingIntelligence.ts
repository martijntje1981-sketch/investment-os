/**
 * Rank holding intelligence by portfolio impact — never by news volume.
 */

import type { HoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/types";

function absOrNull(value: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.abs(value);
}

/**
 * Coverage rank: evaluate all candidates, then order by materiality.
 * News count and crypto identity are ignored. Relevance/confidence is
 * only a later tiebreaker after contribution, weight, and holding move.
 */
export function compareHoldingIntelligenceCandidates(
  a: HoldingIntelligenceCandidate,
  b: HoldingIntelligenceCandidate,
): number {
  const aPp = absOrNull(a.contributionPp);
  const bPp = absOrNull(b.contributionPp);
  if (aPp != null && bPp != null && aPp !== bPp) return bPp - aPp;
  if (aPp != null && bPp == null) return -1;
  if (aPp == null && bPp != null) return 1;

  const aWeight = absOrNull(a.weightPercent);
  const bWeight = absOrNull(b.weightPercent);
  if (aWeight != null && bWeight != null && aWeight !== bWeight) {
    return bWeight - aWeight;
  }
  if (aWeight != null && bWeight == null) return -1;
  if (aWeight == null && bWeight != null) return 1;

  const aMove = absOrNull(a.changePercent);
  const bMove = absOrNull(b.changePercent);
  if (aMove != null && bMove != null && aMove !== bMove) return bMove - aMove;
  if (aMove != null && bMove == null) return -1;
  if (aMove == null && bMove != null) return 1;

  if (a.confidence !== b.confidence) return b.confidence - a.confidence;

  const aRelevance = a.relevanceScore ?? -1;
  const bRelevance = b.relevanceScore ?? -1;
  if (aRelevance !== bRelevance) return bRelevance - aRelevance;

  return a.symbol.localeCompare(b.symbol);
}

export function rankHoldingIntelligenceCandidates(
  candidates: HoldingIntelligenceCandidate[],
): HoldingIntelligenceCandidate[] {
  return [...candidates].sort(compareHoldingIntelligenceCandidates);
}

/**
 * Select top items only after every eligible holding has a candidate.
 */
export function selectTopHoldingIntelligence(
  candidates: HoldingIntelligenceCandidate[],
  limit: number,
): HoldingIntelligenceCandidate[] {
  if (limit <= 0) return [];
  return rankHoldingIntelligenceCandidates(candidates).slice(0, limit);
}

export function findHoldingIntelligenceCandidate(
  candidates: HoldingIntelligenceCandidate[],
  symbol: string,
): HoldingIntelligenceCandidate | null {
  const key = symbol.trim().toUpperCase();
  return (
    candidates.find((row) => row.symbol.trim().toUpperCase() === key) ?? null
  );
}
