import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildMarketConsensusViewModel } from "@/lib/client/marketConsensus/buildMarketConsensusViewModel";
import {
  buildMarketConsensusNarrativeInput,
  shouldAttemptAiNarrative,
  shouldEnrichResultWithNarrative,
} from "@/lib/services/marketConsensus/narrative/buildNarrativeInput";
import { buildDeterministicMarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/deterministicNarrative";
import {
  configureMarketConsensusNarrativeServiceForTests,
  enrichConsensusResultWithNarrative,
  generateMarketConsensusNarrative,
  getMarketConsensusNarrativeForHolding,
  resetMarketConsensusNarrativeServiceForTests,
} from "@/lib/services/marketConsensus/narrative/marketConsensusNarrativeService";
import {
  getCachedMarketConsensusNarrative,
  hashMarketConsensusNarrativeInput,
  resetMarketConsensusNarrativeCacheForTests,
} from "@/lib/services/marketConsensus/narrative/narrativeCache";
import type { MarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/types";
import { validateMarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/validateNarrative";
import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";

function equityResult(
  overrides: Partial<AnalystConsensusResult> = {},
): AnalystConsensusResult {
  return {
    instrumentId: "eq-1",
    symbol: "DEMO",
    coverageType: "equity-analyst",
    availability: "available",
    classification: "positive",
    analystCount: 12,
    buyCount: 8,
    holdCount: 3,
    sellCount: 1,
    impliedUpsidePercent: 8.5,
    agreementLevel: "high",
    sourceName: "Test provider",
    updatedAt: "2026-07-24T12:00:00.000Z",
    ...overrides,
  };
}

describe("market consensus narrative", () => {
  beforeEach(() => {
    resetMarketConsensusNarrativeCacheForTests();
    resetMarketConsensusNarrativeServiceForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("accepts valid equity narrative output", async () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult(),
      "Demo Equity",
    );
    const narrative: MarketConsensusNarrative = {
      summary:
        "Third-party analyst sentiment is currently positive, with relatively high agreement across available coverage. Valuation and market conditions remain relevant risks.",
      supportingFactors: ["Analyst views are relatively aligned"],
      riskFactors: ["Forecasts may change as new data emerges"],
      generatedAt: new Date().toISOString(),
      model: "test-model",
    };

    expect(validateMarketConsensusNarrative(narrative, input)).not.toBeNull();
  });

  it("uses cautious fallback for limited coverage", async () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult({
        availability: "limited",
        classification: "unavailable",
        analystCount: 2,
        buyCount: 1,
        holdCount: 1,
        sellCount: 0,
      }),
      "Demo Equity",
    );

    const generated = await generateMarketConsensusNarrative(input);

    expect(generated.source).toBe("fallback");
    expect(generated.narrative.summary).toMatch(/limited/i);
    expect(shouldAttemptAiNarrative(input)).toBe(false);
  });

  it("never uses Buy/Hold/Sell language in crypto fallback", async () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult({
        instrumentId: "btc-1",
        coverageType: "crypto-market-outlook",
        availability: "limited",
        classification: "unavailable",
        analystCount: undefined,
        buyCount: undefined,
        holdCount: undefined,
        sellCount: undefined,
      }),
      "Bitcoin ETP",
    );

    const narrative = buildDeterministicMarketConsensusNarrative(input);
    const combined = [
      narrative.summary,
      ...narrative.supportingFactors,
      ...narrative.riskFactors,
    ].join(" ");

    expect(combined).not.toMatch(/\bbuy\b|\bhold\b|\bsell\b/i);
    expect(combined).toMatch(/less standardized/i);
  });

  it("does not enrich unsupported unavailable holdings", async () => {
    const result = equityResult({
      coverageType: "unavailable",
      availability: "unavailable",
    });

    expect(shouldEnrichResultWithNarrative(result)).toBe(false);
    await expect(
      enrichConsensusResultWithNarrative(result, "Unknown"),
    ).resolves.toEqual(result);
  });

  it("rejects invalid AI output", () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult(),
      "Demo Equity",
    );

    expect(
      validateMarketConsensusNarrative(
        {
          summary: "You should buy this stock now.",
          supportingFactors: ["Strong opportunity"],
          riskFactors: ["None"],
          generatedAt: new Date().toISOString(),
        },
        input,
      ),
    ).toBeNull();
  });

  it("rejects recommendation phrases", () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult(),
      "Demo Equity",
    );

    expect(
      validateMarketConsensusNarrative(
        {
          summary: "We recommend accumulating shares because upside is guaranteed.",
          supportingFactors: ["Positive revisions"],
          riskFactors: ["Market volatility"],
          generatedAt: new Date().toISOString(),
        },
        input,
      ),
    ).toBeNull();
  });

  it("rejects unsupported numbers", () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult({ analystCount: 12 }),
      "Demo Equity",
    );

    expect(
      validateMarketConsensusNarrative(
        {
          summary:
            "Third-party coverage from 25 analysts points to a constructive outlook, though risks remain.",
          supportingFactors: ["Broad analyst sample"],
          riskFactors: ["Valuation risk"],
          generatedAt: new Date().toISOString(),
        },
        input,
      ),
    ).toBeNull();
  });

  it("returns deterministic fallback when AI fails", async () => {
    const input = buildMarketConsensusNarrativeInput(
      equityResult(),
      "Demo Equity",
    );

    configureMarketConsensusNarrativeServiceForTests({
      apiKey: "test-key",
      generateWithAi: async () => {
        throw new Error("rate limited");
      },
    });

    const generated = await generateMarketConsensusNarrative(input);
    expect(generated.source).toBe("fallback");
    expect(generated.narrative.summary.length).toBeGreaterThan(0);
  });

  it("cache prevents duplicate AI calls", async () => {
    const fetchMock = vi.fn(async () => ({
      narrative: {
        summary:
          "Third-party analyst sentiment is currently positive, with relatively high agreement across available coverage. Valuation remains an important risk.",
        supportingFactors: ["Analyst views are relatively aligned"],
        riskFactors: ["Forecasts may change as new data emerges"],
        generatedAt: new Date().toISOString(),
        model: "test-model",
      },
      source: "ai" as const,
    }));

    configureMarketConsensusNarrativeServiceForTests({
      apiKey: "test-key",
      generateWithAi: fetchMock,
    });

    const result = equityResult();
    await getMarketConsensusNarrativeForHolding(result, "Demo Equity");
    await getMarketConsensusNarrativeForHolding(result, "Demo Equity");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("invalidates narrative cache when input changes", async () => {
    const key = "eq-1";
    const firstInput = buildMarketConsensusNarrativeInput(
      equityResult({ analystCount: 10 }),
      "Demo Equity",
    );
    const secondInput = buildMarketConsensusNarrativeInput(
      equityResult({ analystCount: 11 }),
      "Demo Equity",
    );

    const fetchMock = vi.fn(async () => ({
      narrative: buildDeterministicMarketConsensusNarrative(firstInput),
      source: "fallback" as const,
    }));

    await getCachedMarketConsensusNarrative(
      key,
      hashMarketConsensusNarrativeInput(firstInput),
      fetchMock,
    );
    await getCachedMarketConsensusNarrative(
      key,
      hashMarketConsensusNarrativeInput(secondInput),
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("isolates one holding failure from others", async () => {
    configureMarketConsensusNarrativeServiceForTests({
      apiKey: "test-key",
      generateWithAi: async (input) => {
        if (input.symbol === "FAIL") {
          throw new Error("provider failed");
        }

        return {
          summary:
            "Third-party analyst sentiment is currently positive, with relatively high agreement across available coverage. Valuation remains an important risk.",
          supportingFactors: ["Analyst views are relatively aligned"],
          riskFactors: ["Forecasts may change as new data emerges"],
          generatedAt: new Date().toISOString(),
          model: "test-model",
        };
      },
    });

    const ok = await enrichConsensusResultWithNarrative(
      equityResult({ instrumentId: "ok-1", symbol: "OK" }),
      "OK Equity",
    );
    const failed = await enrichConsensusResultWithNarrative(
      equityResult({ instrumentId: "fail-1", symbol: "FAIL" }),
      "Fail Equity",
    );

    expect(ok.narrativeSource).toBe("ai");
    expect(failed.narrativeSource).toBe("fallback");
    expect(failed.summary).toMatch(/third-party/i);
  });

  it("production view model never marks demo narrative as real", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const viewModel = buildMarketConsensusViewModel({
      valuedPositions: [
        {
          holding: {
            id: "eq-1",
            symbol: "DEMO",
            name: "Demo Equity",
            quantity: 1,
            purchasePrice: 100,
            currentPrice: 110,
            currency: "EUR",
            assetType: "investment",
          },
          value: 110,
          weightPercent: 100,
        },
      ],
      unvaluedHoldings: [],
      results: [
        {
          ...equityResult(),
          summary: "Third-party analyst sentiment is currently positive.",
          positiveFactors: ["Aligned analyst views"],
          riskFactors: ["Valuation risk"],
          narrativeSource: "ai",
        },
      ],
      summary: {
        summary: "Third-party analyst coverage is available for 1 of 1 investment holdings.",
        holdingsWithCoverage: 1,
        positiveConsensus: 1,
        mixedConsensus: 0,
        limitedCoverage: 0,
        totalInvestments: 1,
        providerAvailable: true,
        generatedAt: "2026-07-24T12:00:00.000Z",
      },
      isLoading: false,
    });

    expect(viewModel.holdingCards.every((card) => !card.isDemoData)).toBe(true);
    expect(
      viewModel.holdingCards.some((card) => card.narrativeLabel?.includes("Demo")),
    ).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });
});
