import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { HELP_CENTRE_SECTIONS } from "@/lib/content/helpCentre";
import {
  PORTFOLIO_CONTEXT_LABEL,
  TRUST_NOT_ADVICE_SHORT,
} from "@/lib/content/productTrust";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

const PRIMARY_SURFACES = [
  "components/dashboard/DashboardExploreTools.tsx",
  "app/portfolio/page.tsx",
  "app/settings/page.tsx",
  "components/companion/CompanionReviewPage.tsx",
  "components/auth/UserMenu.tsx",
  "lib/navigation/productArchitecture.ts",
  "lib/content/helpCentre.ts",
  "app/page.tsx",
  "app/pricing/page.tsx",
  "components/investor/TodaysDecisionBlock.tsx",
] as const;

describe("Phase X.1 trust and terminology", () => {
  it("keeps Portfolio Scorecard on primary surfaces without Portfolio Health labels", () => {
    for (const file of PRIMARY_SURFACES) {
      const source = read(file);
      expect(source).not.toMatch(/Open Portfolio Health/);
      expect(source).not.toMatch(/title:\s*"Portfolio Health"/);
      expect(source).not.toMatch(/>\s*Portfolio Health\s*</);
    }
    expect(read("lib/content/helpCentre.ts")).toContain("Portfolio Scorecard");
  });

  it("replaces advisory Recommendation label with Why it matters", () => {
    const decision = read("components/investor/TodaysDecisionBlock.tsx");
    expect(decision).toContain(PORTFOLIO_CONTEXT_LABEL);
    expect(decision).not.toContain("Recommendation");
  });

  it("keeps landing free of AI Recommendations and financial-advice claims", () => {
    const landing = read("app/page.tsx");
    expect(landing).not.toContain("AI Recommendations");
    expect(landing).toContain("not a broker");
    expect(landing).toContain("Export portfolio");
    expect(landing).toContain("Your Review");
    expect(landing).toMatch(/not financial advice/i);
    expect(landing).toContain("Start with 14 days of Complete");
    expect(landing).toContain("Explore Demo Portfolio");
  });

  it("documents shared trust copy", () => {
    expect(TRUST_NOT_ADVICE_SHORT).toMatch(/not financial advice/i);
    const help = JSON.stringify(HELP_CENTRE_SECTIONS);
    expect(help).toMatch(/financial advice/i);
    expect(help).toContain("Portfolio Scorecard");
  });

  it("Review reuses Weekly Pulse without a second score engine", () => {
    const page = read("components/companion/CompanionReviewPage.tsx");
    const glance = read("components/companion/ReviewAtAGlance.tsx");
    expect(page).toContain("buildPortfolioPulse");
    expect(glance).toContain("Weekly Pulse");
    expect(glance).toContain("review-at-a-glance");
    expect(page).not.toMatch(/openai|anthropic/i);
  });
});
