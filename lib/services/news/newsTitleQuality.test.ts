import { describe, expect, it } from "vitest";

import { isUsableNewsTitle } from "@/lib/services/news/sanitizeNewsUrl";

describe("isUsableNewsTitle", () => {
  it("rejects truncated listicle endings like Dollar: 3.", () => {
    expect(
      isUsableNewsTitle("It's Not Looking Great for The Dollar: 3."),
    ).toBe(false);
    expect(isUsableNewsTitle("Top market themes: 12")).toBe(false);
  });

  it("rejects empty, short, or dangling titles", () => {
    expect(isUsableNewsTitle("")).toBe(false);
    expect(isUsableNewsTitle("Short title")).toBe(false);
    expect(isUsableNewsTitle("Markets drift lower after Fed speech:")).toBe(
      false,
    );
  });

  it("keeps legitimate financial headlines", () => {
    expect(
      isUsableNewsTitle("Federal Reserve signals patience on rate cuts"),
    ).toBe(true);
    expect(
      isUsableNewsTitle("Bitcoin holds firm after ETF inflow reports"),
    ).toBe(true);
  });
});
