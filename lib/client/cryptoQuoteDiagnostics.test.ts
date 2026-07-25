import { describe, expect, it } from "vitest";

import { buildCryptoQuoteApplicationDiagnostic } from "@/lib/client/cryptoQuoteDiagnostics";
import { diagnoseQuoteCompatibility } from "@/lib/client/cryptoQuoteCompatibility";

describe("cryptoQuoteDiagnostics", () => {
  it("reports pair mismatch without personal fields", () => {
    const diagnostic = buildCryptoQuoteApplicationDiagnostic(
      {
        assetType: "crypto",
        symbol: "BTC",
        providerSymbol: "BTC-USD.CC",
        pairCurrency: "USD",
        tradingPair: "BTC/USD",
      },
      {
        symbol: "BTC",
        assetType: "crypto",
        normalizedPair: "BTC/EUR",
        pairPrice: 90_000,
        priceEur: 90_000,
        currentPrice: 90_000,
        provider: "eodhd-quotes",
      },
    );

    expect(diagnostic.result).toBe("rejected");
    expect(diagnostic.rejectionReason).toBe(
      diagnoseQuoteCompatibility(
        {
          assetType: "crypto",
          symbol: "BTC",
          providerSymbol: "BTC-USD.CC",
          pairCurrency: "USD",
          tradingPair: "BTC/USD",
        },
        {
          symbol: "BTC",
          assetType: "crypto",
          normalizedPair: "BTC/EUR",
          pairPrice: 90_000,
          priceEur: 90_000,
          currentPrice: 90_000,
        },
      ).reason,
    );
    expect(JSON.stringify(diagnostic)).not.toMatch(/quantity|email|token|0\.42/i);
  });
});
