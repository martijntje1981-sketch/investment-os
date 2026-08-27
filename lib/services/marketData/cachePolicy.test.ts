import { describe, expect, it } from "vitest";

import {
  DEFAULT_MARKET_DATA_CACHE_POLICY,
  getInstrumentLookupTtlMs,
  isInstrumentLookupResultIncomplete,
  isInstrumentLookupStillFresh,
} from "@/lib/services/marketData/cachePolicy";

describe("instrument lookup cache freshness", () => {
  const policy = DEFAULT_MARKET_DATA_CACHE_POLICY;

  it("treats empty id-mapping as incomplete with a short TTL", () => {
    expect(isInstrumentLookupResultIncomplete("id_mapping", [])).toBe(true);
    expect(getInstrumentLookupTtlMs("id_mapping", [])).toBe(
      policy.instrumentMappingEmptyFreshMs,
    );
  });

  it("treats skinny search results as incomplete", () => {
    const skinny = [
      { Code: "STRC", Exchange: "US" },
      { Code: "STRC", Exchange: "AS" },
    ];
    expect(isInstrumentLookupResultIncomplete("search", skinny)).toBe(true);
    expect(getInstrumentLookupTtlMs("search", skinny)).toBe(
      policy.instrumentMappingIncompleteFreshMs,
    );
  });

  it("keeps populated id-mapping on the long TTL", () => {
    const rows = [
      { symbol: "VUSA.AS" },
      { symbol: "VUSA.LSE" },
      { symbol: "VUSA.XETRA" },
    ];
    expect(isInstrumentLookupResultIncomplete("id_mapping", rows)).toBe(false);
    expect(getInstrumentLookupTtlMs("id_mapping", rows)).toBe(
      policy.instrumentMappingFreshMs,
    );
  });

  it("does not treat a 30-day empty id-mapping expiry as still fresh", () => {
    const fetchedAt = "2026-08-27T14:22:36.267Z";
    const expiresAt = "2026-09-26T14:22:36.267Z";
    const now = Date.parse("2026-08-27T16:00:00.000Z");

    expect(
      isInstrumentLookupStillFresh({
        lookupType: "id_mapping",
        result: [],
        fetchedAt,
        expiresAt,
        now,
        policy,
      }),
    ).toBe(false);
  });

  it("refetches skinny ticker search after the incomplete window", () => {
    const fetchedAt = "2026-08-23T07:43:52.118Z";
    const expiresAt = "2026-09-22T07:43:52.118Z";
    const now = Date.parse("2026-08-27T14:00:00.000Z");

    expect(
      isInstrumentLookupStillFresh({
        lookupType: "search",
        result: [{ Code: "STRC" }, { Code: "STRC" }],
        fetchedAt,
        expiresAt,
        now,
        policy,
      }),
    ).toBe(false);
  });
});
