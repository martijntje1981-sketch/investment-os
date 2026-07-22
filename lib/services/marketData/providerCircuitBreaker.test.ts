import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProviderQuoteError } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  assertProviderAvailable,
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_INSTRUMENT_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuotaGuard";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";

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

  it("opens the instrument circuit independently from quotes", () => {
    recordProviderCircuitFailure(
      EODHD_INSTRUMENT_PROVIDER_ID,
      new ProviderQuoteError("quota_exhausted", "quota hit", 402),
    );

    expect(isProviderCircuitOpen(EODHD_INSTRUMENT_PROVIDER_ID)).toBe(true);
    expect(isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID)).toBe(false);
    expect(() => assertProviderAvailable(EODHD_INSTRUMENT_PROVIDER_ID)).toThrow(
      /quota/i,
    );
  });

  it("closes the circuit after the cooldown expires", () => {
    recordProviderCircuitFailure(
      EODHD_INSTRUMENT_PROVIDER_ID,
      new ProviderQuoteError("quota_exhausted", "quota hit", 402),
    );

    vi.advanceTimersByTime(6 * 60 * 60 * 1000 + 1);

    expect(isProviderCircuitOpen(EODHD_INSTRUMENT_PROVIDER_ID)).toBe(false);
  });
});
