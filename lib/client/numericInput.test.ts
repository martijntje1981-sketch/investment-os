import { describe, expect, it } from "vitest";

import {
  formatNumericInputDisplay,
  isExplicitZeroInput,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/lib/client/numericInput";

describe("numericInput", () => {
  it("shows empty display for unset zero values", () => {
    expect(formatNumericInputDisplay(0)).toBe("");
  });

  it("preserves non-zero display values", () => {
    expect(formatNumericInputDisplay(12.5)).toBe("12.5");
  });

  it("removes leading zeros while typing", () => {
    expect(sanitizeNumericInput("012.50")).toBe("12.50");
    expect(sanitizeNumericInput("007")).toBe("7");
  });

  it("allows explicit zero input", () => {
    expect(parseNumericInput("0")).toBe(0);
    expect(isExplicitZeroInput("0")).toBe(true);
  });

  it("parses empty input as zero for submission", () => {
    expect(parseNumericInput("")).toBe(0);
    expect(parseNumericInput(".")).toBe(0);
  });

  it("keeps decimal typing intact before blur", () => {
    expect(sanitizeNumericInput("12.")).toBe("12.");
    expect(parseNumericInput("12.")).toBe(12);
  });
});
