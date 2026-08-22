import { describe, expect, it } from "vitest";

import {
  ALL_WEEKLY_DOWNSAMPLE_SPAN_DAYS,
  resolvePerformanceHistoryWindow,
} from "@/lib/services/performance/resolvePerformanceHistoryWindow";

describe("resolvePerformanceHistoryWindow", () => {
  const asOf = new Date("2026-07-24T16:00:00.000Z");

  it("maps 1W / 1M / 1Y bounds from resolvePeriodBounds", () => {
    const week = resolvePerformanceHistoryWindow("1W", asOf);
    expect(week.fromIsoDate).toBe("2026-07-17");
    expect(week.toIsoDate).toBe("2026-07-24");
    expect(week.granularity).toBe("daily");

    const month = resolvePerformanceHistoryWindow("1M", asOf);
    expect(month.fromIsoDate).toBe("2026-06-24");
    expect(month.toIsoDate).toBe("2026-07-24");
    expect(month.granularity).toBe("daily");

    const year = resolvePerformanceHistoryWindow("1Y", asOf);
    expect(year.fromIsoDate).toBe("2025-07-24");
    expect(year.toIsoDate).toBe("2026-07-24");
    expect(year.granularity).toBe("daily");
  });

  it("starts YTD on January 1 of the as-of year", () => {
    const ytd = resolvePerformanceHistoryWindow("YTD", asOf);
    expect(ytd.fromIsoDate).toBe("2026-01-01");
    expect(ytd.toIsoDate).toBe("2026-07-24");
    expect(ytd.granularity).toBe("daily");
  });

  it("downsamples ALL to weekly when span exceeds ~400 days", () => {
    const all = resolvePerformanceHistoryWindow("ALL", asOf);
    expect(all.spanDays).toBeGreaterThan(ALL_WEEKLY_DOWNSAMPLE_SPAN_DAYS);
    expect(all.granularity).toBe("weekly");
    expect(all.fromIsoDate).toBe("2016-07-24");
    expect(all.toIsoDate).toBe("2026-07-24");
  });
});
