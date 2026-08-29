import { beforeEach, describe, expect, it, vi } from "vitest";

import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { resolveExchangeFallbackQuoteCurrency } from "@/lib/services/instruments/exchangeQuoteCurrencyFallback";
import {
  filterSnapshotListingsForSlot,
  snapshotListingsToPriceTargets,
  type SnapshotListingIdentity,
} from "@/lib/services/marketSnapshot/snapshotListingTargets";
import * as snapshotListings from "@/lib/services/marketSnapshot/snapshotListingTargets";
import {
  resetMarketSnapshotServiceForTests,
  runScheduledMarketSnapshot,
} from "@/lib/services/marketSnapshot/marketSnapshotService";
import { estimateFxProviderCallsForTargets } from "@/lib/services/marketSnapshot/snapshotSymbolFilter";
import type { ResolvedPriceTarget } from "@/lib/services/prices/types";

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

const EU_OPEN = new Date("2026-07-23T07:30:00.000Z");

function listing(
  overrides: Partial<SnapshotListingIdentity> &
    Pick<SnapshotListingIdentity, "providerSymbol">,
): SnapshotListingIdentity {
  return {
    providerSymbol: overrides.providerSymbol,
    exchange: overrides.exchange ?? null,
    quoteCurrency: overrides.quoteCurrency ?? null,
    isin: overrides.isin ?? null,
    name: overrides.name ?? overrides.providerSymbol,
    matchMethod: overrides.matchMethod ?? "ticker_exchange",
    matchConfidence: overrides.matchConfidence ?? 1,
    confirmedAt: overrides.confirmedAt ?? "2026-07-01T00:00:00.000Z",
  };
}

describe("snapshot confirmed listing targets", () => {
  it("keeps VUSA.AS on EUR from persisted confirmed listing identity", () => {
    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
        isin: "IE00B3XXRP09",
        name: "Vanguard S&P 500 UCITS ETF",
      }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("VUSA.AS");
    expect(targets[0]?.currency).toBe("EUR");
    expect(targets[0]?.isin).toBe("IE00B3XXRP09");
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();
  });

  it("keeps STRC.AS on USD from persisted confirmed listing identity", () => {
    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "STRC.AS",
        exchange: "AS",
        quoteCurrency: "USD",
        isin: "NL0015001K93",
        name: "21Shares Strategy Yield ETP",
      }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("STRC.AS");
    expect(targets[0]?.currency).toBe("USD");
    expect(lookupVerifiedByProviderSymbol("STRC.AS")?.quoteCurrency).toBe("USD");
  });

  it("keeps a Frankfurt listing on its persisted USD quote currency", () => {
    expect(lookupVerifiedByProviderSymbol("IWDA.F")).toBeNull();
    expect(resolveExchangeFallbackQuoteCurrency("F")).toBeNull();

    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "IWDA.F",
        exchange: "F",
        quoteCurrency: "USD",
        isin: "IE00B4L5Y983",
        name: "iShares Core MSCI World",
      }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("IWDA.F");
    expect(targets[0]?.currency).toBe("USD");
  });

  it("includes a confirmed listing absent from the registry when quote currency is persisted", () => {
    expect(lookupVerifiedByProviderSymbol("QQQQ.AS")).toBeNull();

    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "QQQQ.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
        isin: "IE00UNKNOWN001",
        matchMethod: "manual_exact_listing",
      }),
    ]);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("QQQQ.AS");
    expect(targets[0]?.currency).toBe("EUR");
  });

  it("does not invent EUR for an unconfirmed Amsterdam listing without persisted currency", () => {
    expect(lookupVerifiedByProviderSymbol("ZZZZ.AS")).toBeNull();
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();

    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "ZZZZ.AS",
        exchange: "AS",
        quoteCurrency: null,
      }),
    ]);

    expect(targets).toEqual([]);
  });

  it("does not introduce a generic AS to EUR fallback", () => {
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();

    const targets = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
      }),
      listing({
        providerSymbol: "STRC.AS",
        exchange: "AS",
        quoteCurrency: "USD",
      }),
    ]);

    expect(targets.find((row) => row.providerSymbol === "VUSA.AS")?.currency).toBe(
      "EUR",
    );
    expect(targets.find((row) => row.providerSymbol === "STRC.AS")?.currency).toBe(
      "USD",
    );
  });

  it("keeps confirmed EU listings in the EU snapshot slot", () => {
    const filtered = filterSnapshotListingsForSlot(
      [
        listing({ providerSymbol: "VUSA.AS", exchange: "AS", quoteCurrency: "EUR" }),
        listing({ providerSymbol: "STRC.AS", exchange: "AS", quoteCurrency: "USD" }),
        listing({ providerSymbol: "AAPL.US", exchange: "US", quoteCurrency: "USD" }),
      ],
      "eu_open",
    );

    expect(filtered.map((row) => row.providerSymbol)).toEqual([
      "VUSA.AS",
      "STRC.AS",
    ]);
  });

  it("counts USD FX from persisted listing currency, not exchange suffix", () => {
    const targets: ResolvedPriceTarget[] = snapshotListingsToPriceTargets([
      listing({
        providerSymbol: "IWDA.F",
        exchange: "F",
        quoteCurrency: "USD",
      }),
    ]);

    expect(estimateFxProviderCallsForTargets(targets)).toBe(1);
  });
});

