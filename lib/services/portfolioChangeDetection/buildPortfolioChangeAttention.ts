/**
 * Canonical Phase 13 change-detection engine.
 * previous stored snapshot → live state → meaningful difference.
 * Daily contribution and holding-news matching reuse existing engines.
 */

import { buildIntelligenceStatePayload } from "@/lib/services/changeIntelligence/buildIntelligenceStateSnapshot";
import { compareIntelligenceStates } from "@/lib/services/changeIntelligence/compareIntelligenceStates";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import { buildHoldingIntelligenceCandidates } from "@/lib/services/holdingIntelligence/buildHoldingIntelligenceCandidates";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";
import {
  DAILY_COMPARISON_LIMITATION,
  INSUFFICIENT_CHANGE_HISTORY_COPY,
  NOTHING_IMPORTANT_CHANGED_COPY,
  NOTHING_MATERIAL_SUPPORT_COPY,
  PORTFOLIO_CHANGE_MAX_PRIMARY,
  PORTFOLIO_CHANGE_MAX_SECONDARY,
  STRUCTURAL_COMPARISON_LIMITATION,
  UNAVAILABLE_CHANGE_COPY,
} from "@/lib/services/portfolioChangeDetection/config";
import {
  mapHoldingCandidateSignal,
  mapStructuralChangeSignal,
} from "@/lib/services/portfolioChangeDetection/mapSignals";
import {
  dedupePortfolioChangeSignals,
  rankPortfolioChangeSignals,
} from "@/lib/services/portfolioChangeDetection/rankSignals";
import { selectLatestStoredSnapshot } from "@/lib/services/portfolioChangeDetection/selectPreviousSnapshot";
import type {
  PortfolioChangeAttention,
  PortfolioChangeSignal,
  PortfolioChangeWindow,
} from "@/lib/services/portfolioChangeDetection/types";

export type BuildPortfolioChangeAttentionInput = {
  holdings: StoredPortfolioHolding[] | null | undefined;
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
  snapshots?: IntelligenceStateSnapshot[] | null;
  newsItems?: NewsContentItem[] | null;
  now?: Date | string;
  isDemo?: boolean;
};

function toIso(now?: Date | string): string {
  if (!now) return new Date().toISOString();
  if (now instanceof Date) return now.toISOString();
  const parsed = new Date(now);
  return Number.isFinite(parsed.getTime())
    ? parsed.toISOString()
    : new Date().toISOString();
}

function wrapLiveSnapshot(input: {
  previous: IntelligenceStateSnapshot;
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  isDemo: boolean;
  capturedAt: string;
}): IntelligenceStateSnapshot | null {
  if (input.previous.payload.isDemo || input.isDemo) return null;
  const payload = buildIntelligenceStatePayload({
    holdings: input.holdings,
    goal: input.goal,
    hasSavedGoal: input.hasSavedGoal,
    isDemo: false,
    capturedAt: input.capturedAt,
  });
  if (payload.isDemo) return null;
  return {
    id: null,
    userId: input.previous.userId,
    portfolioId: input.previous.portfolioId,
    schemaVersion: payload.schemaVersion,
    capturedAt: input.capturedAt,
    snapshotKind: input.previous.snapshotKind,
    periodKey: "live",
    periodStart: input.previous.periodEnd,
    periodEnd: input.capturedAt.slice(0, 10),
    timezone: input.previous.timezone,
    payload,
  };
}

function formatSnapshotWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

function buildWindow(input: {
  previous: IntelligenceStateSnapshot | null;
  detectedAt: string;
  hasDaily: boolean;
}): PortfolioChangeWindow {
  if (input.previous) {
    const when = formatSnapshotWhen(input.previous.capturedAt);
    return {
      kind: "live_vs_snapshot",
      label: when
        ? `Compared with ${when} snapshot`
        : "Compared with latest stored snapshot",
      previousCapturedAt: input.previous.capturedAt,
      detectedAt: input.detectedAt,
      snapshotKind: input.previous.snapshotKind,
    };
  }
  if (input.hasDaily) {
    return {
      kind: "today",
      label: "Based on today’s market move",
      previousCapturedAt: null,
      detectedAt: input.detectedAt,
      snapshotKind: null,
    };
  }
  return {
    kind: "unavailable",
    label: "Not enough comparable history yet",
    previousCapturedAt: null,
    detectedAt: input.detectedAt,
    snapshotKind: null,
  };
}

