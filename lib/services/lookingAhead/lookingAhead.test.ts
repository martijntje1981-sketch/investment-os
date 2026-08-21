import { describe, expect, it } from "vitest";

import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { buildLookingAhead } from "@/lib/services/lookingAhead";
import {
  LOOKING_AHEAD_MODELED_BADGE,
  LOOKING_AHEAD_QUIET_HEADLINE,
} from "@/lib/services/lookingAhead";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    name: partial.name ?? partial.symbol,
    purchasePrice: partial.purchasePrice ?? partial.currentPrice,
    currency: "EUR",
    assetType: partial.assetType ?? "investment",
    ...partial,
  };
}

function event(
  partial: Partial<UpcomingMarketEvent> & Pick<UpcomingMarketEvent, "id" | "title">,
): UpcomingMarketEvent {
  return {
    category: "fed",
    date: "2026-08-26",
    timeLabel: "14:00",
    country: "US",
    description: partial.title,
    impact: "High",
    source: "test",
    ...partial,
  };
}

describe("Looking Ahead composition", () => {
  it("ranks a Bitcoin-sensitive portfolio by modeled impact, not a generic Fed event", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 100_000,
        assetType: "crypto",
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [event({ id: "fed", title: "FOMC decision" })],
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(model.status).toBe("ready");
    expect(model.primaryKind).toBe("modeled_scenario");
    expect(model.scenarioId).toBe("bitcoin_minus_20");
    expect(model.headline).toMatch(/If Bitcoin fell 20%/);
    expect(model.headline).toMatch(/modeled portfolio impact/);
    expect(model.headline).not.toMatch(/will fall/i);
    expect(model.modeledDisclaimer).toBe(LOOKING_AHEAD_MODELED_BADGE);
    expect(model.event).toBeNull();
  });

  it("does not hardcode Bitcoin for an equity portfolio", () => {
    const holdings = [
      holding({
        id: "vwce",
        symbol: "VWCE",
        name: "FTSE All-World",
        quantity: 100,
        currentPrice: 120,
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(model.status).toBe("ready");
    expect(model.headline).not.toMatch(/Bitcoin/i);
    expect(model.headline).not.toMatch(/will fall/i);
    if (model.primaryKind === "modeled_scenario") {
      expect(model.headline).toMatch(/classified equities|crypto/i);
      expect(model.scenarioId).not.toBe("bitcoin_minus_20");
    }
  });

  it("omits a generic Fed event unless fixed income is material", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 80_000,
        assetType: "crypto",
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [event({ id: "fed", title: "Federal Reserve decision", category: "fed" })],
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(model.event).toBeNull();
  });

  it("includes an upcoming event only when it matches a holding", () => {
    const holdings = [
      holding({
        id: "aapl",
        symbol: "AAPL",
        name: "Apple",
        quantity: 20,
        currentPrice: 200,
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [
        event({ id: "fed", title: "FOMC decision", category: "fed" }),
        event({
          id: "earn",
          title: "AAPL earnings",
          category: "earnings",
          date: "2026-08-25",
        }),
      ],
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(model.event?.title).toMatch(/AAPL earnings/);
  });

  it("includes a rates event only when fixed income is material", () => {
    const holdings = [
      holding({
        id: "ibtm",
        symbol: "IBTM",
        name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
        quantity: 200,
        currentPrice: 80,
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [event({ id: "fed", title: "FOMC decision", category: "fed" })],
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(buildPortfolioExposureAllocation(holdings).fixedIncome?.weightPercent ?? 0).toBeGreaterThanOrEqual(8);
    expect(model.event?.title).toMatch(/FOMC/i);
  });

  it("uses a quiet state when nothing material stands out", () => {
    const holdings = [
      holding({
        id: "cash",
        symbol: "EUR",
        name: "Euro",
        quantity: 95_000,
        currentPrice: 1,
        assetType: "cash",
      }),
      holding({
        id: "vwce",
        symbol: "VWCE",
        name: "FTSE All-World",
        quantity: 1,
        currentPrice: 100,
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [event({ id: "macro", title: "GDP", category: "macro" })],
      intelligenceDepth: "complete",
      today: "2026-08-21",
    });
    expect(model.status).toBe("quiet");
    expect(model.headline).toBe(LOOKING_AHEAD_QUIET_HEADLINE);
    expect(model.event).toBeNull();
    expect(model.facts).toHaveLength(0);
  });

  it("does not fabricate a candidate from empty holdings", () => {
    const model = buildLookingAhead({ holdings: [] });
    expect(model.status).toBe("unavailable");
    expect(model.primaryKind).toBe("none");
    expect(model.facts).toHaveLength(0);
  });

  it("Free keeps the modeled headline without leaking extra event evidence", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 70_000,
        assetType: "crypto",
      }),
    ];
    const model = buildLookingAhead({
      holdings,
      allocation: buildPortfolioExposureAllocation(holdings),
      resilience: buildResilienceProfile({ holdings }),
      upcomingEvents: [event({ id: "fed", title: "FOMC decision" })],
      intelligenceDepth: "free",
      today: "2026-08-21",
    });
    expect(model.status).toBe("ready");
    expect(model.facts.length).toBeLessThanOrEqual(1);
    expect(model.event).toBeNull();
    expect(model.modeledDisclaimer).toBe(LOOKING_AHEAD_MODELED_BADGE);
  });
});
