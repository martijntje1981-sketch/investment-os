import { describe, expect, it } from "vitest";

import {
  unsupportedInvestmentFaq,
  whichInvestmentsSupportedFaq,
} from "@/lib/content/supportedInstrumentsFaq";

describe("supportedInstrumentsFaq", () => {
  it("includes the supported investments question", () => {
    expect(whichInvestmentsSupportedFaq.question).toBe(
      "Which investments are supported?",
    );
    expect(whichInvestmentsSupportedFaq.link).toEqual({
      href: "/supported-instruments",
      label: "View the current supported instruments",
    });
  });

  it("includes the unsupported investment follow-up question", () => {
    expect(unsupportedInvestmentFaq.question).toBe(
      "What happens if my investment is not supported?",
    );
  });
});
