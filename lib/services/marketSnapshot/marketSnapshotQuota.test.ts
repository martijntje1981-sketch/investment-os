import { beforeEach, describe, expect, it, vi } from "vitest";

const loadPricesForTargetsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/services/prices/priceService", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/prices/priceService")
  >();
  return {
    ...actual,
    loadPricesForTargets: loadPricesForTargetsMock,
  };
});

import * as marketSnapshotService from "@/lib/services/marketSnapshot/marketSnapshotService";
import {
  resetMarketSnapshotServiceForTests,
  runScheduledMarketSnapshot,
} from "@/lib/services/marketSnapshot/marketSnapshotService";
import { resetEodhdDailyQuotaForTests } from "@/lib/services/marketData/eodhdDailyQuota";

const US_OPEN = new Date("2026-07-23T13:35:00.000Z");

function mockPriceLoadResult(requested: number, received: number) {
  return {
    success: true,
    baseCurrency: "EUR" as const,
    fxRates: {
      EUR: 1,
      USD_TO_EUR: requested > 0 ? 0.92 : null,
      GBP_TO_EUR: null,
      CHF_TO_EUR: null,
    },
    prices: [],
    errors: [],
    requested,
    received,
    generatedAt: new Date().toISOString(),
    cache: { enabled: true, durationSeconds: 720 },
    metrics: { providerCalls: requested },
  };
}

describe("market snapshot quota safety", () => {
  beforeEach(() => {
    resetMarketSnapshotServiceForTests();
    resetEodhdDailyQuotaForTests();
    loadPricesForTargetsMock.mockReset();
    loadPricesForTargetsMock.mockResolvedValue(mockPriceLoadResult(1, 1));
    vi.restoreAllMocks();
  });

  it("completes US run with zero provider calls for EU-only portfolios", async () => {
    vi.spyOn(
      marketSnapshotService,
      "collectSnapshotProviderSymbols",
    ).mockResolvedValue(["VWCE.XETRA", "STRC.AS", "NUKL.XETRA"]);

    const result = await runScheduledMarketSnapshot({
      slot: "us_open",
      now: US_OPEN,
    });

    expect(result.ok).toBe(true);
    expect(result.symbolsRequested).toBe(0);
    expect(result.providerCalls).toBe(0);
    expect(loadPricesForTargetsMock).not.toHaveBeenCalled();
  });

  it("skips duplicate cron invocations without additional provider calls", async () => {
    const first = await runScheduledMarketSnapshot({
      slot: "us_open",
      now: US_OPEN,
    });
    const second = await runScheduledMarketSnapshot({
      slot: "us_open",
      now: US_OPEN,
    });

    expect(first.ok).toBe(true);
    expect(first.skipped).toBe(false);
    expect(second.skipped).toBe(true);
    expect(second.reason).toMatch(/already refreshed/i);
    expect(loadPricesForTargetsMock).not.toHaveBeenCalled();
  });
});
