/**
 * Phase 20 Dashboard intelligence refinement contracts.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { NOTHING_IMPORTANT_CHANGED_COPY } from "@/lib/services/portfolioChangeDetection";
import { LOOKING_AHEAD_MODELED_BADGE } from "@/lib/services/lookingAhead";
import { PORTFOLIO_EVOLUTION_HREF } from "@/lib/services/portfolioEvolution";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 20 Dashboard intelligence refinement", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const notable = read("components/dashboard/NewAndNotableSection.tsx");
  const ahead = read("components/dashboard/LookingAheadSection.tsx");
  const evolutionCard = read(
    "components/portfolioEvolution/DashboardPortfolioEvolutionCard.tsx",
  );
  const evolutionEngine = read(
    "lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline.ts",
  );
  const cashCard = read("components/dashboard/DashboardCashIntelligenceCard.tsx");
  const analysisExposure = read("components/analysis/PortfolioExposureSection.tsx");
  const analysisCash = read("components/analysis/CashIntelligenceSection.tsx");
  const portfolioPage = read("app/portfolio/page.tsx");
  const changeEngine = read(
    "lib/services/portfolioChangeDetection/buildPortfolioChangeAttention.ts",
  );
  const lookingEngine = read("lib/services/lookingAhead/buildLookingAhead.ts");

  it("A. removes Since your last check from Dashboard", () => {
    expect(dashboard).not.toContain("SinceLastCheckSection");
    expect(dashboard).not.toContain("Since your last check");
    expect(notable).not.toContain("Since your last check");
  });

  it("B. New & Notable remains available; Dashboard uses selected personal intelligence", () => {
    expect(dashboard).toContain("selectDashboardPersonalIntelligence");
    expect(dashboard).toContain("DashboardPersonalIntelligence");
    expect(dashboard).not.toContain("NewAndNotableSection");
    expect(notable).toContain("New & Notable");
    expect(notable).toContain("Changes worth knowing about");
    expect(notable).toContain('id="new-and-notable"');
  });

  it("C. has no last-open wording", () => {
    expect(notable).not.toContain("Last opened");
    expect(notable).not.toContain("lastCheckMemory");
    expect(dashboard).not.toContain("markLastCheckAt");
    expect(changeEngine).not.toContain("lastCheckMemory");
  });

  it("D. discloses a meaningful snapshot comparison", () => {
    expect(changeEngine).toContain("Compared with ${when} snapshot");
    expect(notable).toContain("attention.window.label");
  });

  it("E. quiet state when nothing material", () => {
    expect(NOTHING_IMPORTANT_CHANGED_COPY).toMatch(/No material portfolio changes/);
    expect(notable).toContain("attention.headline");
  });

  it("F/G/H. candidates come from existing change detection, not fabrication", () => {
    expect(dashboard).toContain("buildPortfolioChangeAttention");
    expect(lookingEngine).not.toMatch(/Math\.random|fakeCandidate|invent/i);
    expect(changeEngine).toContain("selectLatestStoredSnapshot");
  });

  it("I. large Dashboard Portfolio Exposure is demoted", () => {
    expect(dashboard).not.toContain("DashboardPortfolioExposureCard");
  });

  it("J. full Portfolio Exposure is preserved on Analysis", () => {
    expect(analysisExposure).toContain('id="portfolio-exposure"');
    expect(read("components/analysis/PortfolioAnalysisPage.tsx")).toContain(
      "PortfolioExposureSection",
    );
  });

  it("K. allocation remains discoverable", () => {
    expect(evolutionCard).toContain("View allocation");
    expect(evolutionCard).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(portfolioPage).toContain("DASHBOARD_DEEP_LINKS.portfolioExposure");
    expect(PORTFOLIO_EVOLUTION_HREF).toBe("/portfolio-history#portfolio-evolution");
  });

  it("L. Looking Ahead engine remains; Dashboard selects it only when useful", () => {
    expect(dashboard).toContain("buildLookingAhead");
    expect(dashboard).not.toContain("LookingAheadSection");
    expect(ahead).toContain("Looking Ahead");
    expect(ahead).toContain("model.headline");
  });

  it("M/N/O. modeled scenario labelled, not forecast, not hardcoded Bitcoin", () => {
    expect(LOOKING_AHEAD_MODELED_BADGE).toMatch(/not forecast/i);
    expect(ahead).toContain("modeledDisclaimer");
    expect(lookingEngine).toContain("formatModeledIfImpact");
    expect(lookingEngine).not.toContain("Bitcoin remains your portfolio");
    expect(lookingEngine).not.toMatch(/Bitcoin will fall/);
  });

  it("P. upcoming event only when relevant", () => {
    expect(lookingEngine).toContain("selectRelevantUpcomingEvent");
    expect(read("lib/services/lookingAhead/selectRelevantUpcomingEvent.ts")).toContain(
      "fixed_income",
    );
  });

  it("Q. Looking Ahead quiet state", () => {
    expect(lookingEngine).toContain("LOOKING_AHEAD_QUIET_HEADLINE");
    expect(ahead).toContain("model.status");
  });

  it("R. Portfolio Evolution engine is unchanged in this phase", () => {
    expect(dashboard).not.toContain("buildPortfolioEvolutionTimeline");
    expect(evolutionEngine).toContain("EVOLUTION_DAILY_MIX_BLOCK_REASON");
  });

  it("S. Cash Intelligence is preserved off the primary Dashboard", () => {
    expect(dashboard).not.toContain("DashboardCashIntelligenceCard");
    expect(read("components/dashboard/DashboardSecondaryNav.tsx")).toContain(
      "cashIntelligence",
    );
    expect(cashCard).toContain("View cash intelligence");
    expect(analysisCash).toContain('id="cash-intelligence"');
  });

  it("T/U. Dashboard does not add price or history requests", () => {
    expect(lookingEngine).not.toMatch(/\/api\/prices|eodhd|openai/i);
    expect(ahead).not.toMatch(/fetch\(|usePortfolioPerformanceHistory/);
    expect(notable).not.toMatch(/fetch\(|usePortfolioPerformanceHistory/);
    expect(dashboard.match(/usePortfolioPerformanceHistory\(/g)?.length).toBe(2);
    expect(dashboard).not.toContain('"3M"');
  });

  it("V/W. Free vs Complete gating is preserved", () => {
    expect(lookingEngine).toContain('depth === "complete"');
    expect(notable).toContain("free_preview");
    expect(dashboard).toContain("intelligenceDepth: productAccess.intelligenceDepth");
  });

  it("X. mobile layout contract", () => {
    expect(notable).toContain("overflow-x-clip");
    expect(notable).toContain("min-h-11");
    expect(ahead).toContain("overflow-x-clip");
    expect(ahead).toContain("min-h-11");
    expect(dashboard).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });

  it("Y. Dashboard narrative order", () => {
    const order = [
      "<DashboardSummary",
      "<HoldingsToday",
      "<DashboardPersonalIntelligence",
      "<DashboardSecondaryNav",
    ].map((token) => dashboard.indexOf(token));
    for (let i = 0; i < order.length; i += 1) {
      expect(order[i], `missing token ${i}`).toBeGreaterThan(-1);
      if (i > 0) expect(order[i]).toBeGreaterThan(order[i - 1]!);
    }
  });

  it("Z. uses Q1 cyan as the primary intelligence accent outside Four Questions", () => {
    const surface = read("components/layout/appSurface.ts");
    const identity = read("components/layout/semanticIdentity.ts");
    const fourQuestions = read("lib/services/fourQuestions/types.ts");
    const evolutionVisual = read(
      "components/portfolioEvolution/PortfolioEvolutionVisual.tsx",
    );

    expect(surface).toContain("appIntelligenceAccentCardClass");
    expect(surface).toContain("appIntelligenceAccentStrongCardClass");
    expect(ahead).toContain("appIntelligenceAccentCardClass");
    expect(ahead).not.toContain("appIdentityAheadCardClass");
    expect(ahead).not.toMatch(/text-teal-|border-teal-|from-teal-/);
    expect(evolutionCard).toContain("appIntelligenceAccentStrongCardClass");
    expect(notable).toContain("appIdentityHappenedCardClass");
    expect(evolutionVisual).toContain("appDarkCardClass");
    expect(evolutionVisual).toContain("Tobailey conclusion");

    expect(fourQuestions).toContain("from-q1-soft");
    expect(fourQuestions).toContain("from-q2-soft");
    expect(fourQuestions).toContain("from-q3-soft");
    expect(fourQuestions).toContain("from-q4-soft");
    expect(identity).toContain("FOUR_QUESTION_VISUAL.what_happened.card");
    expect(identity).toContain("FOUR_QUESTION_VISUAL.what_matters_now.card");
    expect(identity).toContain("FOUR_QUESTION_VISUAL.am_i_on_track.card");
    expect(identity).toContain("FOUR_QUESTION_VISUAL.whats_ahead.card");
  });
});
