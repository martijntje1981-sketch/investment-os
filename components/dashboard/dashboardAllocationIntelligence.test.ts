import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Dashboard allocation intelligence UI", () => {
  const card = read("components/dashboard/DashboardPortfolioExposureCard.tsx");
  const dashboard = read("app/dashboard/page.tsx");
  const engine = read(
    "lib/services/allocationIntelligence/buildAllocationIntelligence.ts",
  );

  it("M. keeps a compact mobile structure without horizontal overflow", () => {
    expect(card).toContain("overflow-x-clip");
    expect(card).toContain("min-w-0");
    expect(card).not.toContain("overflow-x-auto");
    expect(card).not.toContain("overflow-x-scroll");
    expect(card).toContain("min-h-11");
    expect(card).toContain("text-[15px]");
    expect(card).toContain("grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto]");
  });

  it("wires canonical intelligence, holdings, and Bonds & Rates without X-Ray", () => {
    expect(card).toContain("buildAllocationIntelligence");
    expect(card).toContain("holdingDetailPath");
    expect(card).toContain("allocation-bonds-rates-link");
    expect(card).toContain("Understand rates & bonds");
    expect(card).toContain("intelligence.bondsRatesHref");
    expect(card).toContain("expandedGroupId");
    expect(card).not.toContain("constituent");
    expect(card).not.toContain("look-through");
    expect(card).not.toContain("look through");
    expect(engine).not.toContain("constituent");
    expect(dashboard).toContain("scenarioResults={resilienceProfile?.scenarioResults");
    expect(dashboard).not.toContain("fetch(");
  });

  it("does not duplicate Bonds & Rates education on Dashboard", () => {
    expect(card).not.toContain("buildFixedIncomeRateEducation");
    expect(card).not.toContain("BondsRatesSection");
  });
});
