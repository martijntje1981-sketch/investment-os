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
  const routes = read("lib/navigation/appRoutes.ts");
  const access = read("lib/auth/routeAccess.ts");
  const exportSource = read("lib/client/portfolioHistoryExport.ts");

  it("exposes the authenticated /portfolio-history route", () => {
    expect(route).toContain("PortfolioHistoryPage");
    expect(routes).toContain(
      'PORTFOLIO_HISTORY_PATH = "/portfolio-history"',
    );
    expect(access).toContain('"/portfolio-history"');
  });

  it("renders summary, activity, holdings, add activity, and excel export", () => {
    expect(page).toContain("Total contributed");
    expect(page).toContain("Total withdrawn");
    expect(page).toContain("Net contributed");
    expect(page).toContain("Current portfolio value");
    expect(page).toContain("Activity");
    expect(page).toContain("Current holdings");
    expect(page).toContain("Add activity");
    expect(page).toContain("Export Excel");
    expect(page).toContain("ManageContributionsDialog");
    expect(page).toContain("downloadPortfolioHistoryWorkbook");
    expect(page).toContain("holdingDetailPath");
    expect(page).toContain("usePortfolioContributions");
    expect(page).toContain("buildPortfolioPerformance");
  });

  it("reuses the contribution flow instead of a new transaction engine", () => {
    expect(page).toContain(
      'from "@/components/contributions/ManageContributionsDialog"',
    );
    expect(page).not.toContain("createPortfolioContribution");
    expect(exportSource).toContain('"Overview"');
    expect(exportSource).toContain('"Activity"');
    expect(exportSource).toContain('"Current Holdings"');
    expect(exportSource).toContain('"Notes"');
  });

  it("links from User menu Portfolio section and Explore Tobailey", () => {
    expect(menu).toContain("PORTFOLIO_HISTORY_PATH");
    expect(menu).toContain("Portfolio History");
    expect(tools).toContain("PORTFOLIO_HISTORY_PATH");
    expect(tools).toContain("Portfolio History");
    expect(tools).toContain(
      "Review contributions, withdrawals, and export your ledger.",
    );
  });
});
