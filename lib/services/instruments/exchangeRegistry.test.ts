import { describe, expect, it } from "vitest";

import { buildProviderSymbol } from "@/lib/services/instruments/eodhdClient";
import {
  EXCHANGE_REGISTRY,
  isProviderPricingExchange,
  isValidPurchaseVenue,
  listUserSelectableExchanges,
  normalizePurchaseExchangeCode,
  resolveProviderPricingExchange,
} from "@/lib/services/instruments/exchangeRegistry";
import {
  exchangeResolutionMessage,
  isKnownProviderExchange,
  isRecognizedExchange,
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";
import {
  findExchangeOption,
  getCommonExchangeOptions,
  resolveExchangeInput,
  searchExchanges,
} from "@/lib/services/instruments/exchangeSearch";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import { describePricingSource } from "@/lib/services/instruments/listingConfirmation";

describe("exchange registry purchase vs provider model", () => {
  it("treats Tradegate/TDG as a recognized purchase venue only", () => {
    expect(normalizePurchaseExchangeCode("Tradegate")).toBe("TDG");
    expect(normalizeExchange("TDG")).toBe("TDG");
    expect(isValidPurchaseVenue("TDG")).toBe(true);
    expect(isRecognizedExchange("TDG")).toBe(true);
    expect(isProviderPricingExchange("TDG")).toBe(false);
    expect(isKnownProviderExchange("TDG")).toBe(false);
    expect(resolveProviderPricingExchange("TDG")).toBeNull();
    expect(resolveExchangeForMatching("TDG")).toBeNull();
    expect(exchangeResolutionMessage("TDG")).toBeNull();
  });

  it("never constructs TICKER.TDG provider symbols", () => {
    expect(() => buildProviderSymbol("PPFB", "TDG")).toThrow(
      /not a provider pricing exchange/i,
    );
    expect(() => buildProviderSymbol("PPFB", "Tradegate")).toThrow(
      /not a provider pricing exchange/i,
    );
  });

  it("resolves Tradegate verified instruments to configured provider symbols", async () => {
    const resolved = await matchInstrument({
      ticker: "4COP",
      exchange: "TDG",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("4COP.XETRA");
    expect(resolved.exchange).toBe("TDG");
    expect(resolved.pricingExchange).toBe("XETRA");
    expect(resolved.warnings ?? []).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/not a recognized exchange/i),
      ]),
    );
  });

  it("normalizes Amsterdam aliases to one canonical purchase code", () => {
    for (const alias of ["Amsterdam", "Euronext Amsterdam", "XAMS", "AS"]) {
      expect(normalizeExchange(alias)).toBe("AS");
      expect(resolveExchangeForMatching(alias)).toBe("AS");
    }
  });

  it("exposes one Amsterdam picker option without duplicates", async () => {
    const amsterdamMatches = (await searchExchanges("Amsterdam")).filter(
      (option) => option.code === "AS",
    );
    expect(amsterdamMatches).toHaveLength(1);
    expect(amsterdamMatches[0]?.label).toBe("Amsterdam (Euronext)");

    const selectable = listUserSelectableExchanges().filter(
      (entry) => entry.purchaseCode === "AS",
    );
    expect(selectable).toHaveLength(1);

    const common = getCommonExchangeOptions(20).filter(
      (option) => option.code === "AS",
    );
    expect(common).toHaveLength(1);
  });

  it("keeps Nasdaq and NYSE as distinct purchase venues with shared US pricing", () => {
    expect(normalizeExchange("Nasdaq")).toBe("NASDAQ");
    expect(normalizeExchange("NYSE")).toBe("NYSE");
    expect(normalizeExchange("NASDAQ")).not.toBe(normalizeExchange("NYSE"));

    expect(resolveExchangeForMatching("Nasdaq")).toBe("US");
    expect(resolveExchangeForMatching("NYSE")).toBe("US");

    expect(findExchangeOption("Nasdaq")).toEqual({
      code: "NASDAQ",
      label: "Nasdaq",
      marketGroup: "United States",
    });
    expect(findExchangeOption("NYSE")).toEqual({
      code: "NYSE",
      label: "NYSE",
      marketGroup: "United States",
    });
  });

  it("still warns for unknown exchanges", () => {
    expect(exchangeResolutionMessage("NOTREAL")).toMatch(
      /not a recognized exchange/i,
    );
    expect(resolveExchangeInput("NOTREAL").exact).toBeNull();
  });

  it("preserves existing Xetra, Amsterdam and US provider matching paths", () => {
    expect(resolveExchangeForMatching("Xetra")).toBe("XETRA");
    expect(resolveExchangeForMatching("Frankfurt")).toBe("XETRA");
    expect(resolveExchangeForMatching("AS")).toBe("AS");
    expect(resolveExchangeForMatching("US")).toBe("US");
    expect(buildProviderSymbol("VWCE", "XETRA")).toBe("VWCE.XETRA");
    expect(buildProviderSymbol("STRC", "AS")).toBe("STRC.AS");
    expect(buildProviderSymbol("NVDA", "US")).toBe("NVDA.US");
    expect(buildProviderSymbol("NVDA", "Nasdaq")).toBe("NVDA.US");
  });

  it("describes purchase venue and price source separately when alternate pricing exists", () => {
    expect(
      describePricingSource({
        exchange: "TDG",
        pricingExchange: "XETRA",
        providerSymbol: "4COP.XETRA",
      }),
    ).toBe("Purchased on: Tradegate. Price source: Xetra (4COP.XETRA).");
  });

  it("keeps registry entries free of duplicate purchase codes", () => {
    const codes = EXCHANGE_REGISTRY.map((entry) => entry.purchaseCode);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
