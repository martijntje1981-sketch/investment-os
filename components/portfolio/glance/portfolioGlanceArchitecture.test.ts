import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

import { canonicalPortfolioActivityEvents } from "@/lib/client/canonicalPortfolioActivity";
import { PORTFOLIO_EXPLORE_DESTINATIONS } from "@/components/portfolio/glance/portfolioExploreCatalog";
import { MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS } from "@/lib/client/manualHoldingAutoLookup";
import type { PortfolioTimelineEvent } from "@/lib/services/portfolio/timeline/types";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Premium Portfolio architecture", () => {
  const page = read("app/portfolio/page.tsx");
  const intro = read("components/portfolio/glance/PortfolioIntro.tsx");
  const glance = read("components/portfolio/glance/PortfolioGlance.tsx");
  const holdings = read("components/portfolio/glance/PortfolioHoldingsList.tsx");
  const activity = read("components/portfolio/glance/PortfolioActivity.tsx");
  const explore = read("components/portfolio/glance/PortfolioExploreNav.tsx");
  const catalog = read("components/portfolio/glance/portfolioExploreCatalog.ts");
  const autoLookup = read("lib/client/manualHoldingAutoLookup.ts");
  const match = read("lib/client/manualHoldingMatch.ts");
  const contributionsCopy = read("lib/client/contributionsCopy.ts");
  const contributionCalc = read(
    "lib/services/contributions/calculateContributionSummary.ts",
  );
  const confirmed = read(
    "components/instruments/ConfirmedListingIdentity.tsx",
  );

  it("A. primary architecture is Glance / Holdings / Activity / Explore", () => {
    expect(page).toContain('canvas="portfolio"');
    expect(page).toContain("<PortfolioIntro");
    expect(page).toContain("<PortfolioGlance");
    expect(page).toContain("<PortfolioHoldingsList");
    expect(page).toContain("<PortfolioActivity");
    expect(page).toContain("<PortfolioExploreNav");
    expect(page).not.toContain("<PageHero");
    expect(page).not.toContain("AuthenticatedFourQuestionsNav");
    expect(page).not.toContain("<PageRelatedLinks");
    expect(page).not.toContain("Largest position");

    const introIdx = page.indexOf("<PortfolioIntro");
    const glanceIdx = page.indexOf("<PortfolioGlance");
    const holdingsIdx = page.indexOf("<PortfolioHoldingsList");
    const activityIdx = page.indexOf("<PortfolioActivity");
    const exploreIdx = page.indexOf("<PortfolioExploreNav");

    expect(introIdx).toBeGreaterThan(-1);
    expect(glanceIdx).toBeGreaterThan(introIdx);
    expect(holdingsIdx).toBeGreaterThan(glanceIdx);
    expect(activityIdx).toBeGreaterThan(holdingsIdx);
    expect(exploreIdx).toBeGreaterThan(activityIdx);
    expect(page).toContain("usePortfolioMoneyInOutOpen");
    expect(page).toContain('id="money-in-out"');
  });

  it("B. edit/delete still uses existing saveHoldings persistence", () => {
    expect(page).toContain("saveHoldings(next)");
    expect(page).toContain("saveHoldings((current) =>");
    expect(page).toContain("current.filter((item) => item.id !== holding.id)");
    expect(page).toContain("saveHoldings(mergeHoldingOnSave(holdings, cleaned))");
    expect(page).not.toContain("supabase.from");
    expect(page).not.toContain("createClient(");
  });

  it("C. delete tombstones remain on the existing filter save path", () => {
    expect(page).toContain("saveHoldings((current) =>");
    expect(page).toContain("item.id !== holding.id");
    expect(page).not.toContain("repairPortfolio");
  });

  it("D. auto listing discovery triggers from stable ticker/name input", () => {
    expect(autoLookup).toContain("shouldTriggerManualListingAutoLookup");
    expect(autoLookup).toContain("MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS");
    expect(MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS).toBe(450);
    expect(page).toContain("shouldTriggerManualListingAutoLookup");
    expect(page).toContain("lookupManualHoldingListing(draftSnapshot");
    expect(match).toContain("signal: options?.signal");
  });

  it("H. confirmed venue and currency remain visible before Add", () => {
    const addForm = read("components/portfolio/AddInvestmentHoldingForm.tsx");
    expect(addForm).toContain("<ConfirmedListingIdentity");
    expect(confirmed).toContain("Venue");
    expect(confirmed).toContain("Currency");
    expect(confirmed).toContain("formatListingDetails");
    expect(confirmed).toContain("data-testid=\"confirmed-listing-identity\"");
  });

  it("L. Money in & out does not alter contribution calculations", () => {
    expect(contributionsCopy).toContain('PORTFOLIO_FUNDING_TITLE = "Money in & out"');
    expect(page).not.toContain("calculateContributionSummary");
    expect(contributionCalc).toContain("export function calculateContributionSummary");
  });

  it("M. Activity uses canonical existing history only", () => {
    expect(page).toContain("buildPortfolioTimeline");
    expect(activity).toContain("canonicalPortfolioActivityEvents");
    const helper = read("lib/client/canonicalPortfolioActivity.ts");
    expect(helper).toContain('event.kind === "contribution"');
    expect(helper).toContain('event.kind === "withdrawal"');
    expect(helper).not.toContain('kind: "buy"');
    expect(helper).not.toContain('kind: "sell"');
    const events: PortfolioTimelineEvent[] = [
      {
        id: "contribution:1",
        kind: "contribution",
        date: "2026-01-01",
        title: "Recorded contribution",
        amount: 100,
        note: null,
        sortKey: "2026-01-01",
      },
      {
        id: "milestone:1",
        kind: "milestone",
        date: "2026-01-01",
        title: "Portfolio history started",
        amount: null,
        note: null,
        sortKey: "2026-01-01",
      },
    ];
    expect(canonicalPortfolioActivityEvents(events).map((row) => row.kind)).toEqual(
      ["contribution"],
    );
  });

  it("N. valuation coverage behavior remains unchanged", () => {
    expect(glance).toContain("valueAvailable");
    expect(glance).toContain("Unavailable");
    expect(page).toContain("performance.totalValueAvailable");
    expect(page).toContain("performance.totalValueCoverageMessage");
    expect(page).toContain("performance.canShowPerformance");
  });

  it("O. no new Supabase write path is introduced", () => {
    expect(page).not.toContain("from(\"holdings\")");
    expect(page).not.toContain("upsert(");
    expect(autoLookup).not.toContain("createClient");
    expect(holdings).not.toContain("saveHoldings");
    expect(explore).not.toContain("saveHoldings");
  });

  it("preserves Add / Import / Scorecard / History destinations", () => {
    expect(holdings).toContain("PortfolioHeroAddMenu");
    expect(holdings).toContain("UPLOAD_PATH");
    expect(catalog).toContain("PORTFOLIO_HEALTH_PATH");
    expect(PORTFOLIO_EXPLORE_DESTINATIONS.scorecard).toContain("portfolio-health");
    expect(intro).toContain("RefreshPricesButton");
    expect(page).toContain("AddInvestmentHoldingForm");
    expect(read("components/portfolio/AddInvestmentHoldingForm.tsx")).toContain(
      "Find listing",
    );
  });
});
