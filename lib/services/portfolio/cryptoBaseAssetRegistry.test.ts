import { describe, expect, it } from "vitest";

import {
  isLivePricedCryptoBaseAsset,
  isValidCryptoBaseAssetSymbol,
  listLivePricedCryptoBaseAssets,
  normalizeCryptoBaseAssetSymbol,
  recognizeKnownCrypto,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";

describe("cryptoBaseAssetRegistry", () => {
  it("includes XRP for live pricing", () => {
    expect(isLivePricedCryptoBaseAsset("XRP")).toBe(true);
    expect(recognizeKnownCrypto({ symbol: "XRP" })).toEqual({
      name: "XRP",
      symbol: "XRP",
    });
  });

  it("keeps BTC, ETH and SOL live priced", () => {
    expect(isLivePricedCryptoBaseAsset("BTC")).toBe(true);
    expect(isLivePricedCryptoBaseAsset("ETH")).toBe(true);
    expect(isLivePricedCryptoBaseAsset("SOL")).toBe(true);
  });

  it("maps BTC alias XBT to canonical BTC", () => {
    expect(normalizeCryptoBaseAssetSymbol("XBT")).toBe("BTC");
    expect(recognizeKnownCrypto({ symbol: "XBT" })).toEqual({
      name: "Bitcoin",
      symbol: "BTC",
    });
  });

  it("rejects invalid ticker shapes", () => {
    expect(isValidCryptoBaseAssetSymbol("")).toBe(false);
    expect(isValidCryptoBaseAssetSymbol("BAD COIN")).toBe(false);
    expect(
      isValidCryptoBaseAssetSymbol("WAYTOOLONGSYMBOLWAYTOOLONGSYMBOLWAYTOOLONG"),
    ).toBe(false);
  });

  it("preserves non-letter ticker characters when syntactically valid", () => {
    expect(isValidCryptoBaseAssetSymbol("1000SHIB")).toBe(true);
    expect(normalizeCryptoBaseAssetSymbol("1000SHIB")).toBe("1000SHIB");
  });

  it("allows unknown but syntactically valid symbols to save without live pricing", () => {
    expect(isValidCryptoBaseAssetSymbol("MYST")).toBe(true);
    expect(isLivePricedCryptoBaseAsset("MYST")).toBe(false);
    expect(normalizeCryptoBaseAssetSymbol("MYST")).toBe("MYST");
  });

  it("exposes a data-driven live-pricing registry", () => {
    const symbols = listLivePricedCryptoBaseAssets().map((entry) => entry.symbol);
    expect(symbols).toEqual(
      expect.arrayContaining(["BTC", "ETH", "SOL", "XRP", "ADA", "DOGE"]),
    );
  });
});
