import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  ANALYSIS_EXPLORE_DESTINATIONS,
  resolveAnalysisDetailId,
} from "@/lib/services/analysisGlance";
import {
  ANALYSIS_EXPLORE_ITEM_HREFS,
  ANALYSIS_EXPLORE_MOBILE_COMPACT_TITLES,
} from "@/components/analysis/glance/analysisExploreCatalog";
import { DASHBOARD_DEEP_LINKS, parseSectionHash } from "@/lib/navigation/deepLinks";
import { SCORECARD_PATH } from "@/lib/navigation/deepLinks";
import { ANALYSIS_PATH } from "@/lib/navigation/appRoutes";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Analysis final mobile polish", () => {
  const page = read("components/analysis/PortfolioAnalysisPage.tsx");
  const explore = read("components/analysis/glance/AnalysisExploreNav.tsx");
  const detail = read("components/analysis/glance/AnalysisDetailView.tsx");
  const surface = read("components/layout/appSurface.ts");
  const container = read("components/layout/PageContainer.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const glance = read("lib/services/analysisGlance/buildAnalysisGlance.ts");

  it("A/B. primary Analysis still stops after Explore with the three blocks", () => {
    const intro = page.indexOf("<AnalysisIntro");
    const stance = page.indexOf("<AnalysisStanceBlock");
    const attention = page.indexOf("<AnalysisAttentionBlock");
    const outlook = page.indexOf("<AnalysisOutlookBlock");
    const exploreIdx = page.indexOf("<AnalysisExploreNav");

    expect(intro).toBeGreaterThan(-1);
    expect(stance).toBeGreaterThan(intro);
    expect(attention).toBeGreaterThan(stance);
    expect(outlook).toBeGreaterThan(attention);
    expect(exploreIdx).toBeGreaterThan(outlook);
    expect(page).not.toContain('data-testid="analysis-depth"');
    expect(page).not.toContain("<PortfolioPerformanceSection");
  });

  it("C. mobile Explore initially exposes the compact six destinations", () => {
    expect([...ANALYSIS_EXPLORE_MOBILE_COMPACT_TITLES]).toEqual([
      "Allocation",
      "Performance",
      "Scenarios",
      "Goals",
      "What matters?",
      "Reports",
    ]);
    expect(explore).toContain("analysis-explore-compact");
    expect(explore).toContain("lg:hidden");
    expect(explore).toContain("Show all analysis tools");
    expect(explore).toContain("ANALYSIS_EXPLORE_MOBILE_COMPACT_TITLES");
    for (const title of ANALYSIS_EXPLORE_MOBILE_COMPACT_TITLES) {
      expect(explore).toContain(`title: "${title}"`);
    }
  });

  it("D/E. Show all exposes every existing destination and none are lost", () => {
    expect(explore).toContain("Show fewer");
    expect(explore).toContain("analysis-explore-full");
    expect(ANALYSIS_EXPLORE_ITEM_HREFS).toEqual(
      expect.arrayContaining(Object.values(ANALYSIS_EXPLORE_DESTINATIONS)),
    );
    expect(new Set(ANALYSIS_EXPLORE_ITEM_HREFS).size).toBe(
      ANALYSIS_EXPLORE_ITEM_HREFS.length,
    );
    expect(ANALYSIS_EXPLORE_ITEM_HREFS).toContain(
      ANALYSIS_EXPLORE_DESTINATIONS.scorecard,
    );
    expect(ANALYSIS_EXPLORE_ITEM_HREFS).toContain(
      ANALYSIS_EXPLORE_DESTINATIONS.methodology,
    );
    expect(ANALYSIS_EXPLORE_ITEM_HREFS).toContain(
      ANALYSIS_EXPLORE_DESTINATIONS.whatIf,
    );
  });

  it("F/G. direct hash navigation still opens detail and Back returns to Analysis", () => {
    expect(resolveAnalysisDetailId("portfolio-allocation")).toBe(
      "portfolio-allocation",
    );
    expect(resolveAnalysisDetailId("crypto-intelligence")).toBe(
      "crypto-intelligence",
    );
    expect(page).toContain("useAnalysisDetailId");
    expect(detail).toContain("Back to Analysis");
    expect(detail).toContain("window.scrollTo(0, 0)");
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "resolveAnalysisDetailId",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "window.scrollTo({ top: 0",
    );
    expect(detail).toContain(`href={ANALYSIS_PATH}`);
  });

  it("H. Scorecard is an Explore destination to /portfolio-health, not a standalone CTA", () => {
    expect(ANALYSIS_EXPLORE_DESTINATIONS.scorecard).toBe(SCORECARD_PATH);
    expect(SCORECARD_PATH).toBe("/portfolio-health");
    expect(explore).toContain("ANALYSIS_EXPLORE_DESTINATIONS.scorecard");
    expect(page).not.toContain("Portfolio Scorecard");
    expect(page).not.toContain("appHeroGhostButtonClass");
    expect(page).not.toContain("DASHBOARD_DEEP_LINKS.scorecard");
  });

  it("I/J. Export remains reachable as a quiet dark utility", () => {
    expect(page).toContain("ExportPortfolioButton");
    expect(page).toContain("runPortfolioExport");
    expect(page).toContain('variant="onDark"');
    expect(page).not.toContain('variant="hero"');
    expect(page).toContain("Download your portfolio data");
    expect(read("components/export/ExportPortfolioButton.tsx")).toContain(
      "appAnalysisUtilityButtonClass",
    );
  });

  it("K. existing Dashboard → Analysis hashes remain supported", () => {
    expect(DASHBOARD_DEEP_LINKS.portfolioAllocation).toBe(
      "/analysis#portfolio-allocation",
    );
    expect(
      resolveAnalysisDetailId(
        parseSectionHash(DASHBOARD_DEEP_LINKS.portfolioAllocation.slice(ANALYSIS_PATH.length)),
      ),
    ).toBe("portfolio-allocation");
    expect(resolveAnalysisDetailId("portfolio-exposure")).toBe(
      "portfolio-exposure",
    );
    expect(resolveAnalysisDetailId("scenario-stress")).toBe("scenario-stress");
    expect(resolveAnalysisDetailId("what-happened")).toBe(
      "portfolio-performance",
    );
  });

  it("L. Analysis data wiring and Dashboard stay unchanged", () => {
    expect(glance).toContain("buildPortfolioStance");
    expect(glance).toContain("selectRelevantPortfolioScenarios");
    expect(glance).toContain("resolvePortfolioValuationCoverage");
    expect(dashboard).toContain("DashboardSummary");
    expect(dashboard).toContain('canvas="dashboard"');
    expect(dashboard).not.toContain("AnalysisExploreNav");
    expect(container).toContain("appAnalysisPageCanvasClass");
    expect(surface).toContain("appAnalysisPageCanvasClass");
    expect(surface).toContain("pt-[calc(4rem+env(safe-area-inset-top,0px))]");
    expect(page).toContain('canvas="analysis"');
  });
});
