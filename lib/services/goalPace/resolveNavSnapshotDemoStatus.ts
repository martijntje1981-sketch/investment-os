/**
 * Server-side Demo isolation for Goal Pace NAV capture.
 * Never trust a browser-provided isDemo flag.
 */

import type { ProductAccess } from "@/lib/services/productAccess/types";

export type NavSnapshotDemoAccess = Pick<
  ProductAccess,
  "isDemo" | "isCompleteTrial" | "tier"
>;

export type NavSnapshotDemoResolution =
  | { outcome: "capture_personal" }
  | { outcome: "skip_demo" }
  | { outcome: "unresolved" };

/**
 * Resolve whether a NAV snapshot may be captured for this account.
 * Personal Complete trial is never Demo. Missing access is unresolved — do not guess.
 */
export function resolveNavSnapshotDemoStatus(
  access: NavSnapshotDemoAccess | null | undefined,
): NavSnapshotDemoResolution {
  if (!access) {
    return { outcome: "unresolved" };
  }

  if (access.isCompleteTrial === true) {
    return { outcome: "capture_personal" };
  }

  if (access.isDemo === true || access.tier === "demo") {
    return { outcome: "skip_demo" };
  }

  if (access.isDemo === false) {
    return { outcome: "capture_personal" };
  }

  if (
    access.tier === "free" ||
    access.tier === "trial" ||
    access.tier === "complete"
  ) {
    return { outcome: "capture_personal" };
  }

  return { outcome: "unresolved" };
}
