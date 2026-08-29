import { describe, expect, it } from "vitest";

import {
  exchangeResolutionMessage,
  isKnownProviderExchange,
  isRecognizedExchange,
  normalizeExchange,
  resolveExchangeForMatching,
} from "@/lib/services/instruments/exchangeNormalizer";

describe("exchangeNormalizer", () => {
  it("maps common MIC and broker aliases to purchase codes", () => {
    expect(normalizeExchange("XAMS")).toBe("AS");
    expect(normalizeExchange("XPAR")).toBe("PA");
    expect(normalizeExchange("EPA")).toBe("PA");
    expect(normalizeExchange("XETR")).toBe("XETRA");
  });

  it("normalizes Tradegate purchase venue aliases to TDG", () => {
    expect(normalizeExchange("TDG")).toBe("TDG");
    expect(normalizeExchange("Tradegate")).toBe("TDG");
    expect(normalizeExchange("TG")).toBe("TDG");
    expect(normalizeExchange("Tradegate BSX")).toBe("TDG");
  });

  it("resolves only provider pricing exchanges for matching", () => {
    expect(resolveExchangeForMatching("Paris")).toBe("PA");
    expect(resolveExchangeForMatching("NOTREAL")).toBeNull();
    expect(resolveExchangeForMatching("TDG")).toBeNull();
    expect(resolveExchangeForMatching("Tradegate")).toBeNull();
    expect(resolveExchangeForMatching("Nasdaq")).toBe("US");
    expect(resolveExchangeForMatching("NYSE")).toBe("US");
  });

  it("treats Tradegate as recognized without treating it as a provider exchange", () => {
    expect(isRecognizedExchange("TDG")).toBe(true);
    expect(isRecognizedExchange("Tradegate")).toBe(true);
    expect(isKnownProviderExchange("TDG")).toBe(false);
    expect(isKnownProviderExchange("XETRA")).toBe(true);
  });

  it("explains unrecognized exchange input", () => {
    expect(exchangeResolutionMessage("NOTREAL")).toMatch(/not a recognized exchange/i);
    expect(exchangeResolutionMessage("EPA")).toBeNull();
    expect(exchangeResolutionMessage("TDG")).toBeNull();
    expect(exchangeResolutionMessage("Tradegate")).toBeNull();
  });
});
