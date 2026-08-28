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

  it("renders a dark navy value hero and a subordinate navy pulse panel", () => {
    expect(hero).toContain('data-testid="dashboard-portfolio-hero"');
    expect(hero).toContain('data-testid="hero-zone-primary"');
    expect(hero).toContain('data-testid="hero-zone-snapshot"');
    expect(hero).toContain("space-y-2 sm:space-y-3");
    expect(hero).toContain("appDashboardHeroShellClass");
    expect((hero.match(/appDashboardHeroShellClass/g) ?? []).length).toBe(2);
    expect(hero).toContain("appDashboardHeroSubordinateClass");
    expect(hero).toContain("className={shellClass}");
    expect(hero).toContain('appearance="onDark"');
  });

  it("keeps value/move/trend in panel 1 and pulse/focus/movers/briefing in panel 2", () => {
    const primaryIdx = hero.indexOf('data-testid="hero-zone-primary"');
    const snapshotIdx = hero.indexOf('data-testid="hero-zone-snapshot"');
    expect(primaryIdx).toBeGreaterThan(-1);
    expect(snapshotIdx).toBeGreaterThan(primaryIdx);

    const sparklineInPanel = hero.indexOf(
      "<HeroPerformanceSparkline",
      primaryIdx,
    );
    const pulseInPanel = hero.indexOf("<HeroPortfolioPulse", snapshotIdx);
    const moverInPanel = hero.indexOf('label="Biggest mover"', snapshotIdx);
    const briefingInPanel = hero.indexOf(
      "<DailyPortfolioBriefing",
      snapshotIdx,
    );

    expect(hero.indexOf("Portfolio value", primaryIdx)).toBeGreaterThan(
      primaryIdx,
    );
    expect(hero.indexOf("Latest move", primaryIdx)).toBeGreaterThan(primaryIdx);
    expect(sparklineInPanel).toBeGreaterThan(primaryIdx);
    expect(sparklineInPanel).toBeLessThan(snapshotIdx);
    expect(pulseInPanel).toBeGreaterThan(snapshotIdx);
    expect(moverInPanel).toBeGreaterThan(snapshotIdx);
    expect(briefingInPanel).toBeGreaterThan(snapshotIdx);
  });

  it("labels the pulse panel Portfolio Pulse without adding extra copy", () => {
    expect(pulse).toContain("Portfolio Pulse");
    expect(pulse).not.toContain("How is my portfolio doing");
  });
});
