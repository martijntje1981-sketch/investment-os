import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchIdMapping,
  fetchSearch,
} from "@/lib/services/instruments/eodhdClient";
import {
  EODHD_INSTRUMENT_PROVIDER_ID,
  resetEodhdInstrumentGuardForTests,
} from "@/lib/services/instruments/eodhdQuotaGuard";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import {
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { parseProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";

vi.mock("@/lib/services/instruments/eodhdClient", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/instruments/eodhdClient")
  >();
  return {
    ...actual,
    fetchIdMapping: vi.fn(),
    fetchSearch: vi.fn(),
  };
});

describe("matchInstrument verified mappings", () => {
  beforeEach(() => {
    resetEodhdInstrumentGuardForTests();
    resetProviderCircuitForTests();
    vi.mocked(fetchIdMapping).mockReset();
    vi.mocked(fetchSearch).mockReset();
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockResolvedValue([]);
  });

  it.each([
    ["STRC", "Euronext Amsterdam", "STRC.AS"],
    ["AIFS", "Xetra", "AIFS.XETRA"],
    ["NUKL", "XETRA", "NUKL.XETRA"],
    ["VWCE", "Xetra", "VWCE.XETRA"],
    ["IB1T", "XETRA", "IB1T.XETRA"],
  ] as const)("matches %s on %s to %s without EODHD", async (ticker, exchange, providerSymbol) => {
    const resolved = await matchInstrument({
      ticker,
      exchange,
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe(providerSymbol);
    expect(resolved.confirmationSource).toBe("verified_mapping");
    expect(fetchIdMapping).not.toHaveBeenCalled();
    expect(fetchSearch).not.toHaveBeenCalled();
  });

  it("accepts direct provider symbol input", async () => {
    const resolved = await matchInstrument({
      ticker: "STRC.AS",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("STRC.AS");
    expect(resolved.confirmationSource).toBe("verified_mapping");
    expect(fetchIdMapping).not.toHaveBeenCalled();
  });

  it("still matches locally when the quote circuit is open", async () => {
    recordProviderCircuitFailure(
      EODHD_QUOTE_PROVIDER_ID,
      new Error("quote quota exhausted"),
    );
    expect(isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID)).toBe(true);

    const resolved = await matchInstrument({
      ticker: "AIFS",
      exchange: "XETRA",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("AIFS.XETRA");
    expect(fetchIdMapping).not.toHaveBeenCalled();
  });

  it("matches locally when the instrument circuit is open", async () => {
    recordProviderCircuitFailure(
      EODHD_INSTRUMENT_PROVIDER_ID,
      new Error("instrument quota exhausted"),
    );
    expect(isProviderCircuitOpen(EODHD_INSTRUMENT_PROVIDER_ID)).toBe(true);

    const resolved = await matchInstrument({
      ticker: "VWCE",
      exchange: "XETRA",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("VWCE.XETRA");
    expect(fetchIdMapping).not.toHaveBeenCalled();
  });

  it("leaves unknown instruments unresolved", async () => {
    const resolved = await matchInstrument({
      ticker: "UNKNOWN",
      exchange: "XETRA",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.matchMethod).toBe("unresolved");
  });

  it("parses supported provider symbols for client-side use", () => {
    const parsed = parseProviderSymbolInput("NUKL.XETRA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.confirmationSource).toBe("verified_mapping");
    expect(parsed.resolved.instrumentName).toContain("VanEck");
  });
});
