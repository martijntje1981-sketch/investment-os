import { describe, expect, it } from "vitest";

import { resolveProductAccess } from "@/lib/services/productAccess";
import { resolveNavSnapshotDemoStatus } from "@/lib/services/goalPace/resolveNavSnapshotDemoStatus";

describe("resolveNavSnapshotDemoStatus", () => {
  it("treats personal Complete trial as capturable, never Demo", () => {
    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      daysRemaining: 11,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(trial.isCompleteTrial).toBe(true);
    expect(trial.isDemo).toBe(false);
    expect(resolveNavSnapshotDemoStatus(trial)).toEqual({
      outcome: "capture_personal",
    });
  });

  it("skips Demo showroom / example access", () => {
    const demo = resolveProductAccess({
      exampleKind: "active",
      trialKind: "demo",
      daysRemaining: 5,
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(demo.isDemo).toBe(true);
    expect(resolveNavSnapshotDemoStatus(demo)).toEqual({
      outcome: "skip_demo",
    });
  });

  it("does not guess when server product access is missing", () => {
    expect(resolveNavSnapshotDemoStatus(null)).toEqual({
      outcome: "unresolved",
    });
    expect(resolveNavSnapshotDemoStatus(undefined)).toEqual({
      outcome: "unresolved",
    });
    expect(resolveNavSnapshotDemoStatus({} as never)).toEqual({
      outcome: "unresolved",
    });
  });
});
