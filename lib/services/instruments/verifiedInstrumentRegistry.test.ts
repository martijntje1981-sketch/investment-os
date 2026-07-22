import { describe, expect, it } from "vitest";

import {
  lookupVerifiedByIsin,
  lookupVerifiedByProviderSymbol,
  lookupVerifiedByTickerExchange,
  verifiedEntryToResolved,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";

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
});
