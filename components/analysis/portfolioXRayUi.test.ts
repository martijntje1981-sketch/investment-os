/**
 * Phase 3B X-Ray UI wiring checks.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Portfolio X-Ray UI", () => {
  it("wires X-Ray into Analysis without a giant default table", () => {
    const page = read("components/analysis/glance/AnalysisDetailView.tsx");
    const section = read("components/analysis/PortfolioXRaySection.tsx");
    const links = read("lib/navigation/deepLinks.ts");

    expect(page).toContain("PortfolioXRaySection");
    expect(section).toContain('id="portfolio-xray"');
    expect(section).toContain("provider_not_connected");
    expect(section).not.toContain("<table");
    expect(section).toContain("min-h-11");
    expect(links).toContain("portfolioXray");
  });

  it("does not add a Dashboard X-Ray card by default", () => {
    const page = read("app/dashboard/page.tsx");
    expect(page).not.toContain("PortfolioXRaySection");
    expect(page).not.toContain("selectDashboardXRayConclusion");
  });
});
