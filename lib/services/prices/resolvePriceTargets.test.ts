import { beforeEach, describe, expect, it, vi } from "vitest";

import { matchInstrument } from "@/lib/services/instruments";
import { resolvePriceTarget } from "@/lib/services/prices/resolvePriceTargets";

vi.mock("@/lib/services/instruments", () => ({
  matchInstrument: vi.fn(),
}));

describe("resolvePriceTarget", () => {
  beforeEach(() => {
    vi.mocked(matchInstrument).mockReset();
  });

  it("uses an existing providerSymbol without rematching", async () => {
    const target = await resolvePriceTarget({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      isin: "IE00BK5BQT80",
      name: "Vanguard FTSE All-World UCITS ETF",
      instrumentName: "Vanguard FTSE All-World UCITS ETF",
    });

    expect(matchInstrument).not.toHaveBeenCalled();
    expect(target).toEqual({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      isin: "IE00BK5BQT80",
      name: "Vanguard FTSE All-World UCITS ETF",
      currency: "EUR",
    });
  });

  it("calls matchInstrument only when providerSymbol is missing", async () => {
    vi.mocked(matchInstrument).mockResolvedValue({
      providerSymbol: "VWCE.XETRA",
      instrumentName: "Vanguard FTSE All-World UCITS ETF",
      exchange: "XETRA",
      isin: "IE00BK5BQT80",
      matchMethod: "ticker_exchange",
      confidence: 0.95,
      requiresConfirmation: false,
      warnings: [],
    });

    const target = await resolvePriceTarget({
      symbol: "VWCE",
      exchange: "XETRA",
      name: "Vanguard FTSE All-World UCITS ETF",
    });

    expect(matchInstrument).toHaveBeenCalledOnce();
    expect(target?.providerSymbol).toBe("VWCE.XETRA");
  });
});
