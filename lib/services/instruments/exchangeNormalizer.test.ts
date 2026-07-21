import { describe, expect, it } from "vitest";

import {
  exchangeResolutionMessage,
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";

describe("exchangeNormalizer", () => {
  it("maps common MIC and broker aliases to provider codes", () => {
    expect(normalizeExchange("XAMS")).toBe("AS");
    expect(normalizeExchange("XPAR")).toBe("PA");
    expect(normalizeExchange("EPA")).toBe("PA");
    expect(normalizeExchange("XETR")).toBe("XETRA");
  });

  it("resolves only known exchanges for matching", () => {
    expect(resolveExchangeForMatching("Paris")).toBe("PA");
    expect(resolveExchangeForMatching("NOTREAL")).toBeNull();
  });

  it("explains unrecognized exchange input", () => {
    expect(exchangeResolutionMessage("NOTREAL")).toMatch(/not a recognized exchange/i);
    expect(exchangeResolutionMessage("EPA")).toBeNull();
  });
});
