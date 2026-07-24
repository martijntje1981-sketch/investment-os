import { beforeEach, describe, expect, it } from "vitest";

import { EodhdProviderError } from "@/lib/services/instruments/eodhdClient";
import {
  assertCanSpendEodhdCalls,
  assertEodhdApiAvailable,
  canSpendEodhdCalls,
  EODHD_API_PROVIDER_ID,
  EODHD_DAILY_LIMIT,
  EODHD_RECOVERY_RESERVE,
  getEodhdDailyUsage,
  recordEodhdApiCalls,
  resetEodhdDailyQuotaForTests,
} from "@/lib/services/marketData/eodhdDailyQuota";
import {
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_NEWS_PROVIDER_ID } from "@/lib/services/instruments/eodhdNewsGuard";
import { isEodhdNewsFetchBlocked } from "@/lib/services/instruments/eodhdNewsGuard";

describe("eodhdDailyQuota", () => {
  beforeEach(() => {
    resetEodhdDailyQuotaForTests();
    resetProviderCircuitForTests();
  });

  it("defaults to the paid-plan daily limit when env is unset", () => {
    expect(EODHD_DAILY_LIMIT).toBeGreaterThanOrEqual(100000);
  });

  it("reserves recovery calls from spendable budget", async () => {
    const budget = await getEodhdDailyUsage();
    expect(budget.dailyLimit).toBe(EODHD_DAILY_LIMIT);
    expect(budget.recoveryReserve).toBe(EODHD_RECOVERY_RESERVE);
    expect(budget.spendableRemaining).toBe(
      EODHD_DAILY_LIMIT - EODHD_RECOVERY_RESERVE,
    );
  });

  it("blocks spending when estimated calls exceed remaining budget", async () => {
    await recordEodhdApiCalls(EODHD_DAILY_LIMIT - EODHD_RECOVERY_RESERVE);

    await expect(assertCanSpendEodhdCalls(1)).rejects.toThrow(
      /insufficient/i,
    );
    expect(await canSpendEodhdCalls(1)).toBe(false);
  });

  it("opens the shared API circuit when the daily budget is exhausted", async () => {
    await recordEodhdApiCalls(EODHD_DAILY_LIMIT - EODHD_RECOVERY_RESERVE + 1);

    expect(isProviderCircuitOpen(EODHD_API_PROVIDER_ID)).toBe(true);
    expect(isEodhdNewsFetchBlocked()).toBe(true);
  });

  it("shares quota exhaustion across intelligence and price endpoints", async () => {
    recordProviderCircuitFailure(
      EODHD_API_PROVIDER_ID,
      new Error("EODHD daily API budget exhausted"),
    );

    expect(isProviderCircuitOpen(EODHD_API_PROVIDER_ID)).toBe(true);
    expect(isEodhdNewsFetchBlocked()).toBe(true);
    expect(isProviderCircuitOpen(EODHD_NEWS_PROVIDER_ID)).toBe(false);
  });

  it("clears a stale quota circuit when spendable budget is available", async () => {
    recordProviderCircuitFailure(
      EODHD_API_PROVIDER_ID,
      new EodhdProviderError(402, "EODHD daily API budget exhausted"),
    );

    expect(isProviderCircuitOpen(EODHD_API_PROVIDER_ID)).toBe(true);

    await assertEodhdApiAvailable(1);

    expect(isProviderCircuitOpen(EODHD_API_PROVIDER_ID)).toBe(false);
  });
});
