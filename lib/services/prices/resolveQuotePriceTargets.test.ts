import { beforeEach, describe, expect, it, vi } from "vitest";

import { matchInstrument } from "@/lib/services/instruments";
import {
  resolveQuotePriceTarget,
  resolveQuotePriceTargets,
} from "@/lib/services/prices/resolvePriceTargets";

vi.mock("@/lib/services/instruments", () => ({
  matchInstrument: vi.fn(),
}));

describe("resolveQuotePriceTargets", () => {
  beforeEach(() => {
    vi.mocked(matchInstrument).mockReset();
  });

  it("never calls matchInstrument for quote resolution", () => {
    const { targets, errors } = resolveQuotePriceTargets([
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        isin: "IE00BK5BQT80",
        name: "Vanguard FTSE All-World UCITS ETF",
      },
    ]);

    expect(matchInstrument).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("VWCE.XETRA");
  });

  it("skips holdings without providerSymbol and records an error", () => {
    const { targets, errors } = resolveQuotePriceTargets([
      {
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
      },
    ]);

    expect(matchInstrument).not.toHaveBeenCalled();
    expect(targets).toEqual([]);
    expect(errors[0]).toMatch(/missing confirmed providerSymbol/i);
  });

  it("filters to onlyProviderSymbols when supplied", () => {
    const { targets } = resolveQuotePriceTargets(
      [
        {
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          name: "VWCE",
        },
        {
          symbol: "AAPL",
          providerSymbol: "AAPL.US",
          name: "Apple",
        },
      ],
      { onlyProviderSymbols: ["AAPL.US"] },
    );

    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("AAPL.US");
  });

  it("resolveQuotePriceTarget preserves confirmed providerSymbol", () => {
    const target = resolveQuotePriceTarget({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      name: "VWCE",
    });

    expect(target?.providerSymbol).toBe("VWCE.XETRA");
  });
});
