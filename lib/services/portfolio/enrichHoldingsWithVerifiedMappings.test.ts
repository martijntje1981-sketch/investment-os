import { describe, expect, it } from "vitest";

import {
  enrichHoldingWithVerifiedMapping,
  enrichHoldingsWithVerifiedMappings,
  holdingsChangedByVerifiedEnrichment,
} from "@/lib/services/portfolio/enrichHoldingsWithVerifiedMappings";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function manualHolding(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "holding-1",
    symbol: "STRC",
    name: "Strategy ETP",
    quantity: 10,
    purchasePrice: 15,
    currentPrice: 0,
    currency: "EUR",
    assetType: "investment",
    isin: null,
    exchange: "Amsterdam",
    providerSymbol: null,
    confirmationSource: "manual_entry",
    ...overrides,
  };
}

describe("enrichHoldingsWithVerifiedMappings", () => {
  it("enriches existing manual holdings with providerSymbol", () => {
    const enriched = enrichHoldingWithVerifiedMapping(manualHolding());
    expect(enriched.providerSymbol).toBe("STRC.AS");
    expect(enriched.exchange).toBe("AS");
    expect(enriched.confirmationSource).toBe("verified_mapping");
    expect(enriched.quantity).toBe(10);
    expect(enriched.purchasePrice).toBe(15);
  });

  it("is idempotent and does not duplicate holdings", () => {
    const once = enrichHoldingsWithVerifiedMappings([manualHolding()]);
    const twice = enrichHoldingsWithVerifiedMappings(once);
    expect(twice).toHaveLength(1);
    expect(twice[0]?.providerSymbol).toBe("STRC.AS");
    expect(holdingsChangedByVerifiedEnrichment(once, twice)).toBe(false);
  });

  it("skips holdings that already have providerSymbol", () => {
    const existing = manualHolding({
      providerSymbol: "VWCE.XETRA",
      exchange: "XETRA",
      symbol: "VWCE",
    });
    const enriched = enrichHoldingWithVerifiedMapping(existing);
    expect(enriched).toEqual(existing);
  });

  it("does not enrich unknown instruments", () => {
    const unknown = manualHolding({
      symbol: "UNKNOWN",
      exchange: "XETRA",
    });
    const enriched = enrichHoldingWithVerifiedMapping(unknown);
    expect(enriched.providerSymbol).toBeNull();
    expect(enriched.confirmationSource).toBe("manual_entry");
  });

  it("enriches 4COP on Tradegate with Xetra pricing and preserved TDG exchange", () => {
    const enriched = enrichHoldingWithVerifiedMapping(
      manualHolding({
        symbol: "4COP",
        name: "Global X Copper Miners UCITS ETF",
        exchange: "Tradegate",
        isin: "IE0003Z9E2Y3",
      }),
    );

    expect(enriched.providerSymbol).toBe("4COP.XETRA");
    expect(enriched.exchange).toBe("TDG");
    expect(enriched.pricingExchange).toBe("XETRA");
    expect(enriched.confirmationSource).toBe("verified_mapping");
  });
});
