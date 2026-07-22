import { afterEach, describe, expect, it, vi } from "vitest";

import {
  __getDiscoverInFlightCountForTests,
  __resetDiscoverSnapshotStoreForTests,
  getDiscoverSnapshot,
} from "@/lib/client/discoverSnapshot";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(symbol: string): StoredPortfolioHolding {
  return {
    id: `${symbol}-id`,
    symbol,
    name: symbol,
    quantity: 1,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    assetType: "investment",
    providerSymbol: `${symbol}.XETRA`,
  };
}

describe("discoverSnapshot client cache", () => {
  afterEach(() => {
    __resetDiscoverSnapshotStoreForTests();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("deduplicates simultaneous snapshot builds", async () => {
    const request = {
      userSub: "user-1",
      holdings: [holding("VWCE")],
      goal: null,
    };

    const [first, second] = await Promise.all([
      getDiscoverSnapshot(request),
      getDiscoverSnapshot(request),
    ]);

    expect(first.portfolioFingerprint).toBe(second.portfolioFingerprint);
    expect(__getDiscoverInFlightCountForTests()).toBe(0);
  });

  it("changes fingerprint when holdings change", async () => {
    const first = await getDiscoverSnapshot({
      userSub: "user-1",
      holdings: [holding("VWCE")],
      goal: null,
    });
    const second = await getDiscoverSnapshot({
      userSub: "user-1",
      holdings: [holding("NUKL")],
      goal: null,
    });

    expect(first.portfolioFingerprint).not.toBe(second.portfolioFingerprint);
  });
});

describe("discover UI integration", () => {
  it("exposes a dedicated discover route without bottom-nav duplication", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");

    const discoverPage = readFileSync(
      resolve(process.cwd(), "app/discover/page.tsx"),
      "utf8",
    );
    const home = readFileSync(
      resolve(process.cwd(), "components/home/AuthenticatedHomePage.tsx"),
      "utf8",
    );
    const dashboard = readFileSync(
      resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );

    expect(discoverPage).toContain("ThingsYouMayHaveMissedSection");
    expect(discoverPage).not.toContain("BottomNavigation");
    expect(home).toContain("DiscoverMissedTeaser");
    expect(home).toContain("buildDiscoverSnapshot");
    expect(home).not.toContain("useInvestmentIntelligence");
    expect(dashboard).toContain("useDiscoverSnapshot");
    expect(discoverPage).not.toMatch(/innerWidth|matchMedia|useMediaQuery/);
  });
});
