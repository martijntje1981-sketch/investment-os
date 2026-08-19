import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildFixedIncomeRateEducation,
  FIXED_INCOME_DURATION_UNAVAILABLE_NOTE,
  FIXED_INCOME_RATE_EDUCATION_BODY,
} from "@/lib/services/classification/fixedIncomeEducation";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("fixed-income rate education", () => {
  it("explains the inverse move without inventing duration or rate sensitivity", () => {
    const education = buildFixedIncomeRateEducation({
      durationKnownSharePercent: 0,
    });

    expect(education.headline).toBe("Bonds and interest rates");
    expect(education.body).toMatch(/yields rise/i);
    expect(education.body).toMatch(/bond prices generally fall/i);
    expect(education.body).toMatch(/yields fall/i);
    expect(education.body).toMatch(/bond prices generally rise/i);
    expect(education.body).toMatch(/do not all move equally/i);
    expect(education.body).toMatch(/maturity and duration/i);
    expect(education.body).toMatch(/credit risk/i);
    expect(education.body).toMatch(/not advice/i);
    expect(education.body).not.toMatch(/\d+(\.\d+)?\s?%/);
    expect(education.body).not.toMatch(/basis points|duration of|yield of/i);
    expect(education.durationNote).toBe(FIXED_INCOME_DURATION_UNAVAILABLE_NOTE);
    expect(education.durationNote).toMatch(/does not estimate/i);
  });

  it("omits the duration-unavailable note when some duration is known, still without numbers", () => {
    const education = buildFixedIncomeRateEducation({
      durationKnownSharePercent: 40,
    });
    expect(education.body).toBe(FIXED_INCOME_RATE_EDUCATION_BODY);
    expect(education.durationNote).toBeNull();
    expect(education.body).not.toMatch(/\d/);
  });

  it("stays educational copy only — no provider calls", () => {
    const source = read("lib/services/classification/fixedIncomeEducation.ts");
    expect(source).not.toMatch(/fetch\(/);
    expect(source).not.toMatch(/eodhd|openai|executeEodhdApiCall/i);
    expect(source).not.toMatch(/durationKnownSharePercent\s*\*/);
  });
});
