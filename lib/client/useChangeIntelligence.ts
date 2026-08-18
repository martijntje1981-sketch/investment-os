"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  captureIntelligenceSnapshotsDashboardSafetyNet,
  captureIntelligenceSnapshotsFromReview,
} from "@/lib/client/captureIntelligenceSnapshots";
import {
  dashboardSafetyNetAttemptKey,
  resolveDashboardSafetyNetCapturePlan,
} from "@/lib/services/changeIntelligence/capturePolicy";
import { FIRST_HISTORY_COPY } from "@/lib/services/changeIntelligence/config";
import { summarizeStoredChangeIntelligence } from "@/lib/services/changeIntelligence/selectComparableSnapshots";
import type {
  ChangeIntelligenceSummary,
  IntelligenceSnapshotKind,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ChangeIntelligenceCaptureInput = {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  weeklyReady: boolean;
  monthlyReady: boolean;
  monthlyPeriodKind: string | null;
};

export type DashboardSafetyNetCaptureFields = {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
};

export type UseChangeIntelligenceResult = {
  summary: ChangeIntelligenceSummary;
  snapshots: IntelligenceStateSnapshot[];
  snapshotCount: number;
  loading: boolean;
  firstHistoryCopy: string | null;
};

const EMPTY_SUMMARY: ChangeIntelligenceSummary = summarizeStoredChangeIntelligence([]);

/**
 * Compact snapshot read for Change Intelligence.
 * Review capture is preferred. Dashboard may pass `dashboardCapture` as a
 * GET-first safety net for missing completed periods only.
 */
export function useChangeIntelligence(input: {
  enabled: boolean;
  isDemo: boolean;
  preferredKind?: IntelligenceSnapshotKind | null;
  capture?: ChangeIntelligenceCaptureInput | null;
  dashboardCapture?: DashboardSafetyNetCaptureFields | null;
}): UseChangeIntelligenceResult {
  const [snapshots, setSnapshots] = useState<IntelligenceStateSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [listReady, setListReady] = useState(false);
  const captureRef = useRef(input.capture);
  captureRef.current = input.capture;
  const dashboardCaptureRef = useRef(input.dashboardCapture);
  dashboardCaptureRef.current = input.dashboardCapture;
  const lastCaptureSignature = useRef<string>("");
  const lastDashboardAttemptKey = useRef<string>("");

  const captureSignature =
    input.enabled && !input.isDemo && input.capture
      ? `${input.capture.weeklyReady}|${input.capture.monthlyReady}|${input.capture.monthlyPeriodKind}`
      : "";

  const dashboardCaptureEnabled = Boolean(
    input.enabled && !input.isDemo && input.dashboardCapture,
  );

  const load = useCallback(async (): Promise<boolean> => {
    if (!input.enabled || input.isDemo) {
      setSnapshots([]);
      setListReady(false);
      return false;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/intelligence/snapshots?limit=24", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setSnapshots([]);
        setListReady(false);
        return false;
      }
      const payload = (await response.json()) as {
        snapshots?: IntelligenceStateSnapshot[];
      };
      setSnapshots(payload.snapshots ?? []);
      setListReady(true);
      return true;
    } catch {
      setSnapshots([]);
      setListReady(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [input.enabled, input.isDemo]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!input.enabled || input.isDemo) {
        setSnapshots([]);
        setListReady(false);
        return;
      }
      const capture = captureRef.current;
      if (capture && lastCaptureSignature.current !== captureSignature) {
        lastCaptureSignature.current = captureSignature;
        await captureIntelligenceSnapshotsFromReview({
          isDemo: input.isDemo,
          ...capture,
        });
      }
      if (!cancelled) await load();
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [captureSignature, input.enabled, input.isDemo, load]);

  useEffect(() => {
    if (!dashboardCaptureEnabled || !listReady) return;
    const fields = dashboardCaptureRef.current;
    if (!fields) return;

    const plan = resolveDashboardSafetyNetCapturePlan({
      isDemo: input.isDemo,
      holdings: fields.holdings,
      snapshotsLoaded: true,
      snapshots,
    });
    const attemptKey = dashboardSafetyNetAttemptKey(plan);
    if (!attemptKey || lastDashboardAttemptKey.current === attemptKey) {
      return;
    }
    lastDashboardAttemptKey.current = attemptKey;

    let cancelled = false;
    let finished = false;
    void (async () => {
      await captureIntelligenceSnapshotsDashboardSafetyNet({
        isDemo: input.isDemo,
        holdings: fields.holdings,
        goal: fields.goal,
        hasSavedGoal: fields.hasSavedGoal,
        snapshotsLoaded: true,
        snapshots,
      });
      finished = true;
      if (!cancelled) await load();
    })();
    return () => {
      cancelled = true;
      if (!finished && lastDashboardAttemptKey.current === attemptKey) {
        lastDashboardAttemptKey.current = "";
      }
    };
  }, [
    dashboardCaptureEnabled,
    input.isDemo,
    listReady,
    load,
    snapshots,
  ]);

  const summary = useMemo(
    () => summarizeStoredChangeIntelligence(snapshots, input.preferredKind),
    [input.preferredKind, snapshots],
  );

  const snapshotCount = input.preferredKind
    ? snapshots.filter((row) => row.snapshotKind === input.preferredKind).length
    : snapshots.length;

  const firstHistoryCopy =
    summary.status === "insufficient_history" && snapshotCount >= 1
      ? FIRST_HISTORY_COPY
      : null;

  return {
    summary: input.isDemo ? EMPTY_SUMMARY : summary,
    snapshots,
    snapshotCount,
    loading,
    firstHistoryCopy,
  };
}
