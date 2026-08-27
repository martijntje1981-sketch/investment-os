import { describe, expect, it } from "vitest";

import {
  listingRowConflictsIsin,
  normalizeProviderListingRow,
  normalizeProviderListingRows,
  parseCompositeListingSymbol,
} from "@/lib/services/instruments/idMappingNormalizer";

describe("id-mapping response shape", () => {
  it("parses live EODHD symbol/isin rows into Code and Exchange", () => {
    const row = normalizeProviderListingRow({
      symbol: "VUSA.XETRA",
      isin: "IE00B3XXRP09",
    });

    expect(row).toMatchObject({
      Code: "VUSA",
      Exchange: "XETRA",
      ISIN: "IE00B3XXRP09",
      symbol: "VUSA.XETRA",
    });
  });

  it("keeps the legacy Code/Exchange search shape", () => {
    const row = normalizeProviderListingRow({
      Code: "STRC",
      Exchange: "PA",
      ISIN: "CH1528107811",
      Name: "21Shares Strategy Yield ETP",
      Currency: "EUR",
    });

    expect(row?.Code).toBe("STRC");
    expect(row?.Exchange).toBe("PA");
    expect(row?.ISIN).toBe("CH1528107811");
  });

  it("drops unknown provider suffixes instead of inventing venues", () => {
    expect(
      normalizeProviderListingRow({ symbol: "VUSA.F", isin: "IE00B3XXRP09" }),
    ).toBeNull();
    expect(parseCompositeListingSymbol("VUSA.XETRA")).toEqual({
      code: "VUSA",
      exchange: "XETRA",
    });
  });

  it("never keeps a listing whose ISIN conflicts with the user ISIN", () => {
    const rows = normalizeProviderListingRows(
      [
        {
          Code: "STRC",
          Exchange: "US",
          ISIN: "US5949728530",
          Name: "MicroStrategy preferred",
        },
        {
          symbol: "STRC.PA",
          isin: "CH1528107811",
          Name: "21Shares Strategy Yield ETP",
        },
      ],
      "CH1528107811",
    );

    expect(rows.map((row) => row.symbol)).toEqual(["STRC.PA"]);
    expect(
      listingRowConflictsIsin(
        { Code: "STRC", Exchange: "US", ISIN: "US5949728530" },
        "CH1528107811",
      ),
    ).toBe(true);
  });
});
