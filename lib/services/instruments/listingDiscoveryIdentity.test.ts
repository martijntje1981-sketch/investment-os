import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  fetchIdMapping,
  fetchSearch,
} from "@/lib/services/instruments/eodhdClient";
import { resetEodhdQuotaGuardForTests } from "@/lib/services/instruments/eodhdQuotaGuard";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import { lookupVerifiedByTickerExchange } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";

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

describe("listing discovery identity — general, not registry-bound", () => {
  beforeEach(() => {
    resetEodhdQuotaGuardForTests();
    vi.mocked(fetchIdMapping).mockReset();
    vi.mocked(fetchSearch).mockReset();
    vi.mocked(fetchIdMapping).mockResolvedValue([]);
    vi.mocked(fetchSearch).mockResolvedValue([]);
  });

  it("discovers an unseen ticker from the provider without a registry entry", async () => {
    expect(lookupVerifiedByTickerExchange("MSFT", "US")).toBeNull();
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "MSFT",
        Exchange: "US",
        Name: "Microsoft Corporation",
        ISIN: "US5949181045",
        Currency: "USD",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "MSFT",
      assetType: "investment",
    });

    expect(fetchSearch).toHaveBeenCalled();
    expect(resolved.providerSymbol).toBe("MSFT.US");
    expect(resolved.exchange).toBe("US");
    expect(resolved.quoteCurrency).toBe("USD");
    expect(resolved.isin).toBe("US5949181045");
    expect(resolved.confirmationSource).not.toBe("verified_mapping");
  });

  it("does not merge ticker collisions into one security", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "SAN",
        Exchange: "MC",
        Name: "Banco Santander SA",
        ISIN: "ES0113900J37",
        Currency: "EUR",
      },
      {
        Code: "SAN",
        Exchange: "PA",
        Name: "Sanofi",
        ISIN: "FR0000120578",
        Currency: "EUR",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "SAN",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.candidates).toHaveLength(2);
    expect(new Set(resolved.candidates?.map((row) => row.exchange)).size).toBe(
      2,
    );
    expect(new Set(resolved.candidates?.map((row) => row.isin)).size).toBe(2);
  });

  it("keeps the same ISIN on different venues as distinct listings", async () => {
    vi.mocked(fetchIdMapping).mockResolvedValue([
      {
        Code: "ASML",
        Exchange: "AS",
        Name: "ASML Holding",
        ISIN: "NL0010273215",
        Currency: "EUR",
      },
      {
        Code: "ASML",
        Exchange: "US",
        Name: "ASML Holding NY Registry",
        ISIN: "NL0010273215",
        Currency: "USD",
      },
    ]);
    vi.mocked(fetchSearch).mockResolvedValue([]);

    const resolved = await matchInstrument({
      isin: "NL0010273215",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.candidates?.length).toBeGreaterThanOrEqual(2);
    expect(
      resolved.candidates?.map((row) => row.providerSymbol).sort(),
    ).toEqual(["ASML.AS", "ASML.US"]);
    expect(resolved.candidates?.every((row) => row.isin === "NL0010273215")).toBe(
      true,
    );
  });

  it("rejects a candidate whose known ISIN conflicts with the supplied ISIN", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "SAN",
        Exchange: "MC",
        Name: "Banco Santander SA",
        ISIN: "ES0113900J37",
        Currency: "EUR",
      },
      {
        Code: "SAN",
        Exchange: "PA",
        Name: "Sanofi",
        ISIN: "FR0000120578",
        Currency: "EUR",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "SAN",
      isin: "FR0000120578",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("SAN.PA");
    expect(resolved.isin).toBe("FR0000120578");
    expect(resolved.exchange).toBe("PA");
  });

  it("resolves a name search without requiring the ticker", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "NESN",
        Exchange: "SW",
        Name: "Nestle SA",
        ISIN: "CH0038863350",
        Currency: "CHF",
      },
    ]);

    const resolved = await matchInstrument({
      instrumentName: "Nestle SA",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBe("NESN.SW");
    expect(resolved.matchMethod).toBe("name_exchange");
    expect(resolved.exchange).toBe("SW");
    expect(resolved.quoteCurrency).toBe("CHF");
  });

  it("does not fabricate a listing from an empty provider response", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([]);

    const resolved = await matchInstrument({
      ticker: "ZZZZQ",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.exchange).toBeNull();
    expect(resolved.quoteCurrency ?? null).toBeNull();
    expect(resolved.matchMethod).toBe("unresolved");
  });

  it("does not treat a short ticker as a company-name query", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      {
        Code: "ENIA",
        Exchange: "US",
        Name: "Enel Américas S.A",
        ISIN: "CLP371861061",
        Currency: "USD",
      },
      {
        Code: "0NRE",
        Exchange: "LSE",
        Name: "Enel SpA",
        ISIN: "IT0003128367",
        Currency: "EUR",
      },
    ]);

    const resolved = await matchInstrument({
      ticker: "ENEL",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.warnings.join(" ")).not.toMatch(/name/i);
    expect(
      resolved.candidates?.every((row) => Boolean(row.providerSymbol)),
    ).toBe(true);
  });

  it("drops skinny provider rows that cannot form a listing identity", async () => {
    vi.mocked(fetchSearch).mockResolvedValue([
      { Name: "Incomplete row" },
      { Code: "FOO" },
    ]);

    const resolved = await matchInstrument({
      ticker: "FOO",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.candidates ?? []).toHaveLength(0);
  });

  it("reports provider unavailability instead of guessing", async () => {
    vi.mocked(fetchSearch).mockRejectedValue(new Error("network down"));

    const resolved = await matchInstrument({
      ticker: "MSFT",
      assetType: "investment",
    });

    expect(resolved.providerSymbol).toBeNull();
    expect(resolved.warnings.some((warning) => warning.includes(MATCHING_UNAVAILABLE_WARNING) || /unavailable/i.test(warning) || /Could not match/i.test(warning))).toBe(true);
  });

  it("does not write portfolio state during discovery", () => {
    const engine = readFileSync(
      path.resolve(process.cwd(), "lib/services/instruments/instrumentMatchEngine.ts"),
      "utf8",
    );
    const isin = readFileSync(
      path.resolve(process.cwd(), "lib/services/instruments/isinListingDiscovery.ts"),
      "utf8",
    );
    const route = readFileSync(
      path.resolve(process.cwd(), "app/api/instruments/match/route.ts"),
      "utf8",
    );
    for (const source of [engine, isin, route]) {
      expect(source).not.toContain("saveHoldings");
      expect(source).not.toContain("writePortfolioToStorage");
      expect(source).not.toContain("sync_version");
    }
  });
});
