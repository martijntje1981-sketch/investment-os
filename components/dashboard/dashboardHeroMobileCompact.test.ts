import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dashboard hero mobile compactness", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );
  const sparkline = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/HeroPerformanceSparkline.tsx"),
    "utf8",
  );

  it("does not render movers or pulse on the primary hero", () => {
    expect(source).not.toContain('label="Biggest mover"');
    expect(source).not.toContain('label="Weakest mover"');
    expect(source).not.toContain("hero-zone-snapshot");
    expect(source).not.toContain("HeroPortfolioPulse");
  });

  it("uses a compact mobile hero shell and quieter conversion trigger", () => {
    expect(source).toContain("appHeroPaddingCompactClass");
    expect(source).toContain("appHeroMatchedKpiClass");
    expect(source).toContain("appHeroMetricLabelClass");
    expect(source).toContain('variant="icon"');
    expect(source).toContain("quietTrigger");
    expect(sparkline).toContain("h-[68px]");
  });
});
