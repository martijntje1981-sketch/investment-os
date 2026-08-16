import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
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

describe("Dashboard Portfolio Resilience summary", () => {
  it("reuses live Resilience profile values without hardcoding scores", () => {
    expect(cardSource).toContain("buildResilienceProfile");
    expect(cardSource).toContain("profile.score");
    expect(cardSource).toContain("mostSensitive.scenarioName");
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
  });

  it("includes goal context only when Resilience provides it", () => {
    expect(cardSource).toContain("profile.goalContext?.summary");

    const withoutGoal = buildResilienceProfile({
      holdings: [
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          quantity: 1,
          currentPrice: 40_000,
        }),
      ],
      hasSavedGoal: false,
    });
    expect(withoutGoal.goalContext).toBeNull();

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
    expect(cardSource).toContain('profile.status === "insufficient_data"');
    expect(cardSource).toContain("return null");

    const empty = buildResilienceProfile({ holdings: [] });
    expect(empty.status).toBe("insufficient_data");
  });

  it("deep-links to Analysis scenario stress and sits after Personal Intelligence", () => {
    expect(DASHBOARD_DEEP_LINKS.scenarioStress).toBe("/analysis#scenario-stress");
    expect(cardSource).toContain("DASHBOARD_DEEP_LINKS.scenarioStress");
    expect(cardSource).toContain("Explore scenarios &amp; resilience");

    const piIdx = dashboardSource.indexOf("<PortfolioThirtySeconds");
    const resilienceIdx = dashboardSource.indexOf(
      "<DashboardPortfolioResilienceCard",
    );
    const holdingsIdx = dashboardSource.indexOf("<HoldingsToday");
    expect(piIdx).toBeGreaterThan(-1);
    expect(resilienceIdx).toBeGreaterThan(piIdx);
    expect(holdingsIdx).toBeGreaterThan(resilienceIdx);
  });
});
