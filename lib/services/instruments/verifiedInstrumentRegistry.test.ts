import { describe, expect, it } from "vitest";

import {
  lookupVerifiedByIsin,
  lookupVerifiedByProviderSymbol,
  lookupVerifiedByTickerExchange,
  lookupVerifiedByTickerPurchaseExchange,
  resolveVerifiedInstrument,
  verifiedEntryToResolved,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { resolveQuotePriceTarget } from "@/lib/services/prices/resolvePriceTargets";
import { describePricingSource } from "@/lib/services/instruments/listingConfirmation";

describe("verifiedInstrumentRegistry", () => {
  it.each([
    ["STRC", "Euronext Amsterdam", "STRC.AS"],
    ["STRC", "Amsterdam", "STRC.AS"],
    ["STRC", "AS", "STRC.AS"],
    ["AIFS", "Xetra", "AIFS.XETRA"],
    ["AIFS", "XETRA", "AIFS.XETRA"],
    ["NUKL", "xetra", "NUKL.XETRA"],
    ["VWCE", "Frankfurt", "VWCE.XETRA"],
    ["IB1T", "XETRA", "IB1T.XETRA"],
  ] as const)("maps %s + %s to %s", (ticker, exchange, providerSymbol) => {
    const entry = lookupVerifiedByTickerExchange(ticker, exchange);
    expect(entry?.providerSymbol).toBe(providerSymbol);
  });

  it("looks up by ISIN with exchange disambiguation", () => {
    expect(lookupVerifiedByIsin("NL0015001K93", "Amsterdam")?.providerSymbol).toBe(
      "STRC.AS",
    );
    expect(lookupVerifiedByIsin("IE00BK5BQT80", "XETRA")?.providerSymbol).toBe(
      "VWCE.XETRA",
    );
  });

  it("recognizes direct provider symbols case-insensitively", () => {
    expect(lookupVerifiedByProviderSymbol("aifs.xetra")?.ticker).toBe("AIFS");
    expect(lookupVerifiedByProviderSymbol("STRC.AS")?.exchange).toBe("AS");
  });

  it("returns null for unknown instruments", () => {
    expect(lookupVerifiedByTickerExchange("UNKNOWN", "XETRA")).toBeNull();
    expect(lookupVerifiedByProviderSymbol("FAKE.XETRA")).toBeNull();
  });

  it("builds matched resolved instruments with verified_mapping source", () => {
    const entry = lookupVerifiedByTickerExchange("VWCE", "XETRA");
    expect(entry).not.toBeNull();
    const resolved = verifiedEntryToResolved(entry!);
    expect(resolved.providerSymbol).toBe("VWCE.XETRA");
    expect(resolved.confirmationSource).toBe("verified_mapping");
    expect(resolved.requiresConfirmation).toBe(false);
  });

  it("maps 4COP on Tradegate to Xetra pricing while preserving TDG purchase context", () => {
    const purchaseMatch = lookupVerifiedByTickerPurchaseExchange("4COP", "Tradegate");
    expect(purchaseMatch?.entry.providerSymbol).toBe("4COP.XETRA");
    expect(purchaseMatch?.purchaseExchange).toBe("TDG");

    const resolved = verifiedEntryToResolved(purchaseMatch!.entry, "ticker_exchange", {
      purchaseExchange: purchaseMatch!.purchaseExchange,
    });

    expect(resolved.providerSymbol).toBe("4COP.XETRA");
    expect(resolved.exchange).toBe("TDG");
    expect(resolved.pricingExchange).toBe("XETRA");
    expect(resolved.isin).toBe("IE0003Z9E2Y3");
    expect(describePricingSource(resolved)).toMatch(/Live prices use the Xetra listing/i);
  });

  it("resolves 4COP by ISIN with Tradegate purchase exchange", () => {
    const resolution = resolveVerifiedInstrument({
      ticker: "4COP",
      isin: "IE0003Z9E2Y3",
      exchange: "TDG",
    });

    expect(resolution?.entry.providerSymbol).toBe("4COP.XETRA");
    expect(resolution?.purchaseExchange).toBe("TDG");
  });

  it("resolves 4COP Tradegate holdings to Xetra quote targets", () => {
    const target = resolveQuotePriceTarget({
      symbol: "4COP",
      providerSymbol: "4COP.XETRA",
      exchange: "TDG",
      isin: "IE0003Z9E2Y3",
      name: "Global X Copper Miners UCITS ETF",
    });

    expect(target?.providerSymbol).toBe("4COP.XETRA");
    expect(target?.symbol).toBe("4COP");
  });
});
