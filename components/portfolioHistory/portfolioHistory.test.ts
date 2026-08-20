import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("portfolio history UI", () => {
  const page = read("components/portfolioHistory/PortfolioHistoryPage.tsx");
  const route = read("app/portfolio-history/page.tsx");
  const menu = read("components/auth/UserMenu.tsx");
  const tools = read("components/dashboard/DashboardExploreTools.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const portfolio = read("app/portfolio/page.tsx");
  const navCard = read(
    "components/portfolioHistory/PortfolioHistoryNavCard.tsx",
  );
  const routes = read("lib/navigation/appRoutes.ts");
  const access = read("lib/auth/routeAccess.ts");
  const exportSource = read("lib/client/portfolioHistoryExport.ts");
  const dialog = read(
    "components/contributions/ManageContributionsDialog.tsx",
  );

  it("exposes the authenticated /portfolio-history route", () => {
    expect(route).toContain("PortfolioHistoryPage");
    expect(routes).toContain(
      'PORTFOLIO_HISTORY_PATH = "/portfolio-history"',
    );
    expect(access).toContain('"/portfolio-history"');
  });

  it("renders chart, summary metrics, timeline, holdings, and Export Portfolio", () => {
    expect(page).toContain("resolveHistorySummaryPresentation");
    expect(page).toContain("Timeline");
    expect(page).toContain("Current holdings");
    expect(page).toContain("Add activity");
    expect(page).toContain("ExportPortfolioButton");
    expect(page).toContain("PortfolioPerformanceChart");
    expect(page).toContain("PortfolioTimelineList");
    expect(page).toContain("ManageContributionsDialog");
    expect(page).toContain("runPortfolioExport");
    expect(page).toContain("buildPortfolioTimeline");
    expect(page).not.toContain("Investment return");
  });

  it("keeps Portfolio History discoverable in Portfolio, User Menu, and Evolution", () => {
    expect(menu).toContain("PORTFOLIO_HISTORY_PATH");
    expect(menu).toContain("Portfolio History");
    expect(dashboard).toContain("DashboardPortfolioEvolutionCard");
    expect(dashboard).not.toContain("DashboardPortfolioHistorySection");
    expect(portfolio).toContain("PortfolioHistoryNavCard");
    expect(portfolio).toContain("Portfolio History");
    expect(navCard).toContain('PORTFOLIO_HISTORY_LABEL = "Portfolio History"');
    expect(navCard).toContain("PORTFOLIO_HISTORY_PATH");
    expect(navCard).toContain("View history");
    expect(navCard).toContain("Export portfolio");
    expect(tools).toContain("Understand your portfolio");
  });

  it("extends add activity with cash or holding destination", () => {
    expect(dialog).toContain("Add to cash");
    expect(dialog).toContain("Invest in a holding");
    expect(dialog).toContain("destinationType");
    expect(dialog).toContain("does not change holding");
    expect(exportSource).toContain('"Destination"');
    expect(exportSource).toContain('"Price per unit"');
    expect(exportSource).toContain("sanitizeExcelCellValue");
  });
});
