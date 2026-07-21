import { describe, expect, it } from "vitest";

import {
  findExchangeOption,
  searchExchanges,
} from "@/lib/services/instruments/exchangeSearch";
import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";

describe("searchExchanges", () => {
  it("returns no results for queries shorter than two characters", async () => {
    await expect(searchExchanges("X")).resolves.toEqual([]);
  });

  it("finds exchanges by name and code", async () => {
    const xetra = await searchExchanges("XETRA");
    expect(xetra[0]?.code).toBe("XETRA");

    const amsterdam = await searchExchanges("Amsterdam");
    expect(amsterdam.some((item) => item.code === "AS")).toBe(true);
  });

  it("maps EPA to Euronext Paris", async () => {
    const paris = await searchExchanges("EPA");
    expect(paris[0]?.code).toBe("PA");
  });

  it("ignores aborted searches", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      searchExchanges("XETRA", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("findExchangeOption", () => {
  it("maps normalized exchange codes to catalog labels", () => {
    expect(findExchangeOption("XETR")).toEqual({
      code: "XETRA",
      label: "Xetra",
    });
  });

  it("maps EPA to Euronext Paris", () => {
    expect(findExchangeOption("EPA")).toEqual({
      code: "PA",
      label: "Euronext Paris",
    });
    expect(normalizeExchange("EPA")).toBe("PA");
  });

  it("returns null for unknown exchange codes", () => {
    expect(findExchangeOption("CUSTOM")).toBeNull();
  });
});
