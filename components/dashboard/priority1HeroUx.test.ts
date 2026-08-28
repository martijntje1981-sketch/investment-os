/**
 * Priority 1 — first impression hero / pulse / demo entry contracts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  formatMarketCloseWeekdayPossessive,
  formatPortfolioMovePeriodContextLine,
  resolvePortfolioMovePeriod,
} from "@/lib/client/performancePeriod";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  partial: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const { symbol, ...rest } = partial;
  return {
    id: rest.id ?? `id-${symbol}`,
    symbol,
    name: rest.name ?? symbol,
    quantity: rest.quantity ?? 1,
    purchasePrice: rest.purchasePrice ?? 100,
    currentPrice: rest.currentPrice ?? 100,
    currency: "EUR",
    assetType: rest.assetType ?? "investment",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...rest,
  };
}

describe("Priority 1 dashboard hero", () => {
  it("uses a shared premium-blue hero shell for Dashboard and other page heroes", () => {
    const surface = read("components/layout/appSurface.ts");
    const hero = read("components/dashboard/PortfolioValueCard.tsx");
    const dashboard = read("app/dashboard/page.tsx");
    const globals = read("app/globals.css");

    expect(surface).toContain("from-hero-premium-from");
    expect(surface).toContain("via-hero-premium-via");
    expect(surface).toContain("to-hero-premium-to");
    expect(surface).toContain("appDashboardHeroShellClass");
    expect(surface).not.toContain("appDashboardHeroShellClass = appHeroShellClass");
    expect(globals).toContain("--hero-premium-from:");
    expect(globals).toContain("--navy-hero: #0b1f3a");
    expect(hero).toContain("appDashboardHeroShellClass");
    expect(hero).toContain("HeroPortfolioPulse");
    expect(hero).toContain("Biggest mover");
    expect(hero).toContain("holdingDetailPath");
    expect(hero).toContain("prefetch");
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).not.toContain("DashboardPortfolioPulseCard");
  });

  it("labels exchange moves as previous market close, not live", () => {
    const asOf = Date.parse("2026-07-26T12:00:00.000Z");
    const period = resolvePortfolioMovePeriod(
      [
        holding({
          symbol: "VWCE",
          marketPriceUpdatedAt: "2026-07-24",
        }),
      ],
      asOf,
    );
    expect(period.kind).toBe("last_session");
    expect(period.providerSessionKey).toBe("2026-07-24");
    expect(formatMarketCloseWeekdayPossessive("2026-07-24")).toBe("Friday's");
    expect(formatPortfolioMovePeriodContextLine(period)).toBe(
      "Based on Friday's market close",
    );
  });
});

describe("Priority 1 demo vs trial entry", () => {
  it("keeps trial primary and demo secondary without reseeding", () => {
    const landing = read("app/page.tsx");
    const explore = read("app/explore/page.tsx");
    const callback = read("app/auth/callback/route.ts");
    const header = read("components/marketing/MarketingHeader.tsx");

    expect(landing).toContain("Start with 14 days of Complete");
    expect(landing).toContain("Explore Demo Portfolio");
    expect(landing).toContain("/signup?intent=trial");
    expect(explore).toContain("Start with 14 days of Complete");
    expect(explore).toContain("Demo Portfolio");
    expect(explore).toContain("/signup?intent=trial");
    expect(header).toContain("Start with Complete");
    expect(header).toContain("/signup?intent=trial");
    expect(callback).toContain("seedHoldings: wantsDemoPortfolio");
    expect(callback).toContain("wantsPersonalTrial");
  });
});

describe("Priority 1 portfolio mobile list", () => {
  it("removes forced horizontal scroll width on holdings", () => {
    const portfolio = read("app/portfolio/page.tsx");
    expect(portfolio).not.toContain("min-w-[720px]");
    expect(portfolio).toContain("overflow-x-clip");
    expect(portfolio).toContain("lg:hidden");
    expect(portfolio).toContain("Gain / loss");
  });
});
