import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dashboard hero split panels", () => {
  const hero = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );
  const pulse = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/HeroPortfolioPulse.tsx"),
    "utf8",
  );
  const explore = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/DashboardSecondaryNav.tsx"),
    "utf8",
  );

  it("renders a single compact dark navy value hero", () => {
    expect(hero).toContain('data-testid="dashboard-portfolio-hero"');
    expect(hero).toContain('data-testid="hero-zone-primary"');
    expect(hero).not.toContain('data-testid="hero-zone-snapshot"');
    expect(hero).toContain("appDashboardHeroShellClass");
    expect(hero).not.toContain("appDashboardHeroSubordinateClass");
    expect(hero).toContain('appearance="onDark"');
  });

  it("keeps value/move/trend in the hero and pulse in Explore", () => {
    expect(hero).toContain("Portfolio value");
    expect(hero).toContain("Latest move");
    expect(hero).toContain("<HeroPerformanceSparkline");
    expect(hero).not.toContain("<HeroPortfolioPulse");
    expect(hero).not.toContain("<DailyPortfolioBriefing");
    expect(explore).toContain("DASHBOARD_DEEP_LINKS.scorecard");
  });

  it("labels the pulse module Portfolio Pulse without adding extra copy", () => {
    expect(pulse).toContain("Portfolio Pulse");
    expect(pulse).not.toContain("How is my portfolio doing");
  });
});
