/**
 * Stance history from stored intelligence snapshots only.
 * Never reconstructs missing dates from current holdings.
 */

import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import { buildPortfolioStanceFromInputs } from "@/lib/services/portfolioStance/buildPortfolioStance";
import {
  collectStanceInputsFromSnapshot,
} from "@/lib/services/portfolioStance/collectStanceInputs";
import {
  STANCE_CHANGE_MATERIAL_SCORE,
  STANCE_HISTORY_BUILDING,
} from "@/lib/services/portfolioStance/config";
import type {
  PortfolioStance,
  PortfolioStanceHistory,
  StanceChange,
  StanceFactorDelta,
  StanceHistoryCheckpoint,
} from "@/lib/services/portfolioStance/types";

function checkpointDate(snapshot: IntelligenceStateSnapshot): string {
  return snapshot.periodEnd.slice(0, 10);
}

function toCheckpoint(
  snapshot: IntelligenceStateSnapshot,
): StanceHistoryCheckpoint | null {
  const inputs = collectStanceInputsFromSnapshot(snapshot);
  if (!inputs) return null;
  const stance = buildPortfolioStanceFromInputs(inputs);
  if (stance.status !== "ready" || stance.score == null || !stance.bandId || !stance.bandLabel) {
    return null;
  }
  return {
    date: checkpointDate(snapshot),
    score: stance.score,
    bandId: stance.bandId,
    bandLabel: stance.bandLabel,
    sourceQuality: "stored_snapshot",
    confidence: stance.confidence ?? "limited",
  };
}

function currentCheckpoint(
  current: PortfolioStance,
  asOfDate: string,
): StanceHistoryCheckpoint | null {
  if (current.status !== "ready" || current.score == null || !current.bandId || !current.bandLabel) {
    return null;
  }
  return {
    date: asOfDate,
    score: current.score,
    bandId: current.bandId,
    bandLabel: current.bandLabel,
    sourceQuality: "current",
    confidence: current.confidence ?? "limited",
  };
}

function buildAttribution(
  previous: PortfolioStance,
  current: PortfolioStance,
): StanceFactorDelta[] | null {
  if (previous.status !== "ready" || current.status !== "ready") return null;
  const deltas: StanceFactorDelta[] = [];
  for (const factor of current.factors) {
    const prior = previous.factors.find((row) => row.id === factor.id);
    if (!factor.applicable || !prior?.applicable) continue;
    const deltaPoints = factor.contributionPoints - prior.contributionPoints;
    if (deltaPoints === 0) continue;
    deltas.push({
      id: factor.id,
      label: factor.label,
      deltaPoints,
    });
  }
  if (deltas.length === 0) return [];
  return deltas.sort(
    (left, right) => Math.abs(right.deltaPoints) - Math.abs(left.deltaPoints),
  );
}

export function buildStanceChange(input: {
  from: StanceHistoryCheckpoint;
  to: StanceHistoryCheckpoint;
  attribution: StanceFactorDelta[] | null;
}): StanceChange {
  const pointChange = input.to.score - input.from.score;
  const zoneChanged = input.from.bandId !== input.to.bandId;
  const material =
    Math.abs(pointChange) >= STANCE_CHANGE_MATERIAL_SCORE || zoneChanged;
  const direction =
    pointChange > 0 ? "more offensive" : pointChange < 0 ? "more defensive" : "unchanged";
  const summary = zoneChanged
    ? `Your portfolio moved from ${input.from.bandLabel} to ${input.to.bandLabel}.`
    : material
      ? `Your portfolio stance moved ${direction} (${input.from.score} → ${input.to.score}).`
      : `Your portfolio stance stayed in ${input.to.bandLabel}.`;

  return {
    material,
    fromScore: input.from.score,
    toScore: input.to.score,
    pointChange,
    fromBandId: input.from.bandId,
    toBandId: input.to.bandId,
    fromBandLabel: input.from.bandLabel,
    toBandLabel: input.to.bandLabel,
    zoneChanged,
    attribution: material ? input.attribution : null,
    summary,
  };
}

export type BuildPortfolioStanceHistoryInput = {
  snapshots: IntelligenceStateSnapshot[] | null | undefined;
  current: PortfolioStance;
  asOfDate?: string;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
};

export function buildPortfolioStanceHistory(
  input: BuildPortfolioStanceHistoryInput,
): PortfolioStanceHistory {
  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const asOfDate = input.asOfDate ?? new Date().toISOString().slice(0, 10);
  const now = currentCheckpoint(input.current, asOfDate);

  const historical = [...(input.snapshots ?? [])]
    .filter((snapshot) => !snapshot.payload.isDemo)
    .map((snapshot) => ({
      snapshot,
      checkpoint: toCheckpoint(snapshot),
    }))
    .filter(
      (row): row is { snapshot: IntelligenceStateSnapshot; checkpoint: StanceHistoryCheckpoint } =>
        row.checkpoint != null,
    )
    .sort((left, right) => left.checkpoint.date.localeCompare(right.checkpoint.date));

  const checkpoints: StanceHistoryCheckpoint[] = [
    ...historical.map((row) => row.checkpoint),
    ...(now ? [now] : []),
  ];

  const unique: StanceHistoryCheckpoint[] = [];
  for (const row of checkpoints) {
    const previous = unique[unique.length - 1];
    if (previous && previous.date === row.date && previous.sourceQuality === "current") {
      unique[unique.length - 1] = row;
      continue;
    }
    if (previous && previous.date === row.date && row.sourceQuality === "current") {
      unique[unique.length - 1] = row;
      continue;
    }
    unique.push(row);
  }

  const prior =
    unique.length >= 2 ? unique[unique.length - 2]! : null;
  let change: StanceChange | null = null;
  if (prior && now) {
    const previousSnapshot = historical.find(
      (row) => row.checkpoint.date === prior.date,
    )?.snapshot;
    const previousStance = previousSnapshot
      ? buildPortfolioStanceFromInputs(
          collectStanceInputsFromSnapshot(previousSnapshot)!,
        )
      : null;
    change = buildStanceChange({
      from: prior,
      to: now,
      attribution:
        previousStance && input.current.status === "ready"
          ? buildAttribution(previousStance, input.current)
          : null,
    });
  }

  const ready = unique.length >= 2;
  return {
    status: ready ? "ready" : "building",
    buildingCopy: ready ? null : STANCE_HISTORY_BUILDING,
    current: input.current,
    checkpoints: depth === "complete" ? unique : unique.slice(-1),
    prior: depth === "complete" ? prior : null,
    change: depth === "complete" ? change : null,
    intelligenceDepth: depth,
  };
}
