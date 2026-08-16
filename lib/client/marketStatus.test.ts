import { describe, expect, it } from "vitest";

import {
  MARKET_UPDATE_STALE_AFTER_MS,
  resolveMarketUpdateDisplay,
} from "@/lib/client/marketStatus";

describe("resolveMarketUpdateDisplay", () => {
  const now = Date.parse("2026-08-16T12:00:00.000Z");

  it("omits missing timestamps", () => {
    expect(resolveMarketUpdateDisplay(null, now)).toBeNull();
    expect(resolveMarketUpdateDisplay("not-a-date", now)).toBeNull();
  });

  it("marks multi-day-old updates as stale", () => {
    const stale = resolveMarketUpdateDisplay("2026-08-05T10:00:00.000Z", now);
    expect(stale).toEqual({ isStale: true });
    expect(now - Date.parse("2026-08-05T10:00:00.000Z")).toBeGreaterThan(
      MARKET_UPDATE_STALE_AFTER_MS,
    );
  });

  it("keeps recent updates as fresh", () => {
    expect(
      resolveMarketUpdateDisplay("2026-08-16T09:00:00.000Z", now),
    ).toEqual({ isStale: false });
  });
});
