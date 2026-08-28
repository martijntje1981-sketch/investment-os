import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

describe("dashboard hero surface consistency", () => {
  const valueSource = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );
  const emptySource = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/DashboardEmptyState.tsx"),
    "utf8",
  );
  const onboardingSource = readFileSync(
    path.resolve(
      process.cwd(),
      "components/onboarding/PortfolioSetupOnboarding.tsx",
    ),
    "utf8",
  );
  const surfaceSource = readFileSync(
    path.resolve(process.cwd(), "components/layout/appSurface.ts"),
    "utf8",
  );
  const pageHeroSource = readFileSync(
    path.resolve(process.cwd(), "components/layout/PageHero.tsx"),
    "utf8",
  );

  it("uses a dark Dashboard hero shell while other page heroes stay light", () => {
    const heroShellMatch = surfaceSource.match(
      /export const appHeroShellClass =\s*"([^"]+)"/,
    );
    expect(heroShellMatch?.[1]).toContain("from-hero-premium-from");
    expect(heroShellMatch?.[1]).toContain("via-hero-premium-via");
    expect(heroShellMatch?.[1]).toContain("to-hero-premium-to");
    expect(heroShellMatch?.[1]).toContain("text-slate-950");
    expect(heroShellMatch?.[1]).toContain("bg-gradient-to-br");
    expect(heroShellMatch?.[1]).not.toContain("bg-navy-hero");
    expect(valueSource).toContain("appDashboardHeroShellClass");
    expect(valueSource).toContain("appDashboardHeroSubordinateClass");
    expect(valueSource).toContain('appearance="onDark"');
    expect(valueSource).not.toContain("ambientGlowClass");
    expect(emptySource).toContain("PortfolioSetupOnboarding");
    expect(onboardingSource).toContain("appHeroShellClass");
    expect(onboardingSource).not.toContain("bg-gradient-to-b");
  });

  it("matches the PageHero surface token", () => {
    expect(pageHeroSource).toContain("appHeroShellClass");
    expect(pageHeroSource).not.toContain("bg-gradient-to-b");
    expect(surfaceSource).toContain("from-brand-soft");
    expect(surfaceSource).toContain("bg-navy-hero");
    expect(surfaceSource).toContain("appDarkCardClass");
  });
});
