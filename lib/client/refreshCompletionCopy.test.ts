import { describe, expect, it } from "vitest";

import {
  buildRefreshCompletionMessage,
  MANUAL_REFRESH_FAILED_MESSAGE,
  MANUAL_REFRESH_NO_UPDATE_MESSAGE,
} from "@/lib/client/livePortfolioPriceRefresh";

describe("manual refresh completion copy", () => {
  it("uses neutral wording when a full refresh succeeded but live status is unproven", () => {
    expect(
      buildRefreshCompletionMessage({
        updatedCount: 2,
        totalQuotable: 2,
        quotes: [
          { dataStatus: "delayed" },
          { dataStatus: "delayed" },
        ],
        quoteSource: "provider",
      }),
    ).toBe("Prices updated.");
    expect(
      buildRefreshCompletionMessage({
        updatedCount: 1,
        totalQuotable: 1,
        quotes: [{ dataStatus: undefined }],
        quoteSource: "provider",
      }),
    ).toBe("Prices updated.");
    expect(
      buildRefreshCompletionMessage({
        updatedCount: 1,
        totalQuotable: 1,
        quotes: [{ dataStatus: "live" }],
        quoteSource: "cache",
      }),
    ).toBe("Prices updated.");
  });

  it("says live only when every returned quote is explicitly live and not cache-only", () => {
    expect(
      buildRefreshCompletionMessage({
        updatedCount: 2,
        totalQuotable: 2,
        quotes: [{ dataStatus: "live" }, { dataStatus: "live" }],
        quoteSource: "provider",
      }),
    ).toBe("Live prices updated for 2 holdings.");
  });

  it("does not claim a full success when only some holdings refreshed", () => {
    const message = buildRefreshCompletionMessage({
      updatedCount: 1,
      totalQuotable: 3,
      quotes: [{ dataStatus: "live" }],
      quoteSource: "provider",
    });
    expect(message).toMatch(/some prices could not be refreshed/i);
    expect(message).toMatch(/existing figures remain visible/i);
    expect(message).not.toMatch(/live prices updated/i);
    expect(message).toBe(
      "Some prices could not be refreshed. 1 of 3 holdings were updated; existing figures remain visible for the rest.",
    );
  });

  it("keeps complete-failure copy as a failure, not a success", () => {
    expect(
      buildRefreshCompletionMessage({
        updatedCount: 0,
        totalQuotable: 2,
        quotes: [],
        quoteSource: "provider",
      }),
    ).toBe(MANUAL_REFRESH_NO_UPDATE_MESSAGE);
    expect(MANUAL_REFRESH_NO_UPDATE_MESSAGE).not.toMatch(/updated for/i);
    expect(MANUAL_REFRESH_FAILED_MESSAGE).toMatch(/could not be refreshed/i);
    expect(MANUAL_REFRESH_FAILED_MESSAGE).not.toMatch(/live/i);
    expect(MANUAL_REFRESH_FAILED_MESSAGE).not.toMatch(/^prices updated/i);
  });
});
