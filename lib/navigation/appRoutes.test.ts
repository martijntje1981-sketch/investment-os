import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  holdingDetailPath,
  isPortfolioListPath,
  PORTFOLIO_PATH,
  portfolioAddPath,
} from "@/lib/navigation/appRoutes";

describe("canonical Portfolio navigation", () => {
  it("exposes a single Portfolio list path without query or hash", () => {
    expect(PORTFOLIO_PATH).toBe("/portfolio");
    expect(PORTFOLIO_PATH).not.toContain("?");
    expect(PORTFOLIO_PATH).not.toContain("#");
    expect(PORTFOLIO_PATH.startsWith("/")).toBe(true);
    expect(isPortfolioListPath("/portfolio")).toBe(true);
  });

  it("builds safe holding detail paths", () => {
    expect(holdingDetailPath("VWCE")).toBe("/holding/VWCE");
    expect(holdingDetailPath(" BTC ")).toBe("/holding/BTC");
    expect(holdingDetailPath("")).toBe(PORTFOLIO_PATH);
  });

  it("keeps add-flow on the Portfolio list route", () => {
    expect(portfolioAddPath("investment")).toBe("/portfolio?add=investment");
  });

  it("uses the canonical Portfolio href in BottomNav and HoldingsToday", () => {
    const bottomNav = readFileSync(
      path.resolve(process.cwd(), "components/home/BottomNav.tsx"),
      "utf8",
    );
    const holdings = readFileSync(
      path.resolve(process.cwd(), "components/dashboard/HoldingsToday.tsx"),
      "utf8",
    );
    const movers = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/PortfolioValueCard.tsx",
      ),
      "utf8",
    );

    expect(bottomNav).toContain("PORTFOLIO_PATH");
    expect(bottomNav).toContain("href: PORTFOLIO_PATH");
    expect(holdings).toContain("PORTFOLIO_PATH");
    expect(movers).toContain("holdingDetailPath");
    expect(movers).not.toContain("`/portfolio/${");
  });
});
