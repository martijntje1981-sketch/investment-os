import { describe, expect, it } from "vitest";

import { formatCryptoPairPrice } from "@/lib/client/cryptoPriceDisplay";

describe("cryptoPriceDisplay", () => {
  it("shows very small positive crypto prices as non-zero", () => {
    expect(formatCryptoPairPrice(0.00001234, "USD")).toContain("0.00001234");
  });

  it("keeps larger prices readable without changing stock formatting rules", () => {
    expect(formatCryptoPairPrice(1234.56, "USD")).toContain("1,234.56");
  });
});
