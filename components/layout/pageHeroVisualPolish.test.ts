import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Pre-launch light hero contrast and action alignment", () => {
  const surface = read("components/layout/appSurface.ts");
  const pageHero = read("components/layout/PageHero.tsx");
  const goals = read("app/goals/page.tsx");
  const analysis = read("components/analysis/PortfolioAnalysisPage.tsx");
  const history = read("components/portfolioHistory/PortfolioHistoryPage.tsx");
  const review = read("components/companion/CompanionReviewPage.tsx");
  const pdf = read("components/report/PeriodReportPdfAction.tsx");
  const discover = read("app/discover/page.tsx");
  const portfolio = read("app/portfolio/page.tsx");
  const news = read("app/news/page.tsx");

  it("keeps the approved light Q1 cyan hero and navy type tokens", () => {
    expect(surface).toMatch(
      /export const appHeroShellClass =\s*"[^"]*from-cyan-100[^"]*"/,
    );
    expect(surface).toContain("text-slate-950");
    expect(surface).toContain("appPageHeroMetricLabelClass");
    expect(surface).toContain("text-cyan-800");
    expect(surface).toContain("appPageHeroMetaClass");
    expect(surface).toContain("appPageHeroInsetClass");
    expect(surface).toContain("appPageHeroActionsClass");
    expect(surface).toContain("flex-wrap items-center");
    expect(surface).toContain("lg:justify-end");
    expect(surface).not.toMatch(
      /appPageHeroMetricLabelClass =\s*"[^"]*text-white/,
    );
  });

  it("keeps dark metric labels only for navy/conclusion surfaces", () => {
    expect(surface).toContain(
      "Quiet eyebrow labels on dark navy/conclusion surfaces only",
    );
    expect(surface).toMatch(
      /export const appHeroMetricLabelClass =\s*"[^"]*text-white\/90"/,
    );
  });

  it("does not leave legacy white copy in the Goals light hero", () => {
    expect(goals).toContain("<PageHero");
    expect(goals).toContain("appPageHeroMetaClass");
    expect(goals).toContain("appPageHeroMetricLabelClass");
    expect(goals).toContain("appPageHeroInsetClass");
    expect(goals).toContain("Estimated completion");
    expect(goals).toContain("Expected return");
    expect(goals).toContain("Your assumption");
    expect(goals).not.toMatch(/text-white\/90/);
    expect(goals).not.toMatch(/text-white\/65/);
    expect(goals).not.toMatch(/border-white\/15 bg-white\/10/);
    expect(goals).not.toContain("appHeroMetricLabelClass");
  });

  it("places PageHero actions in one shared wrap row without nested action stacks", () => {
    expect(pageHero).toContain("appPageHeroActionsClass");
    expect(pageHero).not.toContain("lg:max-w-md lg:justify-end");
    expect(analysis).toContain("<>");
    expect(analysis).not.toMatch(
      /actions=\{\s*<div className="flex flex-wrap gap-2">/,
    );
    expect(history).not.toMatch(
      /actions=\{\s*<div className="flex flex-wrap gap-2">/,
    );
    expect(portfolio).toContain("<>");
    expect(news).toContain("backToDashboard");
  });

  it("keeps hero action controls at a 44px tap target", () => {
    expect(surface).toContain("min-h-[44px]");
    expect(surface).toContain("appPageHeroActionsClass");
    expect(surface).toContain("min-h-11");
  });

  it("uses readable slate copy on Review PDF gating inside the light hero", () => {
    expect(pdf).toContain('variant === "hero"');
    expect(pdf).toContain("text-slate-700");
    expect(pdf).toContain("text-rose-700");
    expect(pdf).not.toMatch(/isHero[\s\S]{0,80}text-white"/);
    expect(review).toContain("flex min-w-0 flex-wrap items-center justify-end gap-2");
  });

  it("avoids faint slate-400 metadata in Discover hero stats", () => {
    expect(discover).toContain("appPageHeroMetaClass");
    expect(discover).not.toContain("text-sm text-slate-400");
  });
});
