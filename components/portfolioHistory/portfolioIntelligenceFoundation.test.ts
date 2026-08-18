import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 3A Portfolio Intelligence foundation wiring", () => {
  const timeline = read("lib/services/portfolio/timeline/buildPortfolioTimeline.ts");
  const historyPage = read("components/portfolioHistory/PortfolioHistoryPage.tsx");
  const navCard = read("components/portfolioHistory/PortfolioHistoryNavCard.tsx");
  const dashboardSection = read(
    "components/dashboard/DashboardPortfolioHistorySection.tsx",
  );
  const dashboard = read("app/dashboard/page.tsx");
  const exportSource = read("lib/client/portfolioExport.ts");

  it("keeps timeline generation in a shared service", () => {
    expect(timeline).toContain("export function buildPortfolioTimeline");
    expect(timeline).toContain("timelineToGoalHistoryPoints");
    expect(timeline).not.toMatch(/Math\.random|fakeHistory/i);
    expect(timeline).toContain("Does not invent chart points");
  });

  it("uses the shared timeline on History and Dashboard without duplicating series math", () => {
    expect(historyPage).toContain("buildPortfolioTimeline");
    expect(historyPage).toContain("usePortfolioPerformanceHistory");
    expect(dashboardSection).toContain("buildPortfolioTimeline");
    expect(dashboard).toContain("monthHistory.data");
    expect(dashboardSection).not.toContain("/api/portfolio/performance");
  });

  it("exposes a single Export Portfolio action and unified workbook", () => {
    expect(exportSource).toContain("Tobailey_Portfolio_");
    expect(exportSource).toContain("Dashboard Summary");
    expect(exportSource).toContain("buildPortfolioWorkbook");
    expect(exportSource).toContain("downloadPortfolioWorkbook");
    expect(historyPage).toContain("ExportPortfolioButton");
    expect(navCard).toContain("Export Portfolio");
    expect(historyPage).not.toContain("Export Excel");
    expect(navCard).not.toContain("Export Excel");
  });

  it("keeps mobile-first layout markers", () => {
    expect(historyPage).toContain("min-w-0");
    expect(historyPage).toContain("min-h-[44px]");
    expect(historyPage).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
    expect(navCard).toContain("shellClassName=\"h-[120px]");
  });
});
