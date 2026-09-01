import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { applyCanonicalCryptoQuotesForNav } from "@/lib/services/goalPace/applyCanonicalCryptoQuotesForNav";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function cryptoHolding(): StoredPortfolioHolding {
  return {
    id: "h-btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    purchasePrice: 1,
    currentPrice: 0,
    currency: "EUR",
    assetType: "crypto",
  };
}

describe("applyCanonicalCryptoQuotesForNav", () => {
  it("does not import PriceService, EODHD or FX", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "lib/services/goalPace/applyCanonicalCryptoQuotesForNav.ts"),
      "utf8",
    );
    expect(source).not.toContain("loadPricesForHoldings");
    expect(source).not.toContain("eodhdMarketDataProvider");
    expect(source).not.toContain("getFxRates");
    expect(source).not.toContain("executeEodhdApiCall");
  });

  it("ignores stale or untimestamped crypto quotes", () => {
    const holding = cryptoHolding();
    const [ignored] = applyCanonicalCryptoQuotesForNav({
      userId: "user-a",
      holdings: [holding],
      quotes: [
        {
          holding_id: "h-btc",
          user_id: "user-a",
          canonical_eur_unit_price: 100,
          canonical_priced_at: "2026-09-01T14:00:00.000Z",
          data_status: "stale",
          quote_updated_at: "2026-09-01T14:00:00.000Z",
          fetched_at: "2026-09-01T14:00:00.000Z",
        },
      ],
    });
    expect(ignored?.currentPrice).toBe(0);
  });
});
