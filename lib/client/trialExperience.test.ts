import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildTrialExperienceView,
  formatPremiumTrialIndicatorLabel,
  isTrialFinal48Hours,
} from "@/lib/client/trialExperience";
import { getExampleDaysRemaining } from "@/lib/services/examplePortfolio/types";
import { canSafelyReplaceDemoPortfolio } from "@/lib/client/demoPortfolioSafety";
import { PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";
import { portfolioAddPath } from "@/lib/navigation/appRoutes";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("trial experience", () => {
  it("displays correct days remaining for an active trial", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const expiresAt = "2026-08-09T12:00:00.000Z";
    expect(getExampleDaysRemaining(expiresAt, now)).toBe(5);
    expect(formatPremiumTrialIndicatorLabel(expiresAt, now)).toBe(
      "Premium trial · 5 days remaining",
    );
    const view = buildTrialExperienceView({
      kind: "active",
      expiresAt,
      daysRemaining: 5,
      now,
    });
    expect(view.phase).toBe("active");
    expect(view.daysRemaining).toBe(5);
    expect(view.showTrialMessaging).toBe(true);
  });

  it("hides trial messaging for paid/converted subscribers", () => {
    const view = buildTrialExperienceView({
      kind: "converted",
      expiresAt: "2026-08-09T12:00:00.000Z",
      daysRemaining: 3,
    });
    expect(view.phase).toBe("paid");
    expect(view.indicatorLabel).toBeNull();
    expect(view.showTrialMessaging).toBe(false);
    expect(view.showDemoHoldingsMessaging).toBe(false);
  });

  it("marks the final 48-hour window without negative countdown", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const expiresAt = "2026-08-05T18:00:00.000Z";
    expect(isTrialFinal48Hours(expiresAt, now)).toBe(true);
    const view = buildTrialExperienceView({
      kind: "active",
      expiresAt,
      daysRemaining: 2,
      now,
    });
    expect(view.phase).toBe("final_48h");
    expect(view.isFinal48Hours).toBe(true);
    expect(view.daysRemaining).toBeGreaterThanOrEqual(0);
  });

  it("expired trial never shows a negative countdown", () => {
    const now = new Date("2026-08-10T12:00:00.000Z");
    const expiresAt = "2026-08-09T12:00:00.000Z";
    expect(getExampleDaysRemaining(expiresAt, now)).toBe(0);
    const view = buildTrialExperienceView({
      kind: "expired",
      expiresAt,
      daysRemaining: -3,
      now,
    });
    expect(view.daysRemaining).toBe(0);
    expect(view.indicatorLabel).toContain("ended");
    expect(view.indicatorLabel).not.toMatch(/-/);
  });
});

describe("demo holdings clarity and start fresh safety", () => {
  it("shows clear sample-data messaging and correct routes", () => {
    const callout = read("components/example/DemoHoldingsCallout.tsx");
    expect(callout).toContain("You are viewing demo holdings.");
    expect(callout).toContain("demo-import-action");
    expect(callout).toContain("demo-manual-add-action");
    expect(callout).toContain("PORTFOLIO_SETUP_ROUTES.import");
    expect(callout).toContain("portfolioAddPath");
    expect(PORTFOLIO_SETUP_ROUTES.import).toBe("/upload");
    expect(portfolioAddPath("investment")).toBe("/portfolio?add=investment");
    expect(callout).toContain("demo-start-fresh-dialog");
    expect(callout).toContain("Replace the demo portfolio?");
  });

  it("blocks unsafe demo deletion and preserves genuine data by design", () => {
    const result = canSafelyReplaceDemoPortfolio({
      holdings: [
        { id: "example-global-vwce" },
        { id: "user-created-uuid" },
      ],
      exampleSeeded: true,
    });
    expect(result.safe).toBe(false);
    if (!result.safe) {
      expect(result.reason).toMatch(/cannot be distinguished/i);
      expect(result.schemaNote).toMatch(/holdings\.origin/);
    }
  });

  it("requires confirmation before attempting Start fresh", () => {
    const callout = read("components/example/DemoHoldingsCallout.tsx");
    expect(callout).toContain("setConfirmOpen(true)");
    expect(callout).toContain("demo-replace-confirm");
    expect(callout).toContain("canSafelyReplaceDemoPortfolio");
  });
});

describe("expired trial export exception", () => {
  it("allows portfolio-history while keeping other Premium paths blocked", () => {
    const access = read("lib/auth/routeAccess.ts");
    expect(access).toContain('"/portfolio-history"');
    expect(access).toContain("EXAMPLE_EXPIRED_ALLOWED_PREFIXES");
    const expired = read("app/example-expired/page.tsx");
    expect(expired).toContain("Your Premium trial has ended");
    expect(expired).toContain("Export Portfolio History");
    expect(expired).toContain("PORTFOLIO_HISTORY_PATH");
    expect(expired).not.toContain('href="/analysis"');
    expect(expired).not.toContain('href="/portfolio-health"');
  });
});
