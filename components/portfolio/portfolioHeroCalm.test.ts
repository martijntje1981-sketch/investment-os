/**
 * Calm Portfolio hero — bounded actions, Add menu, Refresh with freshness.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("calm Portfolio hero", () => {
  const portfolio = read("app/portfolio/page.tsx");
  const addMenu = read("components/portfolio/PortfolioHeroAddMenu.tsx");
  const pageHero = read("components/layout/PageHero.tsx");
  const refresh = read("components/portfolio/RefreshPricesButton.tsx");

  it("K. Portfolio hero has at most four visible actions plus Back", () => {
    const hero = portfolio.slice(
      portfolio.indexOf("<PageHero"),
      portfolio.indexOf("<PageRelatedLinks"),
    );
    const actions = hero.slice(hero.indexOf("actions={"));
    expect(portfolio).toContain("backToDashboard");
    expect(actions).toContain("aria-label=\"Portfolio History\"");
    expect(actions).toContain('label="Export"');
    expect(actions).toContain("PortfolioHeroAddMenu");
    expect(actions).not.toContain("Portfolio Scorecard");
    expect(actions).not.toContain("Add cash");
    expect(actions).not.toContain("RefreshPricesButton");
    expect(hero).toContain("RefreshPricesButton");
  });

  it("L. Add investment / crypto / cash remain reachable", () => {
    expect(addMenu).toContain("Add investment");
    expect(addMenu).toContain("Add crypto");
    expect(addMenu).toContain("Add cash");
    expect(addMenu).toContain("useDismissibleMenu");
    expect(addMenu).toContain("min-h-[44px]");
    expect(addMenu).toContain('role="menu"');
    expect(portfolio).toContain('onAddInvestment={() => openAdd("investment")}');
    expect(portfolio).toContain("onAddCrypto={openAddCrypto}");
    expect(portfolio).toContain('onAddCash={() => openAdd("cash")}');
  });

  it("M. Refresh stays the same action, placed with freshness", () => {
    expect(portfolio).toContain("RefreshPricesButton");
    expect(portfolio).toContain("heroFreshness.label");
    expect(portfolio).toContain('variant="compact"');
    expect(portfolio).toContain("void refreshPrices()");
    expect(refresh).toContain("Refresh prices");
    expect(refresh).not.toContain("setInterval");
  });

  it("N. Scorecard remains discoverable outside the hero cluster", () => {
    expect(portfolio).toContain("PORTFOLIO_HEALTH_PATH");
    expect(portfolio).toContain("Scorecard");
    expect(portfolio).toContain("PageRelatedLinks");
  });

  it("O. mobile action layout cannot overflow or collapse the title", () => {
    expect(pageHero).toContain(
      "lg:grid-cols-[minmax(14rem,1fr)_minmax(0,36rem)]",
    );
    expect(pageHero).toContain("lg:min-w-[14rem]");
    expect(pageHero).toContain("appPageHeroActionsClass");
    expect(portfolio).toContain("flex-wrap items-center");
  });
});
