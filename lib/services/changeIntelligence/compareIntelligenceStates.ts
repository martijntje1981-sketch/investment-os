/**
 * Pure Change Intelligence comparison.
 * Requires two stored snapshots. Never invents a previous state.
 */

import {
  CHANGE_CATEGORY_ORDER,
  CHANGE_INTELLIGENCE_THRESHOLDS as THRESHOLDS,
  INSUFFICIENT_HISTORY_REASON,
  QUANTITY_CHANGE_EPSILON,
} from "@/lib/services/changeIntelligence/config";
import type {
  ChangeCategory,
  ChangeIntelligenceResult,
  ChangeSignal,
  ChangeSignalConfidence,
  ChangeSignalDirection,
  ChangeSignalMateriality,
  ChangeSignalUnit,
  ChangeSignalWindow,
  IntelligenceHoldingState,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function directionFromDelta(delta: number | null): ChangeSignalDirection {
  if (delta == null || delta === 0) return "unchanged";
  return delta > 0 ? "increased" : "decreased";
}

function absDelta(delta: number | null): number {
  return delta == null ? 0 : Math.abs(delta);
}

function formatPp(value: number): string {
  const rounded = round1(value);
  return Number.isInteger(rounded) || Math.abs(rounded - Math.round(rounded)) < 1e-9
    ? String(Math.round(rounded))
    : rounded.toFixed(1);
}

function formatSignedPp(delta: number): string {
  const abs = formatPp(Math.abs(delta));
  return `${abs} percentage point${Math.abs(delta) === 1 ? "" : "s"}`;
}

function quantityChanged(
  previous: number | null | undefined,
  current: number | null | undefined,
): boolean {
  if (
    previous == null ||
    current == null ||
    !Number.isFinite(previous) ||
    !Number.isFinite(current)
  ) {
    return false;
  }
  return Math.abs(current - previous) > QUANTITY_CHANGE_EPSILON;
}

function findHolding(
  holdings: IntelligenceHoldingState[],
  id: string | null | undefined,
  symbol: string | null | undefined,
): IntelligenceHoldingState | null {
  if (id) {
    const byId = holdings.find((row) => row.id === id);
    if (byId) return byId;
  }
  if (symbol) {
    const needle = symbol.trim().toUpperCase();
    return (
      holdings.find((row) => row.symbol.trim().toUpperCase() === needle) ?? null
    );
  }
  return null;
}

function windowFrom(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
): ChangeSignalWindow {
  return {
    snapshotKind: current.snapshotKind,
    previousPeriodKey: previous.periodKey,
    currentPeriodKey: current.periodKey,
    previousCapturedAt: previous.capturedAt,
    currentCapturedAt: current.capturedAt,
  };
}

function signal(input: {
  category: ChangeCategory;
  metric: string;
  subject: string;
  previousValue: number | null;
  currentValue: number | null;
  unit: ChangeSignalUnit;
  window: ChangeSignalWindow;
  headline: string;
  explanation: string;
  materiality: ChangeSignalMateriality;
  confidence?: ChangeSignalConfidence;
  quantityChanged?: boolean;
  previousQuantity?: number | null;
  currentQuantity?: number | null;
  limitations?: string[];
}): ChangeSignal {
  const delta =
    input.previousValue != null && input.currentValue != null
      ? round1(input.currentValue - input.previousValue)
      : null;
  return {
    id: `${input.category}:${input.subject}`,
    category: input.category,
    metric: input.metric,
    subject: input.subject,
    previousValue: input.previousValue,
    currentValue: input.currentValue,
    delta,
    unit: input.unit,
    window: input.window,
    direction: directionFromDelta(delta),
    materiality: input.materiality,
    headline: input.headline,
    explanation: input.explanation,
    confidence: input.confidence ?? "high",
    quantityChanged: Boolean(input.quantityChanged),
    previousQuantity: input.previousQuantity ?? null,
    currentQuantity: input.currentQuantity ?? null,
    limitations: input.limitations ?? [],
  };
}

function compareConcentration(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal | null {
  const prev = previous.payload.concentration;
  const curr = current.payload.concentration;
  if (
    prev.largestHoldingWeightPercent == null ||
    curr.largestHoldingWeightPercent == null
  ) {
    return null;
  }

  const prevHolding = findHolding(
    previous.payload.holdings,
    prev.largestHoldingId,
    prev.largestHoldingSymbol,
  );
  const currHolding = findHolding(
    current.payload.holdings,
    curr.largestHoldingId,
    curr.largestHoldingSymbol,
  );
  const qtyChanged = quantityChanged(
    prevHolding?.quantity,
    currHolding?.quantity,
  );
  const sameSubject =
    (prev.largestHoldingId && prev.largestHoldingId === curr.largestHoldingId) ||
    (prev.largestHoldingSymbol &&
      curr.largestHoldingSymbol &&
      prev.largestHoldingSymbol.toUpperCase() ===
        curr.largestHoldingSymbol.toUpperCase());

  const delta = round1(
    curr.largestHoldingWeightPercent - prev.largestHoldingWeightPercent,
  );
  const identityChanged = !sameSubject;
  if (!identityChanged && absDelta(delta) < THRESHOLDS.concentrationPp) {
    return null;
  }

  const prevName = prev.largestHoldingName ?? prev.largestHoldingSymbol ?? "Largest holding";
  const currName = curr.largestHoldingName ?? curr.largestHoldingSymbol ?? "Largest holding";
  const limitations: string[] = [];
  if (qtyChanged) {
    limitations.push(
      "Position quantity also changed between snapshots, so this weight shift is not attributed to market-price movement alone.",
    );
  }

  if (identityChanged) {
    return signal({
      category: "concentration",
      metric: "largest_holding_weight_percent",
      subject: curr.largestHoldingSymbol ?? currName,
      previousValue: prev.largestHoldingWeightPercent,
      currentValue: curr.largestHoldingWeightPercent,
      unit: "percentage_points",
      window,
      materiality: "material",
      headline: `Largest holding changed from ${prevName} (${formatPp(prev.largestHoldingWeightPercent)}%) to ${currName} (${formatPp(curr.largestHoldingWeightPercent)}%).`,
      explanation: `Compared stored snapshots ${previous.periodKey} and ${current.periodKey}. ${prevName} was ${formatPp(prev.largestHoldingWeightPercent)}%; ${currName} is now ${formatPp(curr.largestHoldingWeightPercent)}%.`,
      quantityChanged: qtyChanged,
      previousQuantity: prevHolding?.quantity ?? null,
      currentQuantity: currHolding?.quantity ?? null,
      limitations,
    });
  }

  const verb = delta > 0 ? "increased" : "decreased";
  return signal({
    category: "concentration",
    metric: "largest_holding_weight_percent",
    subject: curr.largestHoldingSymbol ?? currName,
    previousValue: prev.largestHoldingWeightPercent,
    currentValue: curr.largestHoldingWeightPercent,
    unit: "percentage_points",
    window,
    materiality: "material",
    headline: `${currName} concentration ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.largestHoldingWeightPercent)}% → ${formatPp(curr.largestHoldingWeightPercent)}%).`,
    explanation: `Largest holding weight in stored snapshot ${previous.periodKey} was ${formatPp(prev.largestHoldingWeightPercent)}%. In ${current.periodKey} it is ${formatPp(curr.largestHoldingWeightPercent)}%.`,
    quantityChanged: qtyChanged,
    previousQuantity: prevHolding?.quantity ?? null,
    currentQuantity: currHolding?.quantity ?? null,
    limitations,
  });
}

function compareExposure(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal[] {
  const prevGroups = new Map(
    previous.payload.exposure.groups.map((group) => [group.groupId, group]),
  );
  const signals: ChangeSignal[] = [];

  for (const group of current.payload.exposure.groups) {
    const prev = prevGroups.get(group.groupId);
    if (!prev) continue;
    const delta = round1(group.weightPercent - prev.weightPercent);
    if (absDelta(delta) < THRESHOLDS.exposureGroupPp) continue;
    const verb = delta > 0 ? "increased" : "decreased";
    signals.push(
      signal({
        category: "exposure",
        metric: "exposure_group_weight_percent",
        subject: group.groupId,
        previousValue: prev.weightPercent,
        currentValue: group.weightPercent,
        unit: "percentage_points",
        window,
        materiality: "material",
        headline: `${group.displayLabel} exposure ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.weightPercent)}% → ${formatPp(group.weightPercent)}%).`,
        explanation: `Stored ${group.displayLabel} weight was ${formatPp(prev.weightPercent)}% in ${previous.periodKey} and ${formatPp(group.weightPercent)}% in ${current.periodKey}.`,
      }),
    );
  }

  return signals;
}

function compareExposureSubgroups(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal[] {
  const prevRows = new Map(
    (previous.payload.exposure.subgroups ?? []).map((row) => [
      `${row.parentGroupId}:${row.subgroupId}`,
      row,
    ]),
  );
  const signals: ChangeSignal[] = [];

  for (const row of current.payload.exposure.subgroups ?? []) {
    const prev = prevRows.get(`${row.parentGroupId}:${row.subgroupId}`);
    if (!prev) continue;
    const delta = round1(row.weightPercent - prev.weightPercent);
    if (absDelta(delta) < THRESHOLDS.exposureGroupPp) continue;
    const verb = delta > 0 ? "increased" : "decreased";
    signals.push(
      signal({
        category: "exposure",
        metric: "exposure_subgroup_weight_percent",
        subject: row.subgroupId,
        previousValue: prev.weightPercent,
        currentValue: row.weightPercent,
        unit: "percentage_points",
        window,
        materiality: "material",
        headline: `${row.displayLabel} exposure ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.weightPercent)}% → ${formatPp(row.weightPercent)}%).`,
        explanation: `Stored ${row.displayLabel} weight was ${formatPp(prev.weightPercent)}% in ${previous.periodKey} and ${formatPp(row.weightPercent)}% in ${current.periodKey}.`,
      }),
    );
  }

  return signals;
}

function goalDefinitionChanged(
  previous: NonNullable<IntelligenceStateSnapshot["payload"]["goal"]>,
  current: NonNullable<IntelligenceStateSnapshot["payload"]["goal"]>,
): boolean {
  if (previous.goalId && current.goalId && previous.goalId !== current.goalId) {
    return true;
  }
  if (previous.targetValue !== current.targetValue) return true;
  if (previous.targetYear !== current.targetYear) return true;
  return false;
}

function compareGoal(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal | null {
  const prev = previous.payload.goal;
  const curr = current.payload.goal;
  if (!prev || !curr) return null;

  if (goalDefinitionChanged(prev, curr)) {
    return signal({
      category: "goal_progress",
      metric: "goal_definition",
      subject: curr.goalId ?? "goal",
      previousValue: prev.targetValue,
      currentValue: curr.targetValue,
      unit: "score_points",
      window,
      materiality: "definition_changed",
      confidence: "high",
      headline: "Saved goal definition changed, so progress is not compared as an investment result.",
      explanation: `The stored target was ${prev.targetValue} (${prev.targetYear}) in ${previous.periodKey} and ${curr.targetValue} (${curr.targetYear}) in ${current.periodKey}. Progress percentages are not treated as performance between these snapshots.`,
      limitations: [
        "Goal progress change is omitted because the saved goal definition changed.",
      ],
    });
  }

  if (prev.progressPercent == null || curr.progressPercent == null) {
    return null;
  }
  const delta = round1(curr.progressPercent - prev.progressPercent);
  if (absDelta(delta) < THRESHOLDS.goalProgressPp) return null;
  const verb = delta > 0 ? "increased" : "decreased";
  return signal({
    category: "goal_progress",
    metric: "goal_progress_percent",
    subject: curr.goalId ?? "goal",
    previousValue: prev.progressPercent,
    currentValue: curr.progressPercent,
    unit: "percentage_points",
    window,
    materiality: "material",
    headline: `Goal progress ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.progressPercent)}% → ${formatPp(curr.progressPercent)}%).`,
    explanation: `Progress against the same saved target was ${formatPp(prev.progressPercent)}% in ${previous.periodKey} and ${formatPp(curr.progressPercent)}% in ${current.periodKey}.`,
  });
}

function compareResilience(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal | null {
  const prevScore = previous.payload.resilience?.score ?? null;
  const currScore = current.payload.resilience?.score ?? null;
  if (prevScore == null || currScore == null) return null;
  const delta = round1(currScore - prevScore);
  if (absDelta(delta) < THRESHOLDS.resiliencePoints) return null;
  const verb = delta > 0 ? "increased" : "decreased";
  const driver = current.payload.resilience?.primaryDriver;
  const driverNote = driver
    ? ` Primary limiting factor in the current snapshot: ${driver.replace(/_/g, " ")}.`
    : "";
  return signal({
    category: "resilience",
    metric: "resilience_score",
    subject: "resilience",
    previousValue: prevScore,
    currentValue: currScore,
    unit: "score_points",
    window,
    materiality: "material",
    headline: `Resilience ${verb} by ${formatPp(Math.abs(delta))} points (${prevScore} → ${currScore}).`,
    explanation: `Stored resilience score was ${prevScore} in ${previous.periodKey} and ${currScore} in ${current.periodKey}.${driverNote}`,
  });
}

function compareScenarioSensitivity(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
): ChangeSignal | null {
  const prev = previous.payload.resilience?.mostSensitive ?? null;
  const curr = current.payload.resilience?.mostSensitive ?? null;
  if (!prev || !curr) return null;

  if (prev.scenarioId !== curr.scenarioId) {
    return signal({
      category: "scenario_sensitivity",
      metric: "most_sensitive_scenario",
      subject: curr.scenarioId,
      previousValue: prev.estimatedPortfolioImpactPercent,
      currentValue: curr.estimatedPortfolioImpactPercent,
      unit: "percentage_points",
      window,
      materiality: "definition_changed",
      confidence: "moderate",
      headline: `Most-sensitive supported scenario changed from ${prev.scenarioName} to ${curr.scenarioName}.`,
      explanation: `Snapshot ${previous.periodKey} was most sensitive to ${prev.scenarioName}; ${current.periodKey} is most sensitive to ${curr.scenarioName}. Impact percentages are not compared as the same scenario.`,
      limitations: [
        "Most-sensitive scenario identity changed, so impact is not treated as a like-for-like delta.",
      ],
    });
  }

  const delta = round1(
    curr.estimatedPortfolioImpactPercent - prev.estimatedPortfolioImpactPercent,
  );
  if (absDelta(delta) < THRESHOLDS.scenarioImpactPp) return null;
  const verb = delta > 0 ? "increased" : "decreased";
  return signal({
    category: "scenario_sensitivity",
    metric: "scenario_impact_percent",
    subject: curr.scenarioId,
    previousValue: prev.estimatedPortfolioImpactPercent,
    currentValue: curr.estimatedPortfolioImpactPercent,
    unit: "percentage_points",
    window,
    materiality: "material",
    headline: `Sensitivity to ${curr.scenarioName} ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.estimatedPortfolioImpactPercent)}% → ${formatPp(curr.estimatedPortfolioImpactPercent)}%).`,
    explanation: `Estimated impact under ${curr.scenarioName} was ${formatPp(prev.estimatedPortfolioImpactPercent)}% in ${previous.periodKey} and ${formatPp(curr.estimatedPortfolioImpactPercent)}% in ${current.periodKey}.`,
  });
}

function compareHoldingWeights(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
  window: ChangeSignalWindow,
  concentrationSubject: string | null,
): ChangeSignal[] {
  const signals: ChangeSignal[] = [];
  for (const curr of current.payload.holdings) {
    if (
      concentrationSubject &&
      curr.symbol.toUpperCase() === concentrationSubject.toUpperCase()
    ) {
      continue;
    }
    const prev = findHolding(previous.payload.holdings, curr.id, curr.symbol);
    if (!prev) continue;
    const delta = round1(curr.weightPercent - prev.weightPercent);
    if (absDelta(delta) < THRESHOLDS.holdingWeightPp) continue;
    const qtyChanged = quantityChanged(prev.quantity, curr.quantity);
    const limitations: string[] = [];
    if (qtyChanged) {
      limitations.push(
        "Position quantity also changed between snapshots, so this weight shift is not attributed to market-price movement alone.",
      );
    }
    const verb = delta > 0 ? "increased" : "decreased";
    signals.push(
      signal({
        category: "holding_weight",
        metric: "holding_weight_percent",
        subject: curr.symbol,
        previousValue: prev.weightPercent,
        currentValue: curr.weightPercent,
        unit: "percentage_points",
        window,
        materiality: "material",
        headline: `${curr.name} weight ${verb} by ${formatSignedPp(delta)} (${formatPp(prev.weightPercent)}% → ${formatPp(curr.weightPercent)}%).`,
        explanation: `Stored weight for ${curr.name} was ${formatPp(prev.weightPercent)}% in ${previous.periodKey} and ${formatPp(curr.weightPercent)}% in ${current.periodKey}.`,
        quantityChanged: qtyChanged,
        previousQuantity: prev.quantity,
        currentQuantity: curr.quantity,
        limitations,
      }),
    );
  }
  return signals;
}

function sortSignals(signals: ChangeSignal[]): ChangeSignal[] {
  const order = new Map(
    CHANGE_CATEGORY_ORDER.map((category, index) => [category, index]),
  );
  return [...signals].sort((left, right) => {
    const categoryDelta =
      (order.get(left.category) ?? 99) - (order.get(right.category) ?? 99);
    if (categoryDelta !== 0) return categoryDelta;
    return left.subject.localeCompare(right.subject);
  });
}

/**
 * Compare two stored intelligence snapshots.
 * Pass `previous: null` for first-snapshot / empty-history.
 */
export function compareIntelligenceStates(input: {
  previous: IntelligenceStateSnapshot | null | undefined;
  current: IntelligenceStateSnapshot | null | undefined;
}): ChangeIntelligenceResult {
  const { previous, current } = input;
  if (!previous || !current) {
    return {
      status: "insufficient_history",
      reason: INSUFFICIENT_HISTORY_REASON,
      signals: [],
      window: null,
    };
  }

  if (
    previous.payload.isDemo ||
    current.payload.isDemo ||
    previous.snapshotKind !== current.snapshotKind
  ) {
    return {
      status: "insufficient_history",
      reason:
        previous.snapshotKind !== current.snapshotKind
          ? "Change intelligence compares two snapshots of the same period kind."
          : INSUFFICIENT_HISTORY_REASON,
      signals: [],
      window: null,
    };
  }

  const window = windowFrom(previous, current);
  const concentration = compareConcentration(previous, current, window);
  const signals: ChangeSignal[] = [];
  if (concentration) signals.push(concentration);
  signals.push(...compareExposure(previous, current, window));
  signals.push(...compareExposureSubgroups(previous, current, window));
  const goal = compareGoal(previous, current, window);
  if (goal) signals.push(goal);
  const resilience = compareResilience(previous, current, window);
  if (resilience) signals.push(resilience);
  const scenario = compareScenarioSensitivity(previous, current, window);
  if (scenario) signals.push(scenario);
  signals.push(
    ...compareHoldingWeights(
      previous, current, window, concentration?.subject ?? null,
    ),
  );

  return {
    status: "ready",
    reason: null,
    signals: sortSignals(signals),
    window,
  };
}
