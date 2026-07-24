import {
  buildMarketConsensusNarrativeInput,
  shouldAttemptAiNarrative,
  shouldEnrichResultWithNarrative,
} from "@/lib/services/marketConsensus/narrative/buildNarrativeInput";
import { buildDeterministicMarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/deterministicNarrative";
import {
  getCachedMarketConsensusNarrative,
  hashMarketConsensusNarrativeInput,
} from "@/lib/services/marketConsensus/narrative/narrativeCache";
import {
  generateMarketConsensusNarrativeWithOpenAI,
  getOpenAiApiKey,
} from "@/lib/services/marketConsensus/narrative/openaiNarrativeClient";
import type {
  EnrichedAnalystConsensusResult,
  MarketConsensusNarrative,
  MarketConsensusNarrativeInput,
  MarketConsensusNarrativeSource,
} from "@/lib/services/marketConsensus/narrative/types";
import { validateMarketConsensusNarrative } from "@/lib/services/marketConsensus/narrative/validateNarrative";
import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";

type NarrativeServiceOverride = {
  apiKey?: string | null;
  generateWithAi?: (
    input: MarketConsensusNarrativeInput,
  ) => Promise<MarketConsensusNarrative>;
};

let narrativeServiceOverride: NarrativeServiceOverride | null = null;

export function resetMarketConsensusNarrativeServiceForTests(): void {
  narrativeServiceOverride = null;
}

export function configureMarketConsensusNarrativeServiceForTests(
  override: NarrativeServiceOverride,
): void {
  narrativeServiceOverride = override;
}

export async function generateMarketConsensusNarrative(
  input: MarketConsensusNarrativeInput,
): Promise<{ narrative: MarketConsensusNarrative; source: MarketConsensusNarrativeSource }> {
  const fallback = buildDeterministicMarketConsensusNarrative(input);

  if (!shouldAttemptAiNarrative(input)) {
    return { narrative: fallback, source: "fallback" };
  }

  const apiKey = narrativeServiceOverride?.apiKey ?? getOpenAiApiKey();
  if (!apiKey) {
    return { narrative: fallback, source: "fallback" };
  }

  try {
    const generated =
      narrativeServiceOverride?.generateWithAi != null
        ? await narrativeServiceOverride.generateWithAi(input)
        : await generateMarketConsensusNarrativeWithOpenAI(input, apiKey);

    const validated = validateMarketConsensusNarrative(generated, input);
    if (validated) {
      return { narrative: validated, source: "ai" };
    }

    return { narrative: fallback, source: "fallback" };
  } catch {
    return { narrative: fallback, source: "fallback" };
  }
}

export async function getMarketConsensusNarrativeForHolding(
  result: AnalystConsensusResult,
  instrumentName: string,
): Promise<{ narrative: MarketConsensusNarrative; source: MarketConsensusNarrativeSource }> {
  const input = buildMarketConsensusNarrativeInput(result, instrumentName);
  const cacheKey = result.instrumentId;
  const inputHash = hashMarketConsensusNarrativeInput(input);

  return getCachedMarketConsensusNarrative(cacheKey, inputHash, () =>
    generateMarketConsensusNarrative(input),
  );
}

export async function enrichConsensusResultWithNarrative(
  result: AnalystConsensusResult,
  instrumentName: string,
): Promise<EnrichedAnalystConsensusResult> {
  if (!shouldEnrichResultWithNarrative(result)) {
    return result;
  }

  try {
    const { narrative, source } = await getMarketConsensusNarrativeForHolding(
      result,
      instrumentName,
    );

    return {
      ...result,
      summary: narrative.summary,
      positiveFactors: narrative.supportingFactors,
      riskFactors: narrative.riskFactors,
      narrativeSource: source,
    };
  } catch {
    const fallback = buildDeterministicMarketConsensusNarrative(
      buildMarketConsensusNarrativeInput(result, instrumentName),
    );

    return {
      ...result,
      summary: fallback.summary,
      positiveFactors: fallback.supportingFactors,
      riskFactors: fallback.riskFactors,
      narrativeSource: "fallback",
    };
  }
}

export async function enrichMarketConsensusResults(
  results: AnalystConsensusResult[],
  holdingsById: Map<string, { name: string }>,
): Promise<EnrichedAnalystConsensusResult[]> {
  return Promise.all(
    results.map(async (result) => {
      const holding = holdingsById.get(result.instrumentId);
      if (!holding) {
        return result;
      }

      try {
        return await enrichConsensusResultWithNarrative(result, holding.name);
      } catch {
        return result;
      }
    }),
  );
}
