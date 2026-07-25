import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("dashboard hero movers integration", () => {
  it("renders compact hero movers from the centralized snapshot", () => {
    const summarySource = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/DashboardSummary.tsx"),
      "utf8",
    );
    const dashboardSource = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    const intelligenceSource = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardIntelligencePreview.tsx",
      ),
      "utf8",
    );

    expect(summarySource).toContain("DashboardHeroMovers");
    expect(summarySource).toContain("heroTopMover");
    expect(dashboardSource).not.toContain("Also worth noting");
    expect(intelligenceSource).not.toContain("Also worth noting");
  });
});
