import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isMarketDataDebugEnabled,
  logMarketDataRateLimitError,
  logMarketDataRefreshTrace,
} from "@/lib/services/marketData/providerDiagnostics";

describe("providerDiagnostics", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not log when MARKET_DATA_DEBUG is unset", () => {
    vi.unstubAllEnvs();

    logMarketDataRateLimitError("test", { httpStatus: 429 });

    expect(console.warn).not.toHaveBeenCalled();
    expect(isMarketDataDebugEnabled()).toBe(false);
  });

  it("logs 402/429 only when MARKET_DATA_DEBUG=1", () => {
    vi.stubEnv("MARKET_DATA_DEBUG", "1");

    logMarketDataRateLimitError("test rate limit", {
      httpStatus: 429,
      remainingQuota: "12",
    });
    logMarketDataRateLimitError("ignored", { httpStatus: 500 });

    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.warn).toHaveBeenCalledWith(
      "[market-data] test rate limit",
      expect.objectContaining({
        httpStatus: 429,
        remainingQuota: "12",
      }),
    );
    expect(isMarketDataDebugEnabled()).toBe(true);
  });

  it("logs refresh trace only when MARKET_DATA_DEBUG=1", () => {
    vi.unstubAllEnvs();
    logMarketDataRefreshTrace("test", { received: 0 });
    expect(console.info).not.toHaveBeenCalled();

    vi.stubEnv("MARKET_DATA_DEBUG", "1");
    logMarketDataRefreshTrace("test", { received: 2 });
    expect(console.info).toHaveBeenCalledWith(
      "[market-data-trace] test",
      { received: 2 },
    );
  });
});
