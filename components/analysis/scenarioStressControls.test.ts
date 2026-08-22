import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  personalChoiceClass,
  scenarioChoiceClass,
} from "@/components/analysis/scenarioStressControls";

const sectionSource = readFileSync(
  path.resolve(process.cwd(), "components/analysis/ScenarioStressSection.tsx"),
  "utf8",
);

describe("Scenario stress interactive affordance", () => {
  it("uses button radios with stronger selected vs idle scenario styles", () => {
    expect(sectionSource).toContain('role="radio"');
    expect(sectionSource).toContain("scenarioChoiceClass(selected)");
    expect(sectionSource).toContain(
      "data-testid={`scenario-choice-${row.scenarioId}`}",
    );
    expect(sectionSource).toContain("Scenarios that matter to your portfolio");
    expect(sectionSource).toContain("selectRelevantPortfolioScenarios");
    expect(sectionSource).toContain("Selected");
    expect(sectionSource).toContain("Choose");
    expect(sectionSource).toContain("min-h-11");

    const selected = scenarioChoiceClass(true);
    const idle = scenarioChoiceClass(false);
    expect(selected).toContain("border-2");
    expect(selected).toContain("border-q1-strong");
    expect(selected).toContain("bg-q1-soft");
    expect(idle).toContain("cursor-pointer");
    expect(idle).toContain("hover:border-brand");
    expect(idle).toContain("focus-visible:ring-2");
    expect(idle).not.toContain("border-2");
  });

  it("uses stronger personal contribution and target-year choice styles", () => {
    expect(sectionSource).toContain("personalChoiceClass(selected)");
    expect(sectionSource).toContain("personalChoiceClass(!showExtraYear)");
    expect(sectionSource).toContain('data-testid={`contribution-choice-${row.deltaEuro}`}');
    expect(sectionSource).toContain('data-testid="target-year-current"');
    expect(sectionSource).toContain('data-testid="target-year-plus-one"');

    const selected = personalChoiceClass(true);
    const idle = personalChoiceClass(false);
    expect(selected).toContain("border-2");
    expect(selected).toContain("border-q1-strong");
    expect(idle).toContain("cursor-pointer");
    expect(idle).toContain("hover:border-brand");
    expect(idle).toContain("min-h-11");
  });

  it("keeps result panels visually distinct from controls", () => {
    expect(sectionSource).toContain(
      'className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 sm:px-5"',
    );
    expect(sectionSource).toContain("detailsToggleClass");
  });
});
