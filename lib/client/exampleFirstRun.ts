/**
 * Per-user first-run markers for Example Portfolio preparation and cue.
 * Client-only; entitlement status remains the server source of truth.
 */

import { isValidUserSub } from "@/lib/client/portfolioStorageKeys";

export const EXAMPLE_PREP_TIMEOUT_MS = 25_000;

export type ExamplePrepStage =
  "holdings" | "prices" | "scores" | "insights" | "done";

export const EXAMPLE_PREP_STAGE_LABELS: Record<
  Exclude<ExamplePrepStage, "done">,
  string
> = {
  holdings: "Loading holdings",
  prices: "Updating prices",
  scores: "Calculating scores",
  insights: "Preparing insights",
};

function prepCompleteKey(userSub: string): string {
  return `tobailey-example-prep-complete:${userSub}`;
}

function firstRunCueKey(userSub: string): string {
  return `tobailey-example-first-run-cue-dismissed:${userSub}`;
}

export function isExamplePrepComplete(userSub: string | null): boolean {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(prepCompleteKey(userSub)) === "1";
  } catch {
    return false;
  }
}

export function markExamplePrepComplete(userSub: string): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(prepCompleteKey(userSub), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function shouldShowExampleFirstRunCue(userSub: string | null): boolean {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(firstRunCueKey(userSub)) !== "1";
  } catch {
    return false;
  }
}

export function dismissExampleFirstRunCue(userSub: string): void {
  if (!isValidUserSub(userSub) || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(firstRunCueKey(userSub), "1");
  } catch {
    /* ignore */
  }
}

/** Advance prep stages on a calm timeline (labels only — not fake %). */
export function resolveExamplePrepStage(
  elapsedMs: number,
  refreshDone: boolean,
): ExamplePrepStage {
  if (refreshDone && elapsedMs >= 2_400) return "done";
  if (elapsedMs < 700) return "holdings";
  if (elapsedMs < 1_600 || !refreshDone) return "prices";
  if (elapsedMs < 2_200) return "scores";
  return "insights";
}
