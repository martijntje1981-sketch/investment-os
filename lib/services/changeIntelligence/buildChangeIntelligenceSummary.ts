/**
 * Presentation/orchestration layer above compareIntelligenceStates().
 * Groups and ranks raw ChangeSignals into one ChangeIntelligenceSummary.
 * Does not change comparison math. Does not invent causality.
 */

import {
  CHANGE_INTELLIGENCE_COMPLETE_TEASE,
  INSUFFICIENT_HISTORY_REASON,
} from "@/lib/services/changeIntelligence/config";
import { compareIntelligenceStates } from "@/lib/services/changeIntelligence/compareIntelligenceStates";
import { calendarDateInTimeZone } from "@/lib/services/changeIntelligence/periodKeys";
import type {
  ChangeCategory,
  ChangeIntelligenceConfidence,
  ChangeIntelligenceStory,
  ChangeIntelligenceSummary,
  ChangeSignal,
  ChangeSignalWindow,
  IntelligenceHoldingState,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
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

function periodAdjective(kind: ChangeSignalWindow["snapshotKind"]): string {
  return kind === "monthly" ? "month" : "week";
}

function sincePhrase(window: ChangeSignalWindow): string {
  return window.snapshotKind === "monthly"
    ? "since your previous monthly snapshot"
    : "since your previous weekly snapshot";
}

function capturedAfterPeriodEnd(snapshot: IntelligenceStateSnapshot): boolean {
  const captured = calendarDateInTimeZone(new Date(snapshot.capturedAt), snapshot.timezone);
  const [year, month, day] = snapshot.periodEnd.split("-").map(Number);
  if (!year || !month || !day) return true;
  if (captured.year !== year) return captured.year > year;
  if (captured.month !== month) return captured.month > month;
  return captured.day > day;
}

function findHolding(
  holdings: IntelligenceHoldingState[],
  subject: string,
): IntelligenceHoldingState | null {
  const needle = subject.trim().toUpperCase();
  return (
    holdings.find((row) => row.symbol.trim().toUpperCase() === needle) ??
    holdings.find((row) => row.name.trim().toUpperCase() === needle) ??
    null
  );
}

function absDelta(signal: ChangeSignal): number {
  return signal.delta == null ? 0 : Math.abs(signal.delta);
}

function categoryRank(category: ChangeCategory): number {
  switch (category) {
    case "concentration":
      return 0;
    case "holding_weight":
      return 1;
    case "exposure":
      return 2;
    case "scenario_sensitivity":
      return 3;
    case "resilience":
      return 4;
    case "goal_progress":
      return 5;
    default:
      return 99;
  }
}

function sortSignals(signals: ChangeSignal[]): ChangeSignal[] {
  return [...signals].sort((left, right) => {
    const rank = categoryRank(left.category) - categoryRank(right.category);
    if (rank !== 0) return rank;
    const delta = absDelta(right) - absDelta(left);
    if (delta !== 0) return delta;
    return left.subject.localeCompare(right.subject);
  });
}

function namesOverlap(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if ((a === "btc" || a.includes("bitcoin")) && (b === "btc" || b.includes("bitcoin"))) {
    return true;
  }
  return false;
}

function exposureRelatesToHolding(
  exposure: ChangeSignal,
  holding: ChangeSignal,
  current: IntelligenceStateSnapshot,
): boolean {
  const row = findHolding(current.payload.holdings, holding.subject);
  if (row?.assetType === "crypto" && exposure.subject === "crypto") return true;
  if (row?.assetType === "cash" && exposure.subject === "cash") return true;
  if (
    row &&
    exposure.currentValue != null &&
    Math.abs(exposure.currentValue - row.weightPercent) <= 2
  ) {
    return true;
  }
  return false;
}

function scenarioRelatesToSubject(scenario: ChangeSignal, subject: string): boolean {
  const haystack = `${scenario.subject} ${scenario.headline} ${scenario.explanation}`.toLowerCase();
  if (namesOverlap(haystack, subject)) return true;
  return false;
}

function resilienceRelatesToConcentration(
  current: IntelligenceStateSnapshot,
  hasConcentration: boolean,
): boolean {
  if (!hasConcentration) return false;
  return current.payload.resilience?.primaryDriver === "concentration";
}

function valueArrow(signal: ChangeSignal): string | null {
  if (signal.previousValue == null || signal.currentValue == null) return null;
  if (signal.unit === "score_points") {
    return `${formatPp(signal.previousValue)} → ${formatPp(signal.currentValue)}`;
  }
  return `${formatPp(signal.previousValue)}% → ${formatPp(signal.currentValue)}%`;
}

function holdingDisplayName(signal: ChangeSignal): string {
  const match = signal.headline.match(/^(.+?) concentration /i);
  if (match?.[1]) return match[1];
  return signal.subject;
}

function completeHeadline(signal: ChangeSignal, window: ChangeSignalWindow): string {
  const since = sincePhrase(window);
  if (signal.category === "concentration" && signal.materiality === "material") {
    if (/changed from/i.test(signal.headline)) {
      return `${signal.headline.replace(/\.$/, "")} ${since}.`;
    }
    if (signal.previousValue != null && signal.currentValue != null) {
      const verb = (signal.delta ?? 0) >= 0 ? "increased" : "decreased";
      return `${holdingDisplayName(signal)} concentration ${verb} from ${formatPp(signal.previousValue)}% to ${formatPp(signal.currentValue)}% ${since}.`;
    }
  }
  if (
    signal.category === "goal_progress" &&
    signal.materiality === "material" &&
    signal.previousValue != null &&
    signal.currentValue != null
  ) {
    const verb = (signal.delta ?? 0) >= 0 ? "improved" : "declined";
    return `Goal progress ${verb} from ${formatPp(signal.previousValue)}% to ${formatPp(signal.currentValue)}%.`;
  }
  if (
    signal.category === "resilience" &&
    signal.previousValue != null &&
    signal.currentValue != null
  ) {
    const verb = (signal.delta ?? 0) >= 0 ? "improved" : "declined";
    return `Your resilience score ${verb} from ${formatPp(signal.previousValue)} to ${formatPp(signal.currentValue)}.`;
  }
  if (
    signal.category === "scenario_sensitivity" &&
    signal.materiality === "material"
  ) {
    const name = signal.headline.match(/Sensitivity to (.+) (?:increased|decreased)/i)?.[1];
    if (name && (signal.delta ?? 0) > 0) {
      return `Your portfolio is now more sensitive to ${name}.`;
    }
    if (name && (signal.delta ?? 0) < 0) {
      return `Your modeled ${name} sensitivity decreased ${since}.`;
    }
  }
  if (
    signal.category === "exposure" &&
    signal.previousValue != null &&
    signal.currentValue != null
  ) {
    const verb = (signal.delta ?? 0) >= 0 ? "increased" : "decreased";
    const label = signal.headline.split(" exposure")[0] ?? signal.subject;
    return `${label} exposure ${verb} by ${formatSignedPp(signal.delta ?? 0)} ${since}.`;
  }
  return signal.headline;
}

function freeHeadlineFor(
  signal: ChangeSignal,
  window: ChangeSignalWindow,
): string {
  const period = periodAdjective(window.snapshotKind);
  if (signal.category === "concentration") {
    if (/changed from/i.test(signal.headline)) {
      return `Your largest holding changed this ${period}.`;
    }
    if ((signal.delta ?? 0) > 0) {
      return `Your portfolio became more concentrated this ${period}.`;
    }
    if ((signal.delta ?? 0) < 0) {
      return `Your portfolio became less concentrated this ${period}.`;
    }
  }
  if (signal.category === "exposure") {
    const label = signal.headline.split(" exposure")[0] ?? "Portfolio";
    return `Your ${label.toLowerCase()} exposure changed this ${period}.`;
  }
  if (signal.category === "goal_progress") {
    if (signal.materiality === "definition_changed") {
      return `Your saved goal definition changed this ${period}.`;
    }
    return (signal.delta ?? 0) >= 0
      ? `Goal progress improved this ${period}.`
      : `Goal progress declined this ${period}.`;
  }
  if (signal.category === "resilience") {
    return (signal.delta ?? 0) >= 0
      ? `Your portfolio looks more resilient this ${period}.`
      : `Your portfolio looks less resilient this ${period}.`;
  }
  if (signal.category === "scenario_sensitivity") {
    return `Your portfolio's modeled sensitivity changed this ${period}.`;
  }
  return `Your portfolio composition changed this ${period}.`;
}

function meaningFor(signal: ChangeSignal): string {
  if (signal.category === "concentration") {
    if (/changed from/i.test(signal.headline)) {
      return "The largest position in the stored snapshots is now a different holding.";
    }
    if ((signal.delta ?? 0) > 0) {
      return "A larger share of portfolio outcomes now depends on this exposure.";
    }
    return "A smaller share of portfolio outcomes now depends on this exposure.";
  }
  if (signal.category === "exposure") {
    const label = signal.headline.split(" exposure")[0] ?? "This group";
    if ((signal.delta ?? 0) > 0) {
      return `${label} now represents a larger share of the portfolio.`;
    }
    return `${label} now represents a smaller share of the portfolio.`;
  }
  if (signal.category === "goal_progress") {
    if (signal.materiality === "definition_changed") {
      return "The saved goal itself changed, so the progress figures are not compared as an investment result.";
    }
    if ((signal.delta ?? 0) >= 0) {
      return "Progress against the same saved target is higher in the later snapshot.";
    }
    return "Progress against the same saved target is lower in the later snapshot.";
  }
  if (signal.category === "resilience") {
    return (signal.delta ?? 0) >= 0
      ? "The portfolio is now modeled as more resilient."
      : "The portfolio is now modeled as less resilient.";
  }
  if (signal.category === "scenario_sensitivity") {
    if (signal.materiality === "definition_changed") {
      return "The most-sensitive supported scenario is different in the later snapshot, so impact is not compared like-for-like.";
    }
    return (signal.delta ?? 0) > 0
      ? "The portfolio is now modeled as more sensitive to this scenario."
      : "The portfolio is now modeled as less sensitive to this scenario.";
  }
  return signal.explanation;
}

function relatedLine(signal: ChangeSignal): string {
  if (signal.category === "exposure" && signal.delta != null) {
    const label = signal.headline.split(" exposure")[0] ?? "This";
    const verb = signal.delta > 0 ? "increased" : "decreased";
    return `${label} exposure also ${verb} by ${formatSignedPp(signal.delta)}.`;
  }
  if (
    signal.category === "resilience" &&
    signal.previousValue != null &&
    signal.currentValue != null
  ) {
    return `At the same time, resilience moved from ${formatPp(signal.previousValue)} to ${formatPp(signal.currentValue)}.`;
  }
  if (signal.category === "scenario_sensitivity") {
    if (signal.materiality === "definition_changed") {
      return "This coincided with a different most-sensitive modeled scenario.";
    }
    const name = signal.headline.match(/Sensitivity to (.+) (?:increased|decreased)/i)?.[1];
    if (name && (signal.delta ?? 0) > 0) {
      return `This coincided with higher modeled ${name} sensitivity.`;
    }
    if (name) {
      return `This coincided with a change in modeled ${name} sensitivity.`;
    }
    return "This coincided with a change in modeled scenario sensitivity.";
  }
  if (signal.category === "holding_weight" && signal.delta != null) {
    return `${signal.headline.replace(/\.$/, "")}.`;
  }
  return signal.headline;
}

function evidenceFor(signal: ChangeSignal, related: ChangeSignal[]): string[] {
  const bullets: string[] = [];
  const arrow = valueArrow(signal);
  if (arrow) {
    const unit = signal.unit === "score_points" ? "" : "";
    bullets.push(
      `${signal.metric.replace(/_/g, " ")}: ${arrow}${unit}${
        signal.delta != null
          ? ` (${signal.delta > 0 ? "+" : ""}${formatPp(signal.delta)}${
              signal.unit === "percentage_points" ? "pp" : ""
            })`
          : ""
      }`,
    );
  }
  if (signal.quantityChanged) {
    bullets.push(
      `Stored quantity: ${signal.previousQuantity ?? "—"} → ${signal.currentQuantity ?? "—"}`,
    );
  }
  for (const extra of related) {
    const extraArrow = valueArrow(extra);
    if (extraArrow) {
      bullets.push(`${extra.metric.replace(/_/g, " ")}: ${extraArrow}`);
    }
  }
  return bullets;
}

function whyAvailable(window: ChangeSignalWindow): string {
  const kind = window.snapshotKind === "monthly" ? "monthly" : "weekly";
  return `Based on two stored ${kind} intelligence snapshots (${window.previousPeriodKey} captured ${window.previousCapturedAt.slice(0, 10)}, ${window.currentPeriodKey} captured ${window.currentCapturedAt.slice(0, 10)}).`;
}

function afterPeriodLimitation(
  previous: IntelligenceStateSnapshot,
  current: IntelligenceStateSnapshot,
): string | null {
  if (capturedAfterPeriodEnd(previous) || capturedAfterPeriodEnd(current)) {
    return "Snapshot captured after the labelled period ended. It is not a reconstructed closing portfolio.";
  }
  return null;
}

function buildStory(input: {
  role: ChangeIntelligenceStory["role"];
  signal: ChangeSignal;
  related: ChangeSignal[];
  window: ChangeSignalWindow;
  previous: IntelligenceStateSnapshot;
  current: IntelligenceStateSnapshot;
}): ChangeIntelligenceStory {
  const { signal, related, window, previous, current } = input;
  const limitations = [...signal.limitations];
  for (const extra of related) {
    for (const note of extra.limitations) {
      if (!limitations.includes(note)) limitations.push(note);
    }
  }
  const afterPeriod = afterPeriodLimitation(previous, current);
  if (afterPeriod && !limitations.includes(afterPeriod)) {
    limitations.push(afterPeriod);
  }

  const supporting =
    signal.previousValue != null && signal.currentValue != null
      ? `${formatPp(signal.previousValue)}${signal.unit === "score_points" ? "" : "%"} → ${formatPp(signal.currentValue)}${signal.unit === "score_points" ? "" : "%"} (${signal.delta != null && signal.delta > 0 ? "+" : ""}${signal.delta != null ? formatPp(signal.delta) : "—"}${signal.unit === "percentage_points" ? "pp" : ""})`
      : null;

  return {
    id: signal.id,
    role: input.role,
    category: signal.category,
    headline: completeHeadline(signal, window),
    freeHeadline: freeHeadlineFor(signal, window),
    supportingLine: supporting,
    relatedLines: related.map(relatedLine),
    meaning: meaningFor(signal),
    evidence: evidenceFor(signal, related),
    whyAvailable: whyAvailable(window),
    limitations,
    quantityChanged: signal.quantityChanged || related.some((row) => row.quantityChanged),
    goalDefinitionChanged: signal.materiality === "definition_changed" && signal.category === "goal_progress",
    capturedAfterPeriodEnd:
      capturedAfterPeriodEnd(previous) || capturedAfterPeriodEnd(current),
    signal,
    relatedSignals: related,
  };
}

function confidenceFrom(
  stories: ChangeIntelligenceStory[],
  window: ChangeSignalWindow | null,
): ChangeIntelligenceConfidence {
  const notes: string[] = [];
  let level: ChangeIntelligenceConfidence["level"] = "high";
  if (window) {
    notes.push(whyAvailable(window));
  }
  for (const story of stories) {
    if (story.quantityChanged) {
      notes.push(
        "Position quantity also changed between snapshots, so weight shifts are not attributed to market-price movement alone.",
      );
      if (level === "high") level = "moderate";
    }
    if (story.goalDefinitionChanged) {
      notes.push("Saved goal definition changed, so progress is not compared as an investment result.");
    }
    if (story.capturedAfterPeriodEnd) {
      notes.push(
        "Snapshot captured after the labelled period ended. It is not a reconstructed closing portfolio.",
      );
      if (level === "high") level = "moderate";
    }
    for (const limitation of story.limitations) {
      if (!notes.includes(limitation)) notes.push(limitation);
    }
    if (story.signal.confidence === "limited") level = "limited";
    if (story.signal.confidence === "moderate" && level === "high") {
      level = "moderate";
    }
  }
  const unique = [...new Set(notes)];
  return { level, notes: unique };
}

function insufficientSummary(reason: string | null): ChangeIntelligenceSummary {
  return {
    status: "insufficient_history",
    reason: reason ?? INSUFFICIENT_HISTORY_REASON,
    primaryStory: null,
    supportingStories: [],
    goalChange: null,
    resilienceChange: null,
    confidence: { level: "limited", notes: [reason ?? INSUFFICIENT_HISTORY_REASON] },
    comparisonWindow: null,
    freeHeadline: null,
    completeTease: null,
    noMaterialChange: false,
  };
}

/**
 * Turn two stored snapshots into a surface-agnostic Change Intelligence summary.
 */
export function buildChangeIntelligenceSummary(input: {
  previous: IntelligenceStateSnapshot | null | undefined;
  current: IntelligenceStateSnapshot | null | undefined;
}): ChangeIntelligenceSummary {
  const compared = compareIntelligenceStates({
    previous: input.previous,
    current: input.current,
  });
  if (compared.status !== "ready" || !compared.window || !input.previous || !input.current) {
    return insufficientSummary(compared.reason);
  }

  const window = compared.window;
  const previous = input.previous;
  const current = input.current;
  const material = compared.signals.filter(
    (row) => row.materiality === "material" || row.materiality === "definition_changed",
  );
  const goalSignal =
    material.find((row) => row.category === "goal_progress") ?? null;
  const resilienceSignal =
    material.find((row) => row.category === "resilience") ?? null;
  const scenarioSignal =
    material.find((row) => row.category === "scenario_sensitivity") ?? null;
  const structural = sortSignals(
    material.filter(
      (row) =>
        row.category === "concentration" ||
        row.category === "exposure" ||
        row.category === "holding_weight",
    ),
  );

  const used = new Set<string>();
  let primaryStory: ChangeIntelligenceStory | null = null;
  const supportingStories: ChangeIntelligenceStory[] = [];

  if (structural[0]) {
    const lead = structural[0];
    used.add(lead.id);
    const related: ChangeSignal[] = [];
    for (const candidate of material) {
      if (candidate.id === lead.id) continue;
      if (candidate.category === "goal_progress") continue;
      let relates = false;
      if (candidate.category === "exposure") {
        relates = exposureRelatesToHolding(candidate, lead, current);
      } else if (candidate.category === "holding_weight") {
        relates = namesOverlap(candidate.subject, lead.subject);
      } else if (candidate.category === "scenario_sensitivity") {
        relates = scenarioRelatesToSubject(candidate, lead.subject);
      } else if (candidate.category === "resilience") {
        relates = resilienceRelatesToConcentration(current, lead.category === "concentration")
          || (scenarioSignal != null && scenarioRelatesToSubject(scenarioSignal, lead.subject));
      }
      if (relates) {
        related.push(candidate);
        used.add(candidate.id);
      }
    }
    related.sort(
      (left, right) =>
        categoryRank(left.category) - categoryRank(right.category) ||
        left.subject.localeCompare(right.subject),
    );
    primaryStory = buildStory({
      role: "primary",
      signal: lead,
      related,
      window,
      previous,
      current,
    });
  }

  for (const signal of structural) {
    if (used.has(signal.id)) continue;
    used.add(signal.id);
    supportingStories.push(
      buildStory({
        role: "supporting",
        signal,
        related: [],
        window,
        previous,
        current,
      }),
    );
  }

  const goalChange = goalSignal
    ? buildStory({
        role: "goal",
        signal: goalSignal,
        related: [],
        window,
        previous,
        current,
      })
    : null;

  const resilienceLead = scenarioSignal ?? resilienceSignal;
  const resilienceRelated =
    scenarioSignal && resilienceSignal && scenarioSignal.id !== resilienceSignal.id
      ? [resilienceSignal]
      : [];
  const resilienceChange = resilienceLead
    ? buildStory({
        role: "resilience",
        signal: resilienceLead,
        related: resilienceRelated.filter((row) => row.id !== resilienceLead.id),
        window,
        previous,
        current,
      })
    : null;

  const stories = [
    primaryStory,
    ...supportingStories,
    goalChange,
    resilienceChange,
  ].filter((row): row is ChangeIntelligenceStory => row != null);

  const noMaterialChange =
    primaryStory == null &&
    supportingStories.length === 0 &&
    resilienceChange == null &&
    (goalChange == null || goalChange.goalDefinitionChanged);

  const freeHeadline =
    primaryStory?.freeHeadline ??
    (goalChange && !goalChange.goalDefinitionChanged
      ? goalChange.freeHeadline
      : null) ??
    resilienceChange?.freeHeadline ??
    null;

  return {
    status: "ready",
    reason: null,
    primaryStory,
    supportingStories,
    goalChange,
    resilienceChange,
    confidence: confidenceFrom(stories, window),
    comparisonWindow: window,
    freeHeadline,
    completeTease: freeHeadline ? CHANGE_INTELLIGENCE_COMPLETE_TEASE : null,
    noMaterialChange,
  };
}
