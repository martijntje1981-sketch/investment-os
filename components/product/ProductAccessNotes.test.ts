import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { resolveProductAccess } from "@/lib/services/productAccess";

describe("plan visibility labels", () => {
  it("shows Free, active trial, and Complete labels", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "components/product/ProductAccessNotes.tsx"),
      "utf8",
    );
    const free = resolveProductAccess({ exampleKind: "none" });
    const trial = resolveProductAccess({
      exampleKind: "active",
      trialKind: "personal",
      daysRemaining: 11,
      expiresAt: "2099-01-20T00:00:00.000Z",
      now: new Date("2099-01-09T00:00:00.000Z"),
    });
    const complete = resolveProductAccess({ exampleKind: "converted" });

    expect(free.tier).toBe("free");
    expect(trial.tier).toBe("trial");
    expect(trial.trialIndicatorLabel).toContain("11 days remaining");
    expect(complete.tier).toBe("complete");
    expect(source).toContain("formatPlanLabel");
    expect(source).toContain('"Complete"');
    expect(source).toContain('"Free"');
    expect(source).toContain('"Demo"');
  });

  it("falls back to Free after personal trial expiry and keeps Demo isolated", () => {
    const expired = resolveProductAccess({
      exampleKind: "expired",
      trialKind: "personal",
      expiresAt: "2099-01-01T00:00:00.000Z",
      daysRemaining: 0,
    });
    const demo = resolveProductAccess({
      exampleKind: "active",
      trialKind: "demo",
      daysRemaining: 7,
      expiresAt: "2099-01-10T00:00:00.000Z",
    });

    expect(expired.tier).toBe("free");
    expect(demo.isDemo).toBe(true);
  });
});
