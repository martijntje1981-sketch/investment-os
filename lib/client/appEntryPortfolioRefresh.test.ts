import { describe, expect, it } from "vitest";

import {
  APP_ENTRY_REFRESH_STALE_MS,
  shouldRunAppEntryPortfolioRefresh,
} from "@/lib/client/appEntryPortfolioRefresh";

describe("shouldRunAppEntryPortfolioRefresh", () => {
  const now = Date.parse("2026-08-06T10:00:00.000Z");

  it("refreshes once when ready with holdings and no recent refresh", () => {
    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 3,
        now,
        inFlight: false,
        cooldownRemainingMs: 0,
        lastRefreshAt: null,
      }),
    ).toEqual({ shouldRefresh: true, reason: "ready" });
  });

  it("skips when data is still fresh", () => {
    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 3,
        now,
        inFlight: false,
        cooldownRemainingMs: 0,
        lastRefreshAt: new Date(now - APP_ENTRY_REFRESH_STALE_MS + 1_000).toISOString(),
      }),
    ).toEqual({ shouldRefresh: false, reason: "fresh" });
  });

  it("refreshes when last refresh is stale", () => {
    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 2,
        now,
        inFlight: false,
        cooldownRemainingMs: 0,
        lastRefreshAt: new Date(now - APP_ENTRY_REFRESH_STALE_MS - 1).toISOString(),
      }),
    ).toEqual({ shouldRefresh: true, reason: "stale" });
  });

  it("prevents duplicate requests while in flight or cooling down", () => {
    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 2,
        now,
        inFlight: true,
        cooldownRemainingMs: 0,
        lastRefreshAt: null,
      }).reason,
    ).toBe("in_flight");

    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 2,
        now,
        inFlight: false,
        cooldownRemainingMs: 15_000,
        lastRefreshAt: null,
      }).reason,
    ).toBe("cooldown");
  });

  it("does not refresh without a signed-in user or holdings", () => {
    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: null,
        holdingsCount: 2,
        now,
        inFlight: false,
        cooldownRemainingMs: 0,
        lastRefreshAt: null,
      }).reason,
    ).toBe("no_user");

    expect(
      shouldRunAppEntryPortfolioRefresh({
        ready: true,
        userSub: "user-1",
        holdingsCount: 0,
        now,
        inFlight: false,
        cooldownRemainingMs: 0,
        lastRefreshAt: null,
      }).reason,
    ).toBe("no_holdings");
  });
});
