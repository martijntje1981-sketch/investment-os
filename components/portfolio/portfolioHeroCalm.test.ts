/**
 * Portfolio glance actions — Add, Refresh, History, Scorecard, Export.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("calm Portfolio glance actions", () => {
  const portfolio = read("app/portfolio/page.tsx");
  const intro = read("components/portfolio/glance/PortfolioIntro.tsx");
  const holdings = read("components/portfolio/glance/PortfolioHoldingsList.tsx");
  const explore = read("components/portfolio/glance/PortfolioExploreNav.tsx");
  const catalog = read(
    "components/portfolio/glance/portfolioExploreCatalog.ts",
  );
  const addMenu = read("components/portfolio/PortfolioHeroAddMenu.tsx");
  const refresh = read("components/portfolio/RefreshPricesButton.tsx");

  it("keeps Add, Refresh, History and Export reachable without a PageHero cluster", () => {
    expect(portfolio).not.toContain("<PageHero");
    expect(holdings).toContain("PortfolioHeroAddMenu");
    expect(portfolio).toContain('label="Export"');
    expect(catalog).toContain("PORTFOLIO_HISTORY_PATH");
    expect(catalog).toContain("Portfolio History");
  });

  it("L. Add investment / crypto / cash remain reachable", () => {
    expect(addMenu).toContain("Add investment");
    expect(addMenu).toContain("Add crypto");
    expect(addMenu).toContain("Add cash");
    expect(addMenu).toContain("useDismissibleMenu");
    expect(addMenu).toContain("min-h-[44px]");
    expect(addMenu).toContain('role="menu"');
    expect(holdings).toContain('onAddInvestment={onAddInvestment}');
    expect(portfolio).toContain('onAddInvestment={() => openAdd("investment")}');
    expect(portfolio).toContain("onAddCrypto={openAddCrypto}");
    expect(portfolio).toContain('onAddCash={() => openAdd("cash")}');
  });

  it("M. Refresh stays the same action, placed with freshness", () => {
    expect(intro).toContain("RefreshPricesButton");
    expect(intro).toContain("freshnessLabel");
    expect(intro).toContain('variant="compact"');
    expect(portfolio).toContain("void refreshPrices()");
    expect(refresh).toContain("Refresh prices");
    expect(refresh).not.toContain("setInterval");
  });

  it("N. Scorecard remains discoverable in Explore", () => {
    expect(catalog).toContain("PORTFOLIO_HEALTH_PATH");
    expect(catalog).toContain("Scorecard");
    expect(explore).toContain("PORTFOLIO_EXPLORE_GROUPS");
  });
});
