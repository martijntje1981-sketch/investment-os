import { describe, expect, it } from "vitest";

import {
  lookupInstrumentResearchProfile,
  lookupInstrumentResearchProfileBySymbol,
} from "@/lib/services/discover/instrumentResearchMetadata";
import { resolveExchangeFallbackQuoteCurrency } from "@/lib/services/instruments/exchangeQuoteCurrencyFallback";

describe("VUSA.AS research profile", () => {
  it("looks up the Amsterdam listing by provider symbol before ticker fallback", () => {
    const amsterdam = lookupInstrumentResearchProfile("VUSA.AS");
    expect(amsterdam?.providerSymbol).toBe("VUSA.AS");
    expect(amsterdam?.assetClass).toBe("equity_etf");
    expect(amsterdam?.fundCategory).toMatch(/S&P 500/i);

    const london = lookupInstrumentResearchProfile("VUSA.LSE");
    expect(london?.providerSymbol).toBe("VUSA.LSE");
    expect(london?.assetClass).toBe("equity_etf");

    expect(lookupInstrumentResearchProfileBySymbol("VUSA")?.providerSymbol).toBe(
      "VUSA.LSE",
    );
  });

  it("does not add a generic Amsterdam exchange quote-currency fallback", () => {
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();
    expect(resolveExchangeFallbackQuoteCurrency("AMS")).toBeNull();
  });
});
