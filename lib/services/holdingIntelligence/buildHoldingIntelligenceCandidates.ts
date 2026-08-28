/**
 * Build one intelligence candidate per eligible holding.
 * Uses existing daily performance, contribution pp, exposure classification,
 * and already-fetched news matches. No provider calls.
 */

import { summarizeDailyPerformance } from "@/lib/client/dailyPerformance";
import {
  buildValuedPositions,
  getHoldingMarketValue,
} from "@/lib/client/portfolioAnalysis";
import {
  classifyHoldingExposure,
  isBitcoinHolding,
  isCryptoIntelligenceHolding,
} from "@/lib/services/classification";
import {
  classifyHoldingNewsMatchType,
  resolveHoldingExplanation,
  selectBestHoldingNewsItem,
} from "@/lib/services/holdingIntelligence/attachHoldingNews";
import type { HoldingIntelligenceCandidate } from "@/lib/services/holdingIntelligence/types";
import {
  buildDayContributions,
  weightMapFromValuedPositions,
} from "@/lib/services/personalIntelligence/contribution";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function isEtfLike(holding: StoredPortfolioHolding): boolean {
  const type = (holding.providerInstrumentType ?? "").toLowerCase();
  if (/\betf\b|\betc\b|\betn\b/.test(type)) return true;
  const name = `${holding.name} ${holding.instrumentName ?? ""}`.toLowerCase();
  if (/\betf\b|\bucits\b/.test(name)) return true;
  const classified = classifyHoldingExposure(holding);
  if (
    classified.fundCategory &&
    /\betf\b|\bucits\b/i.test(classified.fundCategory)
  ) {
    return true;
  }
  return false;
}

export function buildHoldingIntelligenceCandidates(input: {
  holdings: StoredPortfolioHolding[];
  newsItems?: NewsContentItem[] | null;
}): HoldingIntelligenceCandidate[] {
  const eligible = input.holdings.filter(
    (holding) => holding.assetType !== "cash",
  );
  const newsItems = input.newsItems ?? [];
  const snapshot = summarizeDailyPerformance(eligible);
  const { valuedPositions } = buildValuedPositions(eligible);
  const weightMap = weightMapFromValuedPositions(valuedPositions);
  const contributions = buildDayContributions(snapshot.performers, weightMap);
  const contributionById = new Map(
    snapshot.performers.map((performer, index) => [
      performer.holding.id,
      contributions[index] ?? null,
    ]),
  );

  return eligible.map((holding) => {
    const classified = classifyHoldingExposure(holding);
    const contribution = contributionById.get(holding.id) ?? null;
    const performer = snapshot.performers.find(
      (row) => row.holding.id === holding.id,
    );
    const value = getHoldingMarketValue(holding);
    const valueAvailable = value != null && value > 0;
    const attached = selectBestHoldingNewsItem(newsItems, holding);
    const relevanceScore = attached.item?.relevanceScore ?? null;
    const matchType =
      attached.item != null && relevanceScore != null
        ? classifyHoldingNewsMatchType(relevanceScore, attached.item, holding)
        : "none";
    const etfLike = isEtfLike(holding);
    const bitcoin = isBitcoinHolding(holding);
    const explanation = resolveHoldingExplanation({
      matchType,
      isEtfLike: etfLike,
      matchedCount: attached.matchedCount,
      isBitcoin: bitcoin,
    });

    const changePercent =
      performer != null && Number.isFinite(performer.changePercent)
        ? performer.changePercent
        : null;
    const move =
      performer != null && Number.isFinite(performer.move)
        ? performer.move
        : null;

    return {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      providerSymbol: holding.providerSymbol ?? null,
      assetType: holding.assetType ?? "investment",
      exposureGroupId: classified.normalizedGroupId,
      isBitcoin: bitcoin,
      isCrypto: isCryptoIntelligenceHolding(holding),
      isEtfLike: etfLike,
      changePercent,
      move,
      weightPercent:
        weightMap.get(holding.symbol.trim().toUpperCase()) ?? null,
      contributionPp: contribution?.contributionPp ?? null,
      moveAvailable: performer != null,
      valueAvailable,
      explanationStatus: explanation.status,
      matchType,
      relevanceScore,
      confidence: explanation.confidence,
      evidenceTimestamp: attached.item?.publishedAt ?? null,
      newsItem: attached.item,
      newsItemCount: attached.matchedCount,
      explanationNote: explanation.note,
    };
  });
}
