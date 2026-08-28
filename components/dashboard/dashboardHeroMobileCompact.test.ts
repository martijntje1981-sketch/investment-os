import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dashboard hero mobile movers prominence", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );

  it("keeps Biggest mover and Weakest mover side by side on mobile", () => {
    expect(source).toContain("grid min-w-0 grid-cols-2 gap-1.5 sm:gap-2");
    expect(source).toContain('label="Biggest mover"');
    expect(source).toContain('label="Weakest mover"');
    expect(source).not.toContain("Lowest mover");
    expect(source).not.toContain("Today’s biggest winner");
    expect(source).not.toContain("Today’s biggest loser");
  });

  it("uses compact mover ticker and percentage sizes", () => {
    expect(source).toContain(
      "truncate text-[14px] font-semibold leading-tight text-white sm:text-[15px]",
    );
    expect(source).toContain(
      "truncate text-[14px] font-bold tabular-nums tracking-[-0.02em] sm:text-[15px]",
    );
  });

  it("keeps movers on the second premium-blue panel", () => {
    expect(source).toContain('data-testid="hero-zone-snapshot"');
    expect(source).toContain("space-y-2 sm:space-y-3");
  });

  it("uses a more compact mobile hero shell", () => {
    expect(source).toContain("appHeroPaddingCompactClass");
    expect(source).toContain("appHeroMatchedKpiClass");
    expect(source).toContain("appHeroMetricLabelClass");
    expect(source).toContain('variant="icon"');
    expect(source).toContain("space-y-2 sm:space-y-3");
  });
});
