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
    expect(section).toContain("min-h-11");
  });

  it("uses four restrained visual identities", () => {
    expect(types).toContain("FOUR_QUESTION_VISUAL");
    expect(types).toContain("from-cyan-50");
    expect(types).toContain("from-violet-50");
    expect(types).toContain("from-amber-50");
    expect(types).toContain("from-teal-50");
    expect(section).toContain("FOUR_QUESTION_VISUAL");
    expect(section).toContain("data-visual={question.id}");
    expect(section).toContain("space-y-2.5");
  });

  it("exposes Explore deep links for each question", () => {
    expect(section).toContain("four-question-explore-${question.id}");
    expect(section).toContain("question.explore.href");
    expect(section).toContain("question.explore.label");
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
  });

  it("keeps mobile-friendly stacked layout tokens", () => {
    expect(section).toContain("space-y-3");
    expect(section).not.toContain("overflow-x-scroll");
    expect(section).toContain("sm:px-4");
    expect(section).toContain("w-full");
  });
});
