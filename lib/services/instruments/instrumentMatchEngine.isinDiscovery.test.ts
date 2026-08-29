import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchIdMapping,
  fetchSearch,
} from "@/lib/services/instruments/eodhdClient";
import { resetEodhdQuotaGuardForTests } from "@/lib/services/instruments/eodhdQuotaGuard";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import {
  applySelectedListing,
  buildListingCandidates,
} from "@/lib/services/instruments/listingConfirmation";
import { parseProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { resolveQuotePriceTarget } from "@/lib/services/prices/resolvePriceTargets";

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

const CH_ISIN = "CH1528107811";
const VUSA_ISIN = "IE00B3XXRP09";
const US_STRC_ISIN = "US5949728530";

const parisListing = {
  Code: "STRC",
  Exchange: "PA",
  Name: "21Shares Strategy Yield ETP",
  ISIN: CH_ISIN,
  Currency: "EUR",
  Type: "ETF",
};

const amsterdamEtp = {
  Code: "STRC",
  Exchange: "AS",
  Name: "21Shares Strategy Yield ETP",
  ISIN: CH_ISIN,
  Currency: "USD",
  Type: "ETF",
};

const xetraLocalTicker = {
  Code: "21ST",
  Exchange: "XETRA",
  Name: "21Shares Strategy Yield ETP",
  ISIN: CH_ISIN,
  Currency: "EUR",
  Type: "ETF",
};

const usPreferred = {
  Code: "STRC",
  Exchange: "US",
  Name: "MicroStrategy Incorporated Variable Rate Series A Perpetual Stretch Preferred Stock",
  ISIN: US_STRC_ISIN,
  Currency: "USD",
  Type: "Preferred Stock",
};

const amsterdamSearchWithoutIsin = {
  Code: "STRC",
  Exchange: "AS",
  Name: "21shares Strategy Yield ETP",
  ISIN: null as string | null,
  Currency: "USD",
  Type: "ETF",
};

describe("ISIN-first listing discovery", () => {
  beforeEach(() => {
    resetEodhdQuotaGuardForTests();
    vi.mocked(fetchIdMapping).mockReset();
    vi.mocked(fetchSearch).mockReset();
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockResolvedValue([]);
  });

  it("discovers the Paris listing for STRC + CH1528107811 and never offers US STRC", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockImplementation(async (query, options) => {
      if (query === CH_ISIN) {
        return [parisListing, amsterdamEtp, xetraLocalTicker];
      }
      if (query === "STRC" && !options?.exchange) {
        return [usPreferred, amsterdamSearchWithoutIsin];
      }
      return [];
    });

    const resolved = await matchInstrument({
      ticker: "STRC",
      isin: CH_ISIN,
      assetType: "investment",
    });

    const candidates = buildListingCandidates(resolved);
    const symbols = candidates.map((item) => item.providerSymbol);

    expect(symbols).toEqual(
      expect.arrayContaining(["STRC.PA", "STRC.AS", "21ST.XETRA"]),
    );
    expect(symbols).not.toContain("STRC.US");
    expect(candidates.some((item) => item.isin === US_STRC_ISIN)).toBe(false);
    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.warnings[0]).toMatch(/multiple listings/i);
  });

  it("enumerates the same ISIN across multiple venues from the live id-mapping shape", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([
      { symbol: "VUSA.AS", isin: VUSA_ISIN },
      { symbol: "VUSA.LSE", isin: VUSA_ISIN },
      { symbol: "VUSA.XETRA", isin: VUSA_ISIN },
      { symbol: "VUSA.MI", isin: VUSA_ISIN },
      { symbol: "VUSA.F", isin: VUSA_ISIN },
    ]);
    vi.mocked(fetchSearch).mockResolvedValue([]);

    const resolved = await matchInstrument({
      ticker: "VUSA",
      isin: VUSA_ISIN,
      assetType: "investment",
    });

    const symbols = buildListingCandidates(resolved).map(
      (item) => item.providerSymbol,
    );
    expect(symbols).toEqual(
      expect.arrayContaining(["VUSA.AS", "VUSA.LSE", "VUSA.XETRA", "VUSA.MI"]),
    );
    expect(symbols).not.toContain("VUSA.F");
    expect(resolved.providerSymbol).toBeNull();
  });

  it("keeps VUSA.AS when the user selected Amsterdam", async () => {
    const resolved = await matchInstrument({
      ticker: "VUSA",
      isin: VUSA_ISIN,
      exchange: "AS",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("VUSA.AS");
    expect(resolved.confirmationSource).toBe("verified_mapping");
    expect(fetchIdMapping).not.toHaveBeenCalled();
    expect(fetchSearch).not.toHaveBeenCalled();
  });

  it("includes a different local ticker for the same ISIN", async () => {
    vi.mocked(fetchSearch).mockImplementation(async (query) => {
      if (query === CH_ISIN) return [parisListing, xetraLocalTicker];
      return [];
    });

    const resolved = await matchInstrument({
      isin: CH_ISIN,
      assetType: "investment",
    });

    const symbols = buildListingCandidates(resolved).map(
      (item) => item.providerSymbol,
    );
    expect(symbols).toEqual(expect.arrayContaining(["STRC.PA", "21ST.XETRA"]));
  });

  it("still offers both STRC securities when no ISIN is supplied", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      usPreferred,
      amsterdamSearchWithoutIsin,
    ]);

    const resolved = await matchInstrument({
      ticker: "STRC",
      assetType: "investment",
    });

    const symbols = buildListingCandidates(resolved).map(
      (item) => item.providerSymbol,
    );
    expect(symbols).toEqual(expect.arrayContaining(["STRC.US", "STRC.AS"]));
  });

  it("probes supported venues when id-mapping and ISIN search are empty", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockImplementation(async (query, options) => {
      if (query === CH_ISIN) return [];
      if (query === "STRC" && options?.exchange === "PA") {
        return [parisListing];
      }
      if (query === "STRC" && !options?.exchange) {
        return [usPreferred, amsterdamSearchWithoutIsin];
      }
      return [];
    });

    const resolved = await matchInstrument({
      ticker: "STRC",
      isin: CH_ISIN,
      assetType: "investment",
    });

    const symbols = buildListingCandidates(resolved).map(
      (item) => item.providerSymbol,
    );
    expect(symbols).toContain("STRC.PA");
    expect(symbols).not.toContain("STRC.US");
    expect(
      vi.mocked(fetchSearch).mock.calls.some(
        ([query, options]) => query === "STRC" && options?.exchange === "PA",
      ),
    ).toBe(true);
  });

  it("confirms a newly discovered listing without a registry entry", () => {
    expect(lookupVerifiedByProviderSymbol("STRC.PA")).toBeNull();

    const parsed = parseProviderSymbolInput("STRC.PA");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    expect(parsed.confirmationSource).toBe("manual_exact_listing");
    const holding = applySelectedListing(
      {
        id: "new-strc-pa",
        symbol: "STRC",
        name: "STRC",
        quantity: 10,
        purchasePrice: 100,
        currentPrice: 100,
        currency: "EUR",
        assetType: "investment",
        isin: CH_ISIN,
      },
      {
        ...parsed.resolved,
        isin: CH_ISIN,
        quoteCurrency: "EUR",
        instrumentName: "21Shares Strategy Yield ETP",
      },
    );

    expect(holding.providerSymbol).toBe("STRC.PA");
    expect(holding.exchange).toBe("PA");
    expect(holding.isin).toBe(CH_ISIN);
    expect(holding.quoteCurrency).toBe("EUR");

    const target = resolveQuotePriceTarget(holding);
    expect(target?.providerSymbol).toBe("STRC.PA");
    expect(target?.currency).toBe("EUR");
  });
});
