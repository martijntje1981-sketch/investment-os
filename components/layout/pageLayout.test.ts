import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const authenticatedPages = [
  "components/home/AuthenticatedHomePage.tsx",
  "app/dashboard/page.tsx",
  "app/portfolio/page.tsx",
  "app/news/page.tsx",
  "components/analysis/PortfolioAnalysisPage.tsx",
  "app/goals/page.tsx",
  "app/discover/page.tsx",
  "app/settings/page.tsx",
  "app/upload/page.tsx",
];

describe("authenticated page layout", () => {
  it("uses shared PageContainer and PageHero across main authenticated pages", () => {
    for (const relativePath of authenticatedPages) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).toContain("PageContainer");
      expect(source, relativePath).toContain("PageHero");
    }
  });

  it("standardizes width through PageContainer instead of page-level max-w-* wrappers", () => {
    const containerSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/PageContainer.tsx"),
      "utf8",
    );

    expect(containerSource).toContain("max-w-6xl");

    for (const relativePath of authenticatedPages) {
      const source = readFileSync(
        path.resolve(process.cwd(), relativePath),
        "utf8",
      );

      expect(source, relativePath).not.toMatch(/<main className="[^"]*max-w-/);
      expect(source, relativePath).not.toMatch(
        /mx-auto w-full min-w-0 max-w-(3xl|4xl|5xl|7xl)/,
      );
    }
  });

  it("uses a shared desktop hero min-height and aside layout in PageHero", () => {
    const heroSource = readFileSync(
      path.resolve(process.cwd(), "components/layout/PageHero.tsx"),
      "utf8",
    );

    expect(heroSource).toContain("lg:min-h-[168px]");
    expect(heroSource).toContain("lg:grid-cols-[minmax(0,1fr)_auto]");
    expect(heroSource).toContain("lg:col-start-1 lg:row-start-1");
  });
});
