import { describe, expect, it } from "vitest";

import {
  formatSmartMoney,
  formatSmartPercent,
  formatSmartPrice,
  resolveSmartMoneyFractionDigits,
  resolveSmartPercentFractionDigits,
  resolveSmartPriceFractionDigits,
} from "@/lib/client/smartPriceFormat";
import { formatCryptoPairPrice } from "@/lib/client/cryptoPriceDisplay";
import { formatHoldingTodayChange } from "@/lib/client/portfolioMovementFormat";

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

  it("formats small position values and moves with cents", () => {
    expect(resolveSmartMoneyFractionDigits(2.04)).toBe(2);
    expect(formatSmartMoney(2.04)).toBe("€2.04");
    expect(formatSmartMoney(0.03)).toBe("€0.03");
    expect(formatHoldingTodayChange(0.03, 1.4)).toContain("€0.03");
    expect(formatHoldingTodayChange(0.03, 1.4)).toContain("+1.4%");
  });

  it("keeps large position values without unnecessary cents", () => {
    expect(resolveSmartMoneyFractionDigits(61_484)).toBe(0);
    expect(formatSmartMoney(61_484)).toBe("€61,484");
    expect(formatHoldingTodayChange(439, 0.7)).toContain("€439");
    expect(formatHoldingTodayChange(439, 0.7)).not.toContain("€439.00");
  });

  it("preserves tiny percent moves that 1dp would hide", () => {
    expect(resolveSmartPercentFractionDigits(0.04)).toBe(2);
    expect(formatSmartPercent(0.04)).toBe("0.04%");
  });
});
