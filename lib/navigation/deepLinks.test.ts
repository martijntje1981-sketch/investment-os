import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  DASHBOARD_DEEP_LINKS,
  parseSectionHash,
  SECTION_IDS,
} from "@/lib/navigation/deepLinks";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard deep links", () => {
  it("exposes stable Analysis and Goals section anchors", () => {
    expect(DASHBOARD_DEEP_LINKS.cashIntelligence).toBe(
      "/analysis#cash-intelligence",
    );
    expect(DASHBOARD_DEEP_LINKS.dividendIntelligence).toBe(
      "/analysis#dividend-intelligence",
    );
    expect(DASHBOARD_DEEP_LINKS.portfolioAllocation).toBe(
      "/analysis#portfolio-allocation",
    );
    expect(DASHBOARD_DEEP_LINKS.goalProgress).toBe("/goals#goal-progress");
    expect(DASHBOARD_DEEP_LINKS.marketBriefing).toBe("/news#news-market-brief");
    expect(DASHBOARD_DEEP_LINKS.portfolioHealth).toBe("/portfolio-health");
    expect(parseSectionHash("#cash-intelligence")).toBe("cash-intelligence");
  });

  it("keeps matching ids on destination sections", () => {
    expect(read("components/analysis/CashIntelligenceSection.tsx")).toContain(
      `id="${SECTION_IDS.cashIntelligence}"`,
    );
    expect(
      read("components/analysis/DividendIntelligenceSection.tsx"),
    ).toContain(`id="${SECTION_IDS.dividendIntelligence}"`);
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      `id="${SECTION_IDS.portfolioAllocation}"`,
    );
    expect(read("app/goals/page.tsx")).toContain(
      `id="${SECTION_IDS.goalProgress}"`,
    );
    expect(read("components/news/NewsMarketBriefSection.tsx")).toContain(
      `id="${SECTION_IDS.newsMarketBrief}"`,
    );
  });

  it("wires Dashboard cards to deep-link destinations", () => {
    expect(
      read("components/dashboard/DashboardCashIntelligenceCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(read("components/dashboard/DashboardDividendCard.tsx")).toContain(
      "DASHBOARD_DEEP_LINKS.dividendIntelligence",
    );
    expect(
      read("components/dashboard/DashboardPortfolioExposureCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(
      read("components/dashboard/DashboardGoalProgressCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.goalProgress");
    expect(
      read("components/dashboard/DashboardIntelligencePreview.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.marketBriefing");
    expect(
      read("components/dashboard/DashboardPortfolioHealthCard.tsx"),
    ).toContain("DASHBOARD_DEEP_LINKS.portfolioHealth");
  });

  it("mounts a shared deep-link scroller once", () => {
    expect(read("components/providers/AppProviders.tsx")).toContain(
      "SectionDeepLinkEffect",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "scrollIntoView",
    );
    expect(read("lib/client/useSectionDeepLink.ts")).toContain(
      "prefers-reduced-motion",
    );
  });
});