describe("snapshot cron confirmed listings", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetMarketSnapshotServiceForTests();
    loadPricesForTargetsMock.mockReset();
    loadPricesForTargetsMock.mockResolvedValue({
      success: true,
      baseCurrency: "EUR",
      fxRates: { EUR: 1, USD_TO_EUR: 0.92, GBP_TO_EUR: null, CHF_TO_EUR: null },
      prices: [],
      errors: [],
      requested: 3,
      received: 3,
      generatedAt: new Date().toISOString(),
      cache: { enabled: true, durationSeconds: 720 },
      metrics: { providerCalls: 3 },
    });
  });

  it("keeps confirmed mixed-currency listings warm in the EU snapshot", async () => {
    vi.spyOn(snapshotListings, "collectSnapshotListings").mockResolvedValue([
      listing({
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
        isin: "IE00B3XXRP09",
      }),
      listing({
        providerSymbol: "STRC.AS",
        exchange: "AS",
        quoteCurrency: "USD",
        isin: "NL0015001K93",
      }),
      listing({
        providerSymbol: "IWDA.F",
        exchange: "F",
        quoteCurrency: "USD",
        isin: "IE00B4L5Y983",
      }),
      listing({
        providerSymbol: "QQQQ.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
      }),
    ]);

    const result = await runScheduledMarketSnapshot({
      slot: "eu_open",
      now: EU_OPEN,
    });

    expect(result.ok).toBe(true);
    expect(result.skipped).toBe(false);
    expect(loadPricesForTargetsMock).toHaveBeenCalledOnce();

    const targets = loadPricesForTargetsMock.mock.calls[0]?.[0] as
      | ResolvedPriceTarget[]
      | undefined;
    const options = loadPricesForTargetsMock.mock.calls[0]?.[1] as
      | { forceRefresh?: boolean }
      | undefined;

    expect(options).toEqual({ forceRefresh: true });
    expect(targets?.map((row) => row.providerSymbol).sort()).toEqual([
      "IWDA.F",
      "QQQQ.AS",
      "STRC.AS",
      "VUSA.AS",
    ]);
    expect(targets?.find((row) => row.providerSymbol === "VUSA.AS")?.currency).toBe(
      "EUR",
    );
    expect(targets?.find((row) => row.providerSymbol === "STRC.AS")?.currency).toBe(
      "USD",
    );
    expect(targets?.find((row) => row.providerSymbol === "IWDA.F")?.currency).toBe(
      "USD",
    );
    expect(targets?.find((row) => row.providerSymbol === "QQQQ.AS")?.currency).toBe(
      "EUR",
    );
    expect(result.symbolsRequested).toBe(4);
  });
});
