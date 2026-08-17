/**
 * Phase 3A Analysis attribution UI wiring checks.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Performance attribution UI", () => {
  it("wires attribution section into portfolio performance", () => {
    const section = read(
      "components/analysis/performance/PortfolioPerformanceSection.tsx",
    );
    const attribution = read(
      "components/analysis/performance/PerformanceAttributionSection.tsx",
    );
    const selector = read(
      "components/analysis/performance/AttributionPeriodSelector.tsx",
    );

    expect(section).toContain("PerformanceAttributionSection");
    expect(attribution).toContain("performance-attribution-section");
    expect(attribution).toContain("Show more detail");
    expect(attribution).not.toContain("<table");
    expect(selector).toContain("attribution-period-selector");
    expect(selector).toContain("ATTRIBUTION_PERIOD_ORDER");
    expect(selector).toContain("capability.shortLabel");
    expect(attribution).toContain("min-w-0");
  });

  it("keeps 3M/12M in the centralized capability model", () => {
    const capability = read(
      "lib/services/performanceAttribution/periodCapability.ts",
    );
    expect(capability).toContain('"3M"');
    expect(capability).toContain('"12M"');
    expect(capability).toContain('status: "unavailable"');
  });

  it("enriches pulse detail without changing score formulas", () => {
    const sheet = read("components/dashboard/PortfolioPulseDetailSheet.tsx");
    const hero = read("components/dashboard/HeroPortfolioPulse.tsx");
    const page = read("app/dashboard/page.tsx");
    const dailyScore = read(
      "lib/services/portfolio/periodScores/buildDailyPortfolioScore.ts",
    );

    expect(sheet).toContain("attributionNotes");
    expect(sheet).toContain("Performance drivers");
    expect(hero).toContain("attributionEnrichment");
    expect(page).toContain("pulseAttributionEnrichment");
    expect(page).toContain("buildPulseAttributionEnrichment");
    // Score formula files must not import attribution engine.
    expect(dailyScore).not.toContain("performanceAttribution");
  });
});
