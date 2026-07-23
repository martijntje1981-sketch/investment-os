import { describe, expect, it } from "vitest";

import {
  classifyProviderSymbolRegion,
  filterProviderSymbolsForSnapshotSlot,
  estimateFxProviderCalls,
} from "@/lib/services/marketSnapshot/snapshotSymbolFilter";

describe("snapshotSymbolFilter", () => {
  it("classifies common EU and US listings", () => {
    expect(classifyProviderSymbolRegion("VWCE.XETRA")).toBe("eu");
    expect(classifyProviderSymbolRegion("STRC.AS")).toBe("eu");
    expect(classifyProviderSymbolRegion("AAPL.US")).toBe("us");
    expect(classifyProviderSymbolRegion("BTC-USD.CC")).toBe("crypto");
  });

  it("filters EU open symbols without US listings", () => {
    const symbols = ["VWCE.XETRA", "STRC.AS", "AAPL.US", "BTC-USD.CC"];
    expect(filterProviderSymbolsForSnapshotSlot(symbols, "eu_open")).toEqual([
      "VWCE.XETRA",
      "STRC.AS",
      "BTC-USD.CC",
    ]);
  });

  it("filters US open symbols without EU listings", () => {
    const symbols = ["VWCE.XETRA", "STRC.AS", "AAPL.US", "BTC-USD.CC"];
    expect(filterProviderSymbolsForSnapshotSlot(symbols, "us_open")).toEqual([
      "AAPL.US",
      "BTC-USD.CC",
    ]);
  });

  it("requires no FX calls for EUR-only EU symbols", () => {
    expect(estimateFxProviderCalls(["VWCE.XETRA", "STRC.AS"])).toBe(0);
  });

  it("requires USD FX for US symbols", () => {
    expect(estimateFxProviderCalls(["AAPL.US"])).toBe(1);
  });
});
