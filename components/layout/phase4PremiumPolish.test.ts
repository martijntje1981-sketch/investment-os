import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 4 premium polish contracts", () => {
  it("keeps Analysis on shared card and hero button tokens", () => {
    const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
    const allocation = read(
      "components/analysis/PortfolioAllocationSection.tsx",
    );
    expect(allocation).toContain("appDarkCardClass");
    expect(analysis).toContain("ExportPortfolioButton");
    expect(analysis).not.toContain("appHeroGhostButtonClass");
    expect(analysis).not.toContain("rounded-full border border-white/20");
    expect(analysis).not.toContain("bg-violet-50");
    expect(analysis).not.toContain('label="HHI"');
  });

  it("aligns Perspectives with PageHero", () => {
    const perspectives = read("components/perspectives/PerspectivesPage.tsx");
    expect(perspectives).toContain("PageHero");
    expect(perspectives).toContain("backToDashboard={Boolean(userSub)}");
    expect(perspectives).not.toContain("BackButton");
  });

  it("aligns Settings with shared card tokens", () => {
    const settings = read("app/settings/page.tsx");
    expect(settings).toContain("appCardClass");
    expect(settings).toContain("appSectionTitleClass");
    expect(settings).not.toContain("font-black");
  });

  it("moves News focus rings to brand and softens card radius", () => {
    const styles = read("components/news/newsCardStyles.ts");
    expect(styles).toContain("ring-brand");
    expect(styles).toContain("rounded-[20px]");
    expect(styles).not.toContain("outline-violet-600");
  });

  it("does not introduce new API clients for polish", () => {
    const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
    const faq = read("app/faq/page.tsx");
    expect(analysis).not.toMatch(/fetch\(/);
    expect(faq).not.toMatch(/fetch\(/);
  });
});
