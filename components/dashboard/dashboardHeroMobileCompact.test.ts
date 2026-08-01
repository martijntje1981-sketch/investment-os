import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Dashboard hero mobile movers prominence", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
    "utf8",
  );

  it("keeps Top mover and Weakest mover side by side on mobile", () => {
    expect(source).toContain('grid min-w-0 grid-cols-2 gap-2 sm:gap-2.5');
    expect(source).toContain('label="Top mover"');
    expect(source).toContain('label="Weakest mover"');
    expect(source).not.toContain("Lowest mover");
    expect(source).not.toContain("Today’s biggest winner");
    expect(source).not.toContain("Today’s biggest loser");
  });

  it("uses larger mover ticker and percentage sizes", () => {
    expect(source).toContain(
      "truncate text-sm font-bold leading-tight text-white sm:text-base",
    );
    expect(source).toContain(
      "truncate text-base font-bold leading-none tracking-[-0.03em] tabular-nums sm:text-lg",
    );
  });

  it("reduces secondary text before reducing mover percentages on narrow screens", () => {
    expect(source).toContain(
      "mt-0.5 hidden truncate text-xs text-white/55 sm:block",
    );
    expect(source).toContain(
      "mt-0.5 hidden max-w-full truncate text-[11px] font-medium leading-snug text-white/50 sm:block",
    );
  });

  it("uses a more compact mobile hero shell", () => {
    expect(source).toContain("appHeroPaddingCompactClass");
    expect(source).toContain("appHeroMatchedKpiClass");
    expect(source).toContain("appHeroMetricLabelClass");
    expect(source).toContain("mt-3 flex flex-col gap-2.5 border-t");
  });
});
