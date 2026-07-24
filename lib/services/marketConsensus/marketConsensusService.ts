import { getEodhdApiKey, matchInstrument } from "@/lib/services/instruments";
import { classifyMarketConsensusHolding } from "@/lib/client/marketConsensus/holdingClassification";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { getCachedMarketConsensus } from "@/lib/services/marketConsensus/cache/consensusCache";
import { buildPortfolioConsensusSummary } from "@/lib/services/marketConsensus/buildPortfolioConsensusSummary";
import { normalizeConsensusResultForHolding } from "@/lib/services/marketConsensus/normalizeConsensusAvailability";
import {
  buildStaticConsensusResult,
  getConfiguredMarketConsensusProviders,
  selectMarketConsensusProvider,
} from "@/lib/services/marketConsensus/providers/registry";
import { enrichMarketConsensusResults } from "@/lib/services/marketConsensus/narrative/marketConsensusNarrativeService";
import type {
  AnalystConsensusResult,
  MarketConsensusProvider,
  PortfolioConsensusSummary,
} from "@/lib/services/marketConsensus/types";
import { validateAndSanitizeConsensusResult } from "@/lib/services/marketConsensus/validateConsensusResult";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type MarketConsensusServiceContext = {
  fxRateToEur: number | null;
  providerAvailable: boolean;
  providers?: MarketConsensusProvider[];
};

let serviceContextOverride: Partial<MarketConsensusServiceContext> | null = null;

export function resetMarketConsensusServiceForTests(): void {
  serviceContextOverride = null;
}

export function configureMarketConsensusServiceForTests(
  override: Partial<MarketConsensusServiceContext>,
): void {
  serviceContextOverride = override;
}

function resolveServiceContext(): MarketConsensusServiceContext {
  let providerAvailable = true;
  try {
    getEodhdApiKey();
  } catch {
    providerAvailable = false;
  }

  return {
    fxRateToEur: null,
    providerAvailable,
    providers: getConfiguredMarketConsensusProviders(),
    ...serviceContextOverride,
  };
}

function buildConsensusCacheKey(holding: StoredPortfolioHolding): string {
  const providerSymbol =
    holding.providerSymbol?.trim().toUpperCase() ??
    holding.symbol.trim().toUpperCase();
  return `${holding.id}:${providerSymbol}:${classifyMarketConsensusHolding(holding)}`;
}

async function fetchEquityConsensus(
  holding: StoredPortfolioHolding,
  context: MarketConsensusServiceContext,
): Promise<AnalystConsensusResult> {
  const provider =
    selectMarketConsensusProvider(holding, context.providers) ??
    getConfiguredMarketConsensusProviders().at(-1)!;

  try {
    const result = await provider.getConsensus(holding, {
      fxRateToEur: context.fxRateToEur,
    });
    return validateAndSanitizeConsensusResult(result);
  } catch {
    return validateAndSanitizeConsensusResult(
      buildStaticConsensusResult(holding),
    );
  }
}

export async function getMarketConsensusForHolding(
  holding: StoredPortfolioHolding,
  context: MarketConsensusServiceContext = resolveServiceContext(),
): Promise<AnalystConsensusResult> {
  const category = classifyMarketConsensusHolding(holding);
  const isFundLike = inferAnalystCoverageKind(holding) === "fund_or_etc";

  if (category !== "equity" || isFundLike) {
    return validateAndSanitizeConsensusResult(buildStaticConsensusResult(holding));
  }

  if (!context.providerAvailable) {
    return validateAndSanitizeConsensusResult(buildStaticConsensusResult(holding));
  }

  const cacheKey = buildConsensusCacheKey(holding);

  try {
    const result = await getCachedMarketConsensus(cacheKey, () =>
      fetchEquityConsensus(holding, context),
    );
    return normalizeConsensusResultForHolding(holding, result);
  } catch {
    return validateAndSanitizeConsensusResult(
      buildStaticConsensusResult(holding),
    );
  }
}

export async function getMarketConsensusForPortfolio(
  holdings: StoredPortfolioHolding[],
  context: MarketConsensusServiceContext = resolveServiceContext(),
): Promise<AnalystConsensusResult[]> {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");

  return Promise.all(
    investments.map((holding) => getMarketConsensusForHolding(holding, context)),
  );
}

export async function getMarketConsensusBundle(
  holdings: StoredPortfolioHolding[],
  context: MarketConsensusServiceContext = resolveServiceContext(),
): Promise<{
  results: AnalystConsensusResult[];
  summary: PortfolioConsensusSummary;
}> {
  const results = await getMarketConsensusForPortfolio(holdings, context);
  const holdingsById = new Map(
    holdings
      .filter((holding) => holding.assetType !== "cash")
      .map((holding) => [holding.id, { name: holding.name }]),
  );
  const enrichedResults = await enrichMarketConsensusResults(
    results,
    holdingsById,
  );
  const summary = buildPortfolioConsensusSummary(holdings, enrichedResults, {
    providerAvailable: context.providerAvailable,
  });

  return { results: enrichedResults, summary };
}

export async function resolveProviderSymbolForConsensus(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "name" | "isin" | "exchange" | "providerSymbol"
  >,
): Promise<string | null> {
  if (holding.providerSymbol?.trim()) {
    return holding.providerSymbol.trim().toUpperCase();
  }

  const resolved = await matchInstrument({
    ticker: holding.symbol || null,
    isin: holding.isin ?? null,
    exchange: holding.exchange ?? null,
    instrumentName: holding.name ?? null,
    assetType: "investment",
  });

  return resolved.providerSymbol;
}
