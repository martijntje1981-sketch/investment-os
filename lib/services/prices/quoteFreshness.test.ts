import { describe, expect, it } from "vitest";

import {
  classifyQuoteTrustState,
  isUsableQuoteTrustState,
  overlayQuoteTrust,
  quotesAreCurrentEnough,
} from "@/lib/services/prices/quoteFreshness";

const NOW = Date.parse("2026-08-28T12:00:00.000Z");

describe("quoteFreshness", () => {
  it("treats a delayed quote as usable when it is the latest provider quote", () => {
    const trust = classifyQuoteTrustState({
      currentPrice: 42.1,
      updatedAt: "2026-08-28T11:20:00.000Z",
      now: NOW,
    });
    expect(trust).toBe("delayed_current");
    expect(isUsableQuoteTrustState(trust)).toBe(true);
  });

  it("does not treat a stale quote as freshly updated", () => {
    const overlayed = overlayQuoteTrust(
      {
        currentPrice: 42.1,
        updatedAt: "2026-08-26T10:00:00.000Z",
        dataStatus: "live",
        isStale: false,
      },
      NOW,
    );
    expect(overlayed.dataStatus).toBe("stale");
    expect(overlayed.isStale).toBe(true);
    expect(
      classifyQuoteTrustState({
        currentPrice: 42.1,
        updatedAt: "2026-08-26T10:00:00.000Z",
        now: NOW,
      }),
    ).toBe("stale");
  });

  it("keeps a live quote live when the provider timestamp is recent", () => {
    expect(
      classifyQuoteTrustState({
        currentPrice: 5.82,
        updatedAt: "2026-08-28T11:55:00.000Z",
        now: NOW,
      }),
    ).toBe("fresh");
  });

  it("marks missing prices unavailable even if a delayed label is present", () => {
    expect(
      classifyQuoteTrustState({
        currentPrice: null,
        updatedAt: "2026-08-28T11:55:00.000Z",
        dataStatus: "delayed",
        now: NOW,
      }),
    ).toBe("unavailable");
  });

  it("requires every supplied quote to be current enough", () => {
    expect(
      quotesAreCurrentEnough(
        [
          { currentPrice: 100, updatedAt: "2026-08-28T11:50:00.000Z" },
          { currentPrice: 20, updatedAt: "2026-08-28T11:10:00.000Z" },
        ],
        NOW,
      ),
    ).toBe(true);
    expect(
      quotesAreCurrentEnough(
        [
          { currentPrice: 100, updatedAt: "2026-08-28T11:50:00.000Z" },
          { currentPrice: 20, updatedAt: "2026-08-26T11:10:00.000Z" },
        ],
        NOW,
      ),
    ).toBe(false);
  });
});
