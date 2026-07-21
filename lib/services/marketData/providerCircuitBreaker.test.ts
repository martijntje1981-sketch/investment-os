import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderQuoteError } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  assertProviderAvailable,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuotaGuard";

describe("providerCircuitBreaker", () => {
  beforeEach(() => {
    resetProviderCircuitForTests();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    resetProviderCircuitForTests();
  });

  it("opens the circuit on HTTP 402 quota failures", () => {
    recordProviderCircuitFailure(
      EODHD_PROVIDER_ID,
      new ProviderQuoteError("quota_exhausted", "quota hit", 402),
    );

    expect(isProviderCircuitOpen(EODHD_PROVIDER_ID)).toBe(true);
    expect(() => assertProviderAvailable(EODHD_PROVIDER_ID)).toThrow(/quota/i);
  });

  it("closes the circuit after the cooldown expires", () => {
    recordProviderCircuitFailure(
      EODHD_PROVIDER_ID,
      new ProviderQuoteError("quota_exhausted", "quota hit", 402),
    );

    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);

    expect(isProviderCircuitOpen(EODHD_PROVIDER_ID)).toBe(false);
  });
});
