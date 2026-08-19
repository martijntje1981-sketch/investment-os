import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Four Questions Dashboard UI wiring", () => {
  const section = read(
    "components/dashboard/fourQuestions/FourQuestionsSection.tsx",
  );
  const dashboard = read("app/dashboard/page.tsx");
  const types = read("lib/services/fourQuestions/types.ts");

  it("renders all four questions with collapsed default and single expand", () => {
    expect(section).toContain('data-testid="four-questions"');
    expect(section).toContain("four-question-${question.id}");
    expect(section).toContain("useState<FourQuestionId | null>(null)");
    expect(section).toContain(
      "setExpandedId((current) => (current === id ? null : id))",
    );
    expect(section).toContain("aria-expanded");
    expect(section).toContain("min-h-12");
  });

  it("presents four distinct semantic intelligence cards", () => {
    expect(types).toContain("FOUR_QUESTION_VISUAL");
    expect(types).toContain("FourQuestionsIntelligenceDepth");
    expect(types).toContain("iconWell");
    expect(section).toContain("FOUR_QUESTION_VISUAL");
    expect(section).toContain("visual.card");
    expect(section).toContain("visual.iconWell");
    expect(section).toContain("data-visual={question.id}");
    expect(section).toContain('data-testid="four-questions-stack"');
    expect(section).toContain("Your portfolio in four questions");
    expect(section).toContain("expandHigh");
    expect(section).toContain("completeTease");
    expect(section).toContain("data-emphasis");
    expect(section).toContain("grid gap-3");
    expect(section).not.toContain("bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]");
  });

  it("keeps Explore inside the expanded state with hub deep links", () => {
    expect(section).toContain("four-question-explore-${question.id}");
    expect(section).toContain("question.explore.href");
    expect(section).toContain("question.explore.label");
    expect(section).not.toContain("ExploreLink question={question} compact");
  });

  it("makes intelligence rows clickable without toggling the accordion", () => {
    expect(section).toContain("ExpandIntelligenceRow");
    expect(section).toContain("stopPropagation");
    expect(section).toContain('target="_blank"');
    expect(section).toContain('rel="noopener noreferrer"');
    expect(section).toContain('data-clickable="false"');
    expect(section).toContain('data-external="true"');
  });

  it("wires Four Questions under hero and above holdings", () => {
    const summaryIdx = dashboard.indexOf("<DashboardSummary");
    const fourIdx = dashboard.indexOf("<FourQuestionsSection");
    const holdingsIdx = dashboard.indexOf("<HoldingsToday");
    expect(summaryIdx).toBeGreaterThan(-1);
    expect(fourIdx).toBeGreaterThan(summaryIdx);
    expect(holdingsIdx).toBeGreaterThan(fourIdx);
    expect(dashboard).toContain("productAccess.intelligenceDepth");
    expect(dashboard).toContain("useProductAccess");
  });

  it("retires redundant conclusion cards once Four Questions exist", () => {
    expect(dashboard).toContain("FourQuestionsSection");
    expect(dashboard).not.toContain("<PortfolioThirtySeconds");
    expect(dashboard).not.toContain("<DashboardPortfolioResilienceCard");
    expect(dashboard).not.toContain("<DashboardGoalConclusionCard");
    expect(dashboard).not.toContain("<DashboardReviewConclusionCard");
    expect(dashboard).not.toContain("<DashboardTodaysMarketBriefing");
  });

  it("uses scope foundation without subscription gating", () => {
    expect(dashboard).toContain("resolveIntelligenceScope");
    expect(dashboard).toContain("filterHoldingsByIntelligenceScope");
    expect(dashboard).toContain("useGoalRealityCheck");
    expect(dashboard).not.toMatch(/stripe|checkout|subscriptionTier|entitlement/i);
    expect(types).toContain('"free" | "complete"');
  });

  it("keeps mobile-friendly stacked layout tokens", () => {
    expect(section).toContain("space-y-3");
    expect(section).not.toContain("overflow-x-scroll");
    expect(section).toContain("sm:px-5");
    expect(section).toContain("w-full");
  });
});
