import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import { listTrustedRelatedRelationships } from "@/lib/services/discover/relatedInstrumentMappings";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsApiResponse } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

import type { HoldingSpotlight, RelatedInstrument, RelatedInvestmentGroups } from "./types";

const MAX_RELATED = 3;

function holdingMarketValue(holding: StoredPortfolioHolding): number {
  return Math.max(0, holding.quantity) * Math.max(0, holding.currentPrice);
}

function isEligibleSpotlightHolding(holding: StoredPortfolioHolding): boolean {
  if (holding.assetType === "cash") return false;
  return Boolean(lookupInstrumentResearchProfile(holding.providerSymbol));
}

function scoreHoldingForSpotlight(
  holding: StoredPortfolioHolding,
  intelligence: InvestmentIntelligence | null,
  newsPayload: NewsApiResponse | null,
): number {
  const symbol = holding.symbol.toUpperCase();
  let score = 0;

  if (intelligence?.holdingInsights.negative.includes(symbol)) score += 100;
  if (intelligence?.holdingInsights.positive.includes(symbol)) score += 60;
  if (intelligence?.mustWatch?.itemId && newsPayload) {
    const mustWatchSymbols =
      newsPayload.portfolioNews.find((item) => item.id === intelligence.mustWatch?.itemId)
        ?.matchedSymbols ?? [];
    if (mustWatchSymbols.includes(symbol)) score += 80;
  }

  const matchedNewsCount =
    newsPayload?.portfolioNews.filter((item) =>
      item.matchedSymbols.some((matched) => matched.toUpperCase() === symbol),
    ).length ?? 0;
  score += matchedNewsCount * 20;

  score += Math.log10(Math.max(holdingMarketValue(holding), 1)) * 10;
  return score;
}

function dailyRotationIndex(eligibleCount: number, date = new Date()): number {
  if (eligibleCount <= 0) return 0;
  const dayKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}-${date.getUTCDate()}`;
  let hash = 0;
  for (let index = 0; index < dayKey.length; index += 1) {
    hash = (hash + dayKey.charCodeAt(index) * (index + 1)) % eligibleCount;
  }
  return hash;
}

function buildRelatedInstrument(
  relatedProviderSymbol: string,
  relationshipLabel: string,
  researchContext: string,
): RelatedInstrument | null {
  const verified = lookupVerifiedByProviderSymbol(relatedProviderSymbol);
  if (!verified) return null;

  return {
    providerSymbol: verified.providerSymbol,
    symbol: verified.ticker,
    name: verified.instrumentName,
    exchange: verified.exchange,
    relationshipLabel,
    researchContext,
    oneYearReturn: {
      available: false,
      label: "1-year return unavailable",
    },
  };
}

function buildRelatedForHolding(
  holding: StoredPortfolioHolding,
): RelatedInstrument[] {
  const relationships = listTrustedRelatedRelationships(holding.providerSymbol);
  const related: RelatedInstrument[] = [];
  const seen = new Set<string>([
    holding.providerSymbol?.toUpperCase() ?? holding.symbol.toUpperCase(),
  ]);

  for (const relationship of relationships) {
    if (related.length >= MAX_RELATED) break;
    const normalized = relationship.relatedProviderSymbol.toUpperCase();
    if (seen.has(normalized)) continue;

    const instrument = buildRelatedInstrument(
      relationship.relatedProviderSymbol,
      relationship.relationshipLabel,
      relationship.researchContext,
    );
    if (!instrument) continue;

    seen.add(normalized);
    related.push(instrument);
  }

  return related;
}

export function selectHoldingSpotlight(input: {
  holdings: StoredPortfolioHolding[];
  intelligence: InvestmentIntelligence | null;
  newsPayload: NewsApiResponse | null;
  now?: Date;
}): HoldingSpotlight | null {
  const eligible = input.holdings.filter(isEligibleSpotlightHolding);
  if (eligible.length === 0) return null;

  const scored = [...eligible].sort((left, right) => {
    const scoreDiff =
      scoreHoldingForSpotlight(right, input.intelligence, input.newsPayload) -
      scoreHoldingForSpotlight(left, input.intelligence, input.newsPayload);
    if (scoreDiff !== 0) return scoreDiff;
    return holdingMarketValue(right) - holdingMarketValue(left);
  });

  const topScore = scoreHoldingForSpotlight(
    scored[0]!,
    input.intelligence,
    input.newsPayload,
  );
  const topCandidates = scored.filter(
    (holding) =>
      scoreHoldingForSpotlight(holding, input.intelligence, input.newsPayload) ===
      topScore,
  );

  const rotationIndex = dailyRotationIndex(
    topCandidates.length,
    input.now ?? new Date(),
  );
  const selected = topCandidates[rotationIndex] ?? scored[0]!;
  const relatedInstruments = buildRelatedForHolding(selected);

  let selectionReason = "Selected as today's holding spotlight based on verified metadata.";
  if (
    input.intelligence?.holdingInsights.negative.includes(selected.symbol.toUpperCase())
  ) {
    selectionReason =
      "Selected because recent briefing signals are connected to this holding.";
  } else if (
    input.intelligence?.holdingInsights.positive.includes(selected.symbol.toUpperCase())
  ) {
    selectionReason =
      "Selected because recent portfolio developments mention this holding.";
  } else if (holdingMarketValue(selected) > 0) {
    selectionReason =
      "Selected from classified holdings with sufficient verified metadata.";
  }

  return {
    holdingId: selected.id,
    symbol: selected.symbol,
    name: selected.name,
    selectionReason,
    relatedInstruments,
    unavailableMessage:
      relatedInstruments.length === 0
        ? "No verified comparable instruments are available for this holding yet."
        : null,
  };
}

export function buildRelatedInvestmentGroups(input: {
  holdings: StoredPortfolioHolding[];
  intelligence: InvestmentIntelligence | null;
  newsPayload: NewsApiResponse | null;
  now?: Date;
}): RelatedInvestmentGroups {
  const eligibleHoldingIds = input.holdings
    .filter(isEligibleSpotlightHolding)
    .map((holding) => holding.id);

  return {
    spotlight: selectHoldingSpotlight(input),
    eligibleHoldingIds,
  };
}

export { MAX_RELATED };
