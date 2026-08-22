import { describe, expect, it } from "vitest";

import {
  looksLikeProviderSymbolInput,
  parseProviderSymbolInput,
} from "@/lib/services/instruments/providerSymbolInput";

describe("providerSymbolInput", () => {
  it("detects full provider symbol input", () => {
    expect(looksLikeProviderSymbolInput("VWCE.XETRA")).toBe(true);
    expect(looksLikeProviderSymbolInput("VWCE")).toBe(false);
    expect(looksLikeProviderSymbolInput("")).toBe(false);
  });

  it("parses and validates VWCE.XETRA", () => {
    const parsed = parseProviderSymbolInput("VWCE.XETRA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.providerSymbol).toBe("VWCE.XETRA");
    expect(parsed.ticker).toBe("VWCE");
    expect(parsed.exchange).toBe("XETRA");
    expect(parsed.confirmationSource).toBe("verified_mapping");
    expect(parsed.resolved.providerSymbol).toBe("VWCE.XETRA");
  });

  it("rejects unknown exchange codes in provider symbols", () => {
    const parsed = parseProviderSymbolInput("VWCE.UNKNOWN");
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.message).toMatch(/exchange/i);
  });

  it("does not treat plain tickers as provider symbols", () => {
    const parsed = parseProviderSymbolInput("VWCE");
    expect(parsed.ok).toBe(false);
  });
});
