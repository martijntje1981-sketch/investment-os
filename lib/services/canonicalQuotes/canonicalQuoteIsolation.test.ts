import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(path.join(repoRoot, rel), "utf8");
}

const liveSurfaces = [
  "app/api/portfolio/nav-snapshot/route.ts",
  "app/api/portfolio/route.ts",
  "lib/services/goalPace/evaluateNavSnapshotCapture.ts",
  "lib/services/goalPace/trustedNavSnapshotCapture.ts",
  "lib/services/portfolio/mappers.ts",
  "lib/client/holdingDisplayPrice.ts",
  "lib/client/portfolioPricing.ts",
  "lib/client/useUserPortfolio.ts",
  "lib/client/useLivePortfolioPriceRefresh.ts",
  "lib/client/baseCurrencyDisplay.tsx",
  "lib/client/portfolioExport.ts",
  "lib/services/holdings/fetchHoldingPriceHistory.ts",
  "app/dashboard/page.tsx",
  "app/portfolio/page.tsx",
  "app/page.tsx",
  "app/login/page.tsx",
];

describe("C1 canonical quote isolation", () => {
  it("is not imported by NAV capture, overlay, export, history or UI", () => {
    for (const rel of liveSurfaces) {
      const source = read(rel);
      expect(source, rel).not.toContain("holding_canonical_quotes");
      expect(source, rel).not.toContain("persistCanonicalCryptoQuote");
      expect(source, rel).not.toContain("@/lib/services/canonicalQuotes");
    }
  });

  it("lets POST /api/prices persist without reading the table or changing listed last_market_price", () => {
    const route = read("app/api/prices/route.ts");
    expect(route).toContain("persistCanonicalCryptoQuotesAfterPrices");
    expect(route).not.toContain("holding_canonical_quotes");
    expect(route).not.toContain("createAdminClient");
    expect(route).not.toContain("last_market_price");
  });

  it("limits canonical quote reads to the trusted NAV snapshot writer", () => {
    const capture = read("lib/services/goalPace/capturePortfolioNavSnapshot.ts");
    const evaluate = read("lib/services/goalPace/evaluateNavSnapshotCapture.ts");
    const trusted = read("lib/services/goalPace/trustedNavSnapshotCapture.ts");
    expect(capture).toContain("HOLDING_CANONICAL_QUOTES_TABLE");
    expect(capture).toContain("applyCanonicalCryptoQuotesForNav");
    expect(capture).toContain("last_market_price");
    expect(evaluate).not.toContain("holding_canonical_quotes");
    expect(evaluate).toContain("holdingsForCanonicalNav");
    expect(trusted).not.toContain("holding_canonical_quotes");
    expect(trusted).not.toContain("HOLDING_CANONICAL_QUOTES_TABLE");
  });

  it("does not change listed last_market_price write or mapper contracts", () => {
    const mappers = read("lib/services/portfolio/mappers.ts");
    expect(mappers).toContain("isCryptoHolding(holding)");
    expect(mappers).toContain("last_market_price: price");
    expect(mappers).toMatch(/if \(row\.asset_type === "crypto"\) \{[\s\S]*currentPrice: 0/);

    const listedPriceMigration = read(
      "supabase/migrations/20260720110000_phase2_holding_market_price.sql",
    );
    expect(listedPriceMigration).toMatch(
      /Last known valid EUR market price synced from the client/,
    );
  });

  it("leaves crypto overlay and 24h pair move on the client path", () => {
    const display = read("lib/client/holdingDisplayPrice.ts");
    expect(display).toContain("currentPairPrice");
    expect(display).toContain("resolveCryptoDisplayPrice");

    const overlay = read("lib/client/portfolioPricing.ts");
    expect(overlay).toContain("change24hPercent");
    expect(overlay).not.toContain("persistCanonicalCryptoQuote");
  });
});
