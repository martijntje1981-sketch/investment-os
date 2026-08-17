import { describe, expect, it } from "vitest";

import {
  formatSmartPrice,
  resolveSmartPriceFractionDigits,
} from "@/lib/client/smartPriceFormat";
import { formatCryptoPairPrice } from "@/lib/client/cryptoPriceDisplay";

describe("smartPriceFormat", () => {
  it("keeps normal equity-style prices at 2 decimals", () => {
    expect(resolveSmartPriceFractionDigits(42.18)).toBe(2);
    expect(formatSmartPrice(42.18, "EUR")).toBe("€42.18");
  });

  it("keeps readable sub-euro prices without excess zeros", () => {
    expect(resolveSmartPriceFractionDigits(0.75)).toBe(2);
    expect(formatSmartPrice(0.75, "EUR")).toBe("€0.75");
  });

  it("preserves useful precision for small prices", () => {
    expect(resolveSmartPriceFractionDigits(0.01234)).toBe(5);
    expect(formatSmartPrice(0.01234, "EUR")).toContain("0.01234");
  });

  it("preserves micro prices such as SHIB-like values", () => {
    expect(resolveSmartPriceFractionDigits(0.00001234)).toBe(8);
    expect(formatSmartPrice(0.00001234, "EUR")).toContain("0.00001234");
  });

  it("shows meaningful SHIB-like price movement that 2dp would hide", () => {
    const before = 0.00001234;
    const after = 0.00001280;
    const twoDp = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(twoDp.format(before)).toBe(twoDp.format(after));
    expect(formatSmartPrice(before, "EUR")).not.toBe(
      formatSmartPrice(after, "EUR"),
    );
  });

  it("keeps crypto pair currency and shares the same precision ladder", () => {
    expect(formatCryptoPairPrice(0.00001234, "USD")).toContain("$");
    expect(formatCryptoPairPrice(0.00001234, "USD")).toContain("0.00001234");
    expect(formatCryptoPairPrice(42.18, "EUR")).toContain("42.18");
    expect(formatCryptoPairPrice(65000, "USD")).toContain("65,000.00");
  });
});
