import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { buildDistributionPolicyInsight } from "@/lib/client/dividendPolicy/buildDistributionPolicyInsight";

const sectionSource = readFileSync(
  path.resolve(
    process.cwd(),
    "components/analysis/DividendIntelligenceSection.tsx",
  ),
  "utf8",
);

describe("DividendIntelligenceSection compact disclosure", () => {
  it("defaults to collapsed holdings with progressive disclosure controls", () => {
    expect(sectionSource).toContain("useState(false)");
    expect(sectionSource).toContain("View holdings");
    expect(sectionSource).toContain("aria-expanded={holdingsExpanded}");
    expect(sectionSource).toContain("aria-controls={holdingsPanelId}");
    expect(sectionSource).toContain("<details");
    expect(sectionSource).toContain("Methodology");
    expect(sectionSource).toContain("Distribution policy");
    expect(sectionSource).not.toContain("Distribution policy classification");
  });

  it("uses a compact divided count row instead of five large cards", () => {
    expect(sectionSource).toContain("sm:grid-cols-5 sm:divide-x");
    expect(sectionSource).not.toContain("xl:grid-cols-5");
    expect(sectionSource).not.toContain(
      "rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3",
    );
  });

  it("preserves DistributionPolicyHoldingRow wiring", () => {
    expect(sectionSource).toContain("DistributionPolicyHoldingRow");
    expect(sectionSource).toContain("onPolicyOverrideChange");
    expect(sectionSource).toContain("onPassiveIncomeEstimateChange");
  });

  it("builds a useful portfolio-level insight line", () => {
    expect(
      buildDistributionPolicyInsight({
        distributing: 2,
        accumulating: 1,
        nonDistributing: 0,
        unknown: 0,
        notApplicable: 0,
        conflicted: 0,
        totalInvestments: 3,
      }),
    ).toMatch(/cash-distributing/i);

    expect(
      buildDistributionPolicyInsight({
        distributing: 0,
        accumulating: 0,
        nonDistributing: 0,
        unknown: 3,
        notApplicable: 0,
        conflicted: 1,
        totalInvestments: 3,
      }),
    ).toMatch(/conflicting/i);
  });
});
