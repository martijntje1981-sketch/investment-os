import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchIdMapping,
  fetchSearch,
} from "@/lib/services/instruments/eodhdClient";
import { resetEodhdQuotaGuardForTests } from "@/lib/services/instruments/eodhdQuotaGuard";
import {
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";

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

describe("exchange normalization for matching", () => {
  it("maps EPA MIC code to Euronext Paris provider exchange PA", () => {
    expect(normalizeExchange("EPA")).toBe("PA");
    expect(resolveExchangeForMatching("EPA")).toBe("PA");
  });

  it("rejects unknown exchange codes", () => {
    expect(resolveExchangeForMatching("CUSTOM")).toBeNull();
  });
});

describe("matchInstrument exchange resolution", () => {
  beforeEach(() => {
    resetEodhdQuotaGuardForTests();
    vi.mocked(fetchIdMapping).mockReset();
    vi.mocked(fetchSearch).mockReset();
  });

  it("resolves ticker on EPA exchange to a providerSymbol", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "STRC",
        Exchange: "PA",
        Name: "Strategy NV",
        ISIN: "NL0015001K93",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "STRC",
      exchange: "EPA",
      instrumentName: "Strategy NV",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("STRC.PA");
    expect(resolved.exchange).toBe("PA");
    expect(resolved.matchMethod).toBe("ticker_exchange");
  });

  it("returns listing candidates when ticker and exchange do not resolve", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "NUKL",
        Exchange: "XETRA",
        Name: "VanEck ETF",
        ISIN: "IE000M7V94E1",
      },
      {
        Code: "NUKL",
        Exchange: "AS",
        Name: "VanEck ETF",
        ISIN: "IE000M7V94E1",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "NUKL",
      exchange: "PA",
      instrumentName: "VanEck ETF",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.candidates?.length).toBeGreaterThan(0);
    expect(resolved.warnings[0]).toMatch(/No listing found/i);
  });
});
