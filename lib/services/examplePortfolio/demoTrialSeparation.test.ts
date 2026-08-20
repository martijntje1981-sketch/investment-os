/**
 * Focused tests: Demo Portfolio showroom vs clean personal Premium trial.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  demoAndPersonalStatesConflict,
  EXISTING_SEEDED_USER_MIGRATION_NOTES,
  resolveExampleTrialKind,
  resolveSeedHoldingsPreference,
} from "@/lib/services/examplePortfolio/demoTrialSeparation";
import { buildExampleHoldings } from "@/lib/services/examplePortfolio/templates";
import { PORTFOLIO_SETUP_COPY, PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";
import {
  buildTrialExperienceView,
  formatPremiumTrialIndicatorLabel,
} from "@/lib/client/trialExperience";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Explore Demo showroom", () => {
  it("still loads demo template holdings on Explore", () => {
    const explore = read("app/explore/page.tsx");
    expect(explore).toContain("Demo Portfolio");
    expect(explore).toContain("demo-portfolio-showroom");
    expect(explore).toContain("buildExampleHoldings");
    expect(explore).toContain("demo-holdings-preview");
    expect(explore).toContain("startExamplePortfolio");

    const holdings = buildExampleHoldings("global", "2026-08-01T00:00:00.000Z");
    expect(holdings.length).toBeGreaterThan(0);
    expect(holdings.every((row) => row.id.startsWith("example-"))).toBe(true);
  });

  it("points Demo CTA to personal signup/onboarding", () => {
    const explore = read("app/explore/page.tsx");
    expect(explore).toContain('"/signup?intent=trial"');
    expect(explore).toContain("Create your own portfolio");
    expect(explore).toContain("create-own-portfolio-cta");
    expect(explore).toContain("Start your 14-day trial");
    expect(explore).toContain("start-trial-cta");

    const steps = read("components/example/TrialStepsCard.tsx");
    expect(steps).toContain("/signup?intent=trial");
    expect(steps).toContain("Start your 14-day trial");
  });
});

describe("clean personal trial signup", () => {
  it("does not seed demo data for new trial signup", () => {
    const actions = read("app/auth/actions.ts");
    const activate = read("lib/services/examplePortfolio/activate.ts");
    const callback = read("app/auth/callback/route.ts");
    const separation = read(
      "lib/services/examplePortfolio/demoTrialSeparation.ts",
    );

    expect(actions).toContain('intent === "trial"');
    expect(actions).toContain("pending_personal_trial: true");
    expect(actions).toContain("buildPersonalTrialAuthCallbackUrl");
    expect(actions).toContain("reserveExampleEntitlement");
    expect(activate).toContain("resolveSeedHoldingsPreference");
    expect(activate).toContain("Clean personal trial: clock + metadata only");
    expect(callback).toContain("seedHoldings: wantsDemoPortfolio");
    expect(callback).toContain("wantsPersonalTrial");
    expect(callback).not.toContain(
      "also activate when a reserved entitlement exists",
    );
    expect(separation).toContain("pending_personal_trial");

    expect(
      resolveSeedHoldingsPreference({
        metadata: { pending_personal_trial: true },
      }),
    ).toBe(false);
    expect(
      resolveSeedHoldingsPreference({
        seedHoldings: true,
        metadata: { pending_personal_trial: true },
      }),
    ).toBe(true);
    expect(resolveSeedHoldingsPreference({ metadata: {} })).toBe(false);
    expect(
      resolveSeedHoldingsPreference({
        metadata: { example_trial_kind: "demo" },
      }),
    ).toBe(true);
    expect(
      resolveSeedHoldingsPreference({
        metadata: { pending_example_template: "global" },
      }),
    ).toBe(true);
    expect(
      resolveSeedHoldingsPreference({
        metadata: { example_trial_kind: "personal" },
      }),
    ).toBe(false);
    expect(resolveExampleTrialKind({ seedHoldings: false })).toBe("personal");
    expect(resolveExampleTrialKind({ seedHoldings: true })).toBe("demo");
  });

  it("routes new trial users to import/manual onboarding", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const onboarding = read(
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    );
    const empty = read("components/dashboard/DashboardEmptyState.tsx");

    expect(dashboard).toContain("DashboardEmptyState");
    expect(dashboard).toContain("needsPortfolioSetup");
    expect(empty).toContain("PortfolioSetupOnboarding");
    expect(onboarding).toContain("PORTFOLIO_SETUP_ROUTES.import");
    expect(onboarding).toContain("PORTFOLIO_SETUP_ROUTES.manualAdd");
    expect(PORTFOLIO_SETUP_COPY.importPrimary).toBe("Upload portfolio");
    expect(PORTFOLIO_SETUP_COPY.manualSecondary).toBe("Add manually");
    expect(PORTFOLIO_SETUP_ROUTES.import).toBe("/upload");
    expect(PORTFOLIO_SETUP_ROUTES.manualAdd).toBe("/portfolio?add=investment");
  });

  it("does not delete existing user data and documents later migration", () => {
    const activate = read("lib/services/examplePortfolio/activate.ts");
    const callout = read("components/example/DemoHoldingsCallout.tsx");

    expect(activate).not.toContain(".delete(");
    expect(activate).toContain(
      "Existing portfolio is not an example seed set.",
    );
    expect(callout).not.toContain("Start fresh");
    expect(EXISTING_SEEDED_USER_MIGRATION_NOTES.length).toBeGreaterThan(2);
    expect(EXISTING_SEEDED_USER_MIGRATION_NOTES.join(" ")).toMatch(
      /Do not auto-wipe/i,
    );
  });
});

describe("trial countdown, export, and isolation", () => {
  it("preserves trial countdown formatting", () => {
    const now = new Date("2026-08-04T12:00:00.000Z");
    const expiresAt = "2026-08-09T12:00:00.000Z";
    expect(formatPremiumTrialIndicatorLabel(expiresAt, now)).toBe(
      "Complete trial · 5 days remaining",
    );
    expect(
      formatPremiumTrialIndicatorLabel(expiresAt, now, {
        hasDemoHoldings: true,
      }),
    ).toBe("Demo Portfolio · 5 days remaining");
    const view = buildTrialExperienceView({
      kind: "active",
      expiresAt,
      daysRemaining: 5,
      hasDemoHoldings: false,
      now,
    });
    expect(view.showTrialMessaging).toBe(true);
    expect(view.showDemoHoldingsMessaging).toBe(false);
    expect(view.indicatorLabel).toContain("days remaining");
  });

  it("keeps Excel export wiring for portfolio history", () => {
    const exportSource = read("lib/client/portfolioHistoryExport.ts");
    const access = read("lib/auth/routeAccess.ts");
    const expired = read("app/example-expired/page.tsx");

    expect(exportSource).toMatch(/Portfolio History|xlsx|Blob/i);
    expect(access).toContain('"/portfolio-history"');
    expect(access).toContain("EXAMPLE_EXPIRED_ALLOWED_PREFIXES");
    expect(expired).toContain("Export Portfolio History");
  });

  it("prevents demo and personal states from appearing together", () => {
    expect(
      demoAndPersonalStatesConflict({
        hasDemoSeedHoldings: true,
        trialKind: "personal",
      }),
    ).toBe(true);
    expect(
      demoAndPersonalStatesConflict({
        hasDemoSeedHoldings: false,
        trialKind: "personal",
      }),
    ).toBe(false);
    expect(
      demoAndPersonalStatesConflict({
        hasDemoSeedHoldings: true,
        trialKind: "demo",
      }),
    ).toBe(false);

    const repair = read("lib/services/examplePortfolio/repairFalseExample.ts");
    expect(repair).toContain('example_trial_kind === "personal"');
    expect(repair).toContain("pending_personal_trial");
  });
});
