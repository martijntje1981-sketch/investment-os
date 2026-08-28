import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildResilienceConclusion } from "@/lib/client/dashboardConclusions";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
  };
}

function goal(overrides: Partial<GoalSettings> = {}): GoalSettings {
  return {
    targetValue: overrides.targetValue ?? 200_000,
    targetYear: overrides.targetYear ?? 2035,
    monthlyContribution: overrides.monthlyContribution ?? 500,
    expectedAnnualReturn: overrides.expectedAnnualReturn ?? 7,
  };
}

const cardSource = readFileSync(
  path.resolve(
    process.cwd(),
    "components/dashboard/DashboardPortfolioResilienceCard.tsx",
  ),
  "utf8",
);
const dashboardSource = readFileSync(
  path.resolve(process.cwd(), "app/dashboard/page.tsx"),
  "utf8",
);
const conclusionsSource = readFileSync(
  path.resolve(process.cwd(), "lib/client/dashboardConclusions.ts"),
  "utf8",
);

describe("Dashboard Portfolio Resilience summary", () => {
  it("reuses live Resilience profile values without hardcoding scores", () => {
    expect(cardSource).toContain("buildResilienceProfile");
    expect(cardSource).toContain("buildResilienceConclusion");
    expect(conclusionsSource).toContain("profile.score");
    expect(conclusionsSource).toContain("mostSensitive.scenarioName");
    expect(cardSource).not.toContain("49 / 100");
    expect(cardSource).not.toContain("-14.0%");

    const profile = buildResilienceProfile({
      holdings: [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 50_000,
        }),
      ],
    });
    expect(profile.status).toBe("ok");
    expect(profile.score).not.toBeNull();
    expect(profile.mostSensitive?.scenarioId).toBeTruthy();

    const card = buildResilienceConclusion(profile);
    expect(card?.status).toContain(String(profile.score));
    expect(card?.conclusion.toLowerCase()).toContain("sensitivity");
  });

  it("keeps goal context off the resilience card when Goal has its own module", () => {
    expect(cardSource).not.toContain("profile.goalContext?.summary");

    const withGoal = buildResilienceProfile({
      holdings: [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 40_000,
        }),
        holding({
          symbol: "EUR",
          name: "Euro cash",
          assetType: "cash",
          quantity: 60_000,
          currentPrice: 1,
        }),
      ],
      goal: goal(),
      hasSavedGoal: true,
    });
    expect(withGoal.goalContext).not.toBeNull();
  });

  it("omits the module when resilience is unavailable", () => {
    expect(cardSource).toContain("if (!card) return null");

    const empty = buildResilienceProfile({ holdings: [] });
    expect(empty.status).toBe("insufficient_data");
    expect(buildResilienceConclusion(empty)).toBeNull();
  });

  it("deep-links to Analysis scenario stress via Four Questions outlook", () => {
    expect(DASHBOARD_DEEP_LINKS.scenarioStress).toBe("/analysis#scenario-stress");
    expect(conclusionsSource).toContain("DASHBOARD_DEEP_LINKS.scenarioStress");
    expect(conclusionsSource).toContain("Explore scenarios & resilience");

    const fourIdx = dashboardSource.indexOf("<DashboardPersonalIntelligence");
    const holdingsIdx = dashboardSource.indexOf("<HoldingsToday");
    expect(holdingsIdx).toBeGreaterThan(-1);
    expect(fourIdx).toBeGreaterThan(holdingsIdx);
    expect(dashboardSource).not.toContain("buildFourQuestions");
  });
});
