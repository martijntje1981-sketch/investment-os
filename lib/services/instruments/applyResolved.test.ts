import { describe, expect, it } from "vitest";

import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import type { ResolvedInstrument } from "@/lib/types/instrument";

describe("applyResolvedToHolding purchase vs pricing", () => {
  const pricingListing: ResolvedInstrument = {
    providerSymbol: "PPFB.XETRA",
    instrumentName: "WisdomTree Physical Gold",
    exchange: "XETRA",
    isin: null,
    quoteCurrency: "EUR",
    matchMethod: "isin",
    confidence: 0.95,
    requiresConfirmation: false,
    warnings: [],
  };

  it("does not replace Tradegate purchase exchange with Xetra", () => {
    const next = applyResolvedToHolding(
      {
        symbol: "PPFB",
        name: "Gold",
        exchange: "TDG",
        pricingExchange: null as string | null,
        providerSymbol: null as string | null,
      },
      pricingListing,
    );

    expect(next.exchange).toBe("TDG");
    expect(next.pricingExchange).toBe("XETRA");
    expect(next.providerSymbol).toBe("PPFB.XETRA");
  });

  it("keeps verified purchase + pricing fields when already split", () => {
    const next = applyResolvedToHolding(
      {
        symbol: "4COP",
        name: "",
        exchange: "TDG",
        pricingExchange: null as string | null,
        providerSymbol: null as string | null,
      },
      {
        ...pricingListing,
        providerSymbol: "4COP.XETRA",
        instrumentName: "Copper ETF",
        exchange: "TDG",
        pricingExchange: "XETRA",
        confirmationSource: "verified_mapping",
      },
    );

    expect(next.exchange).toBe("TDG");
    expect(next.pricingExchange).toBe("XETRA");
    expect(next.providerSymbol).toBe("4COP.XETRA");
  });

  it("replaces a ticker-only name with the matched instrument name", () => {
    const next = applyResolvedToHolding(
      {
        symbol: "EUNA",
        name: "EUNA",
        exchange: "XETRA",
        pricingExchange: null as string | null,
        providerSymbol: null as string | null,
      },
      {
        providerSymbol: "EUNA.XETRA",
        instrumentName:
          "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
        exchange: "XETRA",
        isin: "IE00BDBRDM35",
        quoteCurrency: "EUR",
        matchMethod: "ticker_exchange",
        confidence: 0.95,
        requiresConfirmation: false,
        warnings: [],
        providerInstrumentType: "ETF",
      },
    );

    expect(next.name).toBe(
      "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
    );
    expect(next.instrumentName).toBe(
      "iShares Core Global Aggregate Bond UCITS ETF EUR Hedged (Acc)",
    );
  });
});
