import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Calm Core focused visual polish", () => {
  it("keeps the risk/return matrix compact with unchanged marker math", () => {
    const map = read("components/portfolioHealth/RiskReturnMap.tsx");

    expect(map).toContain("h-[188px]");
    expect(map).toContain("sm:h-[240px]");
    expect(map).toContain("lg:h-[256px]");
    expect(map).not.toContain("aspect-[5/4]");
    expect(map).not.toContain("aspect-[4/3]");
    expect(map).toContain("volatilityIndex * 100");
    expect(map).toContain("(1 - returnIndex) * 100");
    expect(map).toContain("Efficient Growth");
    expect(map).toContain("Aggressive Growth");
    expect(map).toContain("Defensive / Conservative");
    expect(map).toContain("High Vol / Limited Return");
    expect(map).toContain("Expected return");
    expect(map).toContain("Expected volatility");
    expect(map).toContain("data-testid=\"risk-return-map\"");
    expect(map).toContain("data-testid=\"risk-return-matrix\"");
  });

  it("gives Goals primary cards depth without changing the three blocks", () => {
    const goals = read("app/goals/page.tsx");
    const tradeOffs = read("components/portfolioStance/GoalTradeOffsSection.tsx");
    const visual = read("components/goals/GoalHeroProgressVisual.tsx");
    const surface = read("components/layout/appSurface.ts");

    expect(goals).toContain("Am I on track?");
    expect(goals).toContain("What is driving the outcome?");
    expect(goals).toContain("GoalTradeOffsSection");
    expect(goals).toContain("appDarkCardElevatedClass");
    expect(goals).toContain("appDarkInsetRecessedClass");
    expect(goals).toContain('data-testid="goals-on-track"');
    expect(goals).toContain('data-testid="goals-driving"');
    expect(tradeOffs).toContain("appDarkCardElevatedClass");
    expect(tradeOffs).toContain("appDarkInsetRecessedClass");
    expect(visual).toContain("h-2.5");
    expect(surface).toContain("appDarkCardElevatedClass");
    expect(surface).toContain("appDarkInsetRecessedClass");
  });

  it("places Dashboard news thumbnails beside headlines from stored metadata only", () => {
    const row = read("components/dashboard/HoldingsTodayRow.tsx");
    const thumbnail = read("components/news/NewsMediaThumbnail.tsx");
    const context = read("lib/client/holdingsTodayContext.ts");

    expect(row).toContain("size=\"context\"");
    expect(row).toContain("allowProviderStoredUrl");
    expect(row).toContain("HoldingMonogram");
    expect(row).toContain("holdings-today-news-link");
    expect(row).toContain("HOLDINGS_TODAY_NO_NEWS");
    expect(row).not.toContain("unsplash");
    expect(row).not.toContain("placeholder.com");
    expect(thumbnail).toContain("context:");
    expect(thumbnail).toContain("h-12 w-14");
    expect(thumbnail).toContain("md:h-14 md:w-16");
    expect(context).toContain("selectStoredNewsThumbnail");
    expect(context).toContain("thumbnailUrl");
  });

  it("darkens Portfolio History timeline rows while leaving the light chart in place", () => {
    const timeline = read("components/portfolioHistory/PortfolioTimelineList.tsx");
    const page = read("components/portfolioHistory/PortfolioHistoryPage.tsx");
    const chart = read("components/analysis/performance/PortfolioPerformanceChart.tsx");

    expect(timeline).toContain("bg-navy-hero-deep/55");
    expect(timeline).toContain("border-white/12");
    expect(timeline).toContain("text-emerald-400");
    expect(page).toContain("PortfolioPerformanceChart");
    expect(chart).toContain("from-slate-50/95 to-white");
  });
});
