import { describe, expect, it } from "vitest";

import {
  findExchangeOption,
  resolveExchangeInput,
  searchExchanges,
} from "@/lib/services/instruments/exchangeSearch";
import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";

describe("resolveExchangeInput", () => {
  it("resolves catalog labels and alias codes through the same ranked lookup", () => {
    const parisLabel = resolveExchangeInput("Euronext Paris");
    expect(parisLabel.exact).toEqual({
      code: "PA",
      label: "Euronext Paris",
    });
    expect(parisLabel.matches[0]).toEqual(parisLabel.exact);

    const parisAlias = resolveExchangeInput("EPA");
    expect(parisAlias.exact).toEqual({
      code: "PA",
      label: "Euronext Paris",
    });
  });

  it("resolves full catalog labels that only match by label scoring", () => {
    expect(resolveExchangeInput("London Stock Exchange").exact).toEqual({
      code: "LSE",
      label: "London Stock Exchange",
    });
  });

  it("returns multiple matches without an exact pick for ambiguous prefixes", () => {
    const euronext = resolveExchangeInput("Euronext");
    expect(euronext.exact).toBeNull();
    expect(euronext.matches.length).toBeGreaterThan(1);
  });
});

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

  it("returns the same top match as findExchangeOption", async () => {
    const input = "Euronext Paris";
    const exact = findExchangeOption(input);
    const search = await searchExchanges(input);

    expect(exact).toEqual({ code: "PA", label: "Euronext Paris" });
    expect(search[0]).toEqual(exact);
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

  it("resolves catalog labels used in autocomplete", () => {
    expect(findExchangeOption("Euronext Paris")).toEqual({
      code: "PA",
      label: "Euronext Paris",
    });
    expect(findExchangeOption("London Stock Exchange")).toEqual({
      code: "LSE",
      label: "London Stock Exchange",
    });
  });

  it("returns null for unknown exchange codes", () => {
    expect(findExchangeOption("CUSTOM")).toBeNull();
  });

  it("returns null for ambiguous partial venue names", () => {
    expect(findExchangeOption("Euronext")).toBeNull();
  });
});
