import { describe, expect, it } from "vitest";

import {
  MIN_VERIFIED_ITEMS_TO_SUPPRESS_WARNING,
  NEWS_PARTIAL_SOURCES_MESSAGE,
  NEWS_UNAVAILABLE_MESSAGE,
  countVerifiedNewsItems,
  resolveNewsPageWarning,
  shouldRenderSourceErrorList,
} from "@/lib/services/news/newsSourceHealth";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse } from "@/lib/types/newsContent";

function payload(
  overrides: Partial<NewsApiResponse> & {
    dataStatus?: Partial<NewsApiResponse["dataStatus"]>;
  } = {},
): NewsApiResponse {
  return {
    success: true,
    marketBrief: createEmptyMarketBrief("2026-07-20T08:00:00.000Z"),
    portfolioNews: [],
    macroNews: [],
    marketVideos: [],
    upcomingEvents: [],
    sourceErrors: [],
    fetchedAt: "2026-07-20T08:00:00.000Z",
    dataStatus: {
      feedsState: "live",
      eventsState: "empty",
      eodhdNewsAvailable: true,
      eodhdLastUpdated: null,
      sourceCount: 3,
      activeSourceNames: ["Bloomberg Television", "CNBC Television", "Coin Bureau"],
      unavailableSourceCount: 0,
      ...overrides.dataStatus,
    },
    ...overrides,
  };
}

describe("newsSourceHealth", () => {
  it("never renders a per-provider source error list in the UI", () => {
    expect(shouldRenderSourceErrorList()).toBe(false);
  });

  it("shows one calm partial-source message when content exists but a source failed", () => {
    const warning = resolveNewsPageWarning({
      dataStatus: payload({
        dataStatus: {
          feedsState: "partial",
          unavailableSourceCount: 1,
        },
      }).dataStatus,
      sourceErrorCount: 1,
      verifiedItemCount: 2,
    });

    expect(warning.show).toBe(true);
    expect(warning.message).toBe(NEWS_PARTIAL_SOURCES_MESSAGE);
    expect(warning.message).not.toContain("EODHD");
  });

  it("suppresses duplicate-style warnings when enough verified content is available", () => {
    const warning = resolveNewsPageWarning({
      dataStatus: payload({
        dataStatus: {
          feedsState: "partial",
          unavailableSourceCount: 1,
        },
      }).dataStatus,
      sourceErrorCount: 1,
      verifiedItemCount: MIN_VERIFIED_ITEMS_TO_SUPPRESS_WARNING,
    });

    expect(warning.show).toBe(false);
  });

  it("shows unavailable message only when no verified content exists", () => {
    const warning = resolveNewsPageWarning({
      dataStatus: payload({
        dataStatus: {
          feedsState: "unavailable",
          unavailableSourceCount: 2,
        },
      }).dataStatus,
      sourceErrorCount: 2,
      verifiedItemCount: 0,
    });

    expect(warning.show).toBe(true);
    expect(warning.message).toBe(NEWS_UNAVAILABLE_MESSAGE);
  });

  it("counts verified items across portfolio, macro, and video sections", () => {
    const count = countVerifiedNewsItems(
      payload({
        portfolioNews: [{ id: "1" } as NewsApiResponse["portfolioNews"][number]],
        macroNews: [{ id: "2" } as NewsApiResponse["macroNews"][number]],
        marketVideos: [{ id: "3" } as NewsApiResponse["marketVideos"][number]],
      }),
    );

    expect(count).toBe(3);
  });
});