function capSignals(ranked: PortfolioChangeSignal[]): {
  primary: PortfolioChangeSignal | null;
  secondary: PortfolioChangeSignal[];
} {
  const primary = ranked[0] ?? null;
  const secondary = ranked.slice(
    PORTFOLIO_CHANGE_MAX_PRIMARY,
    PORTFOLIO_CHANGE_MAX_PRIMARY + PORTFOLIO_CHANGE_MAX_SECONDARY,
  );
  return { primary, secondary };
}

export function buildPortfolioChangeAttention(
  input: BuildPortfolioChangeAttentionInput,
): PortfolioChangeAttention {
  const detectedAt = toIso(input.now);
  const holdings = input.holdings ?? [];
  const goal = input.goal ?? null;
  const hasSavedGoal = Boolean(input.hasSavedGoal && goal);
  const isDemo = Boolean(input.isDemo);

  if (holdings.length === 0) {
    return {
      status: "unavailable",
      headline: UNAVAILABLE_CHANGE_COPY,
      support: null,
      window: buildWindow({
        previous: null,
        detectedAt,
        hasDaily: false,
      }),
      primary: null,
      secondary: [],
      ranked: [],
      structuralHistoryAvailable: false,
      dailyDataAvailable: false,
      limitations: ["Add holdings before Tobailey can detect portfolio changes."],
    };
  }

  const daily = summarizeDailyPerformance(holdings);
  const previous = isDemo ? null : selectLatestStoredSnapshot(input.snapshots);
  const live =
    previous == null
      ? null
      : wrapLiveSnapshot({
          previous,
          holdings,
          goal,
          hasSavedGoal,
          isDemo,
          capturedAt: detectedAt,
        });

  const structural =
    previous && live
      ? compareIntelligenceStates({ previous, current: live })
      : null;

  const structuralSignals = (structural?.signals ?? [])
    .map((signal) => mapStructuralChangeSignal(signal, detectedAt))
    .filter((row): row is PortfolioChangeSignal => row != null);

  const candidates = buildHoldingIntelligenceCandidates({
    holdings,
    newsItems: input.newsItems,
  });
  const dailySignals = candidates
    .map((row) => mapHoldingCandidateSignal(row, detectedAt))
    .filter((row): row is PortfolioChangeSignal => row != null);

  const ranked = dedupePortfolioChangeSignals(
    rankPortfolioChangeSignals([...structuralSignals, ...dailySignals]),
  );
  const { primary, secondary } = capSignals(ranked);
  const window = buildWindow({
    previous,
    detectedAt,
    hasDaily: daily.hasDailyData,
  });

  const limitations: string[] = [];
  if (!previous) limitations.push(STRUCTURAL_COMPARISON_LIMITATION);
  if (daily.hasDailyData) limitations.push(DAILY_COMPARISON_LIMITATION);

  if (ranked.length > 0 && primary) {
    return {
      status: "attention",
      headline: primary.title,
      support: primary.whyItMatters,
      window,
      primary,
      secondary,
      ranked,
      structuralHistoryAvailable: Boolean(previous),
      dailyDataAvailable: daily.hasDailyData,
      limitations,
    };
  }

  if (!previous && !daily.hasDailyData) {
    return {
      status: "insufficient_history",
      headline: INSUFFICIENT_CHANGE_HISTORY_COPY,
      support:
        "Tobailey will compare this portfolio after a stored snapshot exists and prices are available.",
      window,
      primary: null,
      secondary: [],
      ranked: [],
      structuralHistoryAvailable: false,
      dailyDataAvailable: false,
      limitations,
    };
  }

  return {
    status: "nothing_material",
    headline: NOTHING_IMPORTANT_CHANGED_COPY,
    support: previous
      ? NOTHING_MATERIAL_SUPPORT_COPY
      : "Today’s moves are small. Structural comparison will appear after a stored snapshot exists.",
    window,
    primary: null,
    secondary: [],
    ranked: [],
    structuralHistoryAvailable: Boolean(previous),
    dailyDataAvailable: daily.hasDailyData,
    limitations,
  };
}
