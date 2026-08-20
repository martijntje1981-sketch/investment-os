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

  it("uses the shared solid dark hero shell on other pages, and a light Dashboard hero", () => {
    const heroShellMatch = surfaceSource.match(
      /export const appHeroShellClass =\s*"([^"]+)"/,
    );
    expect(heroShellMatch?.[1]).toContain("bg-navy-hero");
    expect(heroShellMatch?.[1]).not.toContain("bg-gradient");
    expect(valueSource).toContain("appDashboardHeroShellClass");
    expect(valueSource.replaceAll("appDashboardHeroShellClass", "")).not.toContain(
      "appHeroShellClass",
    );
    expect(valueSource).not.toContain("ambientGlowClass");
    expect(emptySource).toContain("PortfolioSetupOnboarding");
    expect(onboardingSource).toContain("appHeroShellClass");
    expect(onboardingSource).not.toContain("bg-gradient-to-b");
  });

  it("matches the solid PageHero surface token", () => {
    expect(pageHeroSource).toContain("appHeroShellClass");
    expect(pageHeroSource).not.toContain("bg-gradient-to-b");
    expect(surfaceSource).toContain("bg-navy-hero");
    expect(surfaceSource).toContain("appDarkCardClass");
  });
});
