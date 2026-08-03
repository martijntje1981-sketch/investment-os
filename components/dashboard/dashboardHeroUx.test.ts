import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard hero movers integration", () => {
  it("renders compact hero movers inside the portfolio value widget", () => {
    const summarySource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
      "utf8",
    );
    const valueSource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/PortfolioValueCard.tsx"),
      "utf8",
    );
    const dashboardSource = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const intelligenceSource = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardTodaysMarketBriefing.tsx",
      ),
      "utf8",
    );

    expect(summarySource).toContain("PortfolioValueCard");
    expect(valueSource).toContain("heroTopMover");
    expect(valueSource).toContain("Top mover");
    expect(valueSource).toContain("Welcome back");
    expect(dashboardSource).not.toContain("Also worth noting");
    expect(dashboardSource).not.toContain("PageHero");
    expect(dashboardSource).not.toContain("DashboardMoverCard");
    expect(intelligenceSource).not.toContain("Also worth noting");
  });
});
