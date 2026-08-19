/**
 * Rank change signals by personal portfolio materiality.
 * Article count is never a ranking input.
 */

import type {
  PortfolioChangeSignal,
  PortfolioChangeType,
} from "@/lib/services/portfolioChangeDetection/types";

function typeRank(type: PortfolioChangeType): number {
  switch (type) {
    case "holding_contribution":
    case "holding_move_with_context":
      return 0;
    case "largest_holding_changed":
    case "concentration_changed":
    case "holding_weight_changed":
    case "exposure_mix_changed":
      return 1;
    case "goal_progress_changed":
      return 2;
    case "resilience_changed":
    case "scenario_sensitivity_changed":
      return 3;
    case "portfolio_relevant_news":
      return 4;
    default:
      return 9;
  }
}

function confidenceRank(signal: PortfolioChangeSignal): number {
  if (signal.confidence === "high") return 0;
  if (signal.confidence === "moderate") return 1;
  return 2;
}

function recencyRank(signal: PortfolioChangeSignal): number {
  return signal.windowKind === "today" ? 0 : 1;
}

export function comparePortfolioChangeSignals(
  left: PortfolioChangeSignal,
  right: PortfolioChangeSignal,
): number {
  const leftImpact = Math.abs(left.portfolioImpactPp ?? 0);
  const rightImpact = Math.abs(right.portfolioImpactPp ?? 0);
  if (leftImpact !== rightImpact) return rightImpact - leftImpact;

  const structural = typeRank(left.type) - typeRank(right.type);
  if (structural !== 0) return structural;

  const evidence = confidenceRank(left) - confidenceRank(right);
  if (evidence !== 0) return evidence;

  const recency = recencyRank(left) - recencyRank(right);
  if (recency !== 0) return recency;

  return left.id.localeCompare(right.id);
}

export function rankPortfolioChangeSignals(
  signals: PortfolioChangeSignal[],
): PortfolioChangeSignal[] {
  return [...signals].sort(comparePortfolioChangeSignals);
}

export function dedupePortfolioChangeSignals(
  signals: PortfolioChangeSignal[],
): PortfolioChangeSignal[] {
  const ranked = rankPortfolioChangeSignals(signals);
  const seenHoldings = new Set<string>();
  const seenTypes = new Set<string>();
  const out: PortfolioChangeSignal[] = [];

  for (const signal of ranked) {
    const holdingKey = signal.holdingSymbol?.trim().toUpperCase() ?? "";
    if (holdingKey) {
      if (seenHoldings.has(holdingKey)) continue;
      seenHoldings.add(holdingKey);
    } else {
      const typeKey = signal.type;
      if (seenTypes.has(typeKey)) continue;
      seenTypes.add(typeKey);
    }
    out.push(signal);
  }
  return out;
}
