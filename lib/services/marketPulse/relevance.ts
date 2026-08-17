/**
 * Portfolio relevance scoring and deterministic “why it matters” copy.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  allHeroPeriodsAreSameDayFraming,
  isHeroComparablePeriod,
} from "@/lib/services/marketPulse/quoteModel";
import type {
  MarketPulseAsset,
  MarketPulseHeroDriver,
  MarketPulseRelationship,
} from "@/lib/services/marketPulse/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type HeroMarketDriver = MarketPulseHeroDriver;

const WHY_BY_MARKET: Record<string, string> = {
  bitcoin:
    "Bitcoin prices influence your crypto and Bitcoin-linked holdings.",
  ethereum: "Ethereum prices influence your ETH exposure.",
  solana: "Solana prices influence your SOL exposure.",
  xrp: "XRP prices influence your XRP exposure.",
  bnb: "BNB prices influence your BNB exposure.",
  cardano: "Cardano prices influence your ADA exposure.",
  dogecoin: "Dogecoin prices influence your DOGE exposure.",
  shiba_inu: "Shiba Inu prices influence your SHIB exposure.",
  copper:
    "Copper (ETF Proxy) relates to your mining ETF exposure — not spot copper.",
  uranium:
    "Uranium (ETF Proxy) relates to your nuclear or uranium ETF holdings — not uranium spot.",
  gold: "Gold FX spot (XAU/USD) moves relate to precious-metal exposure in your holdings.",
  silver: "Silver FX spot (XAG/USD) moves relate to precious-metal exposure in your holdings.",
  technology_ai:
    "Technology and AI market moves relate to your thematic equity exposure.",
  global_equities:
    "Global equity markets affect your diversified holdings.",
};

function relationshipLine(
  relationship: MarketPulseRelationship | undefined,
  weightPercent: number | null,
): string {
  if (relationship === "Direct exposure" && weightPercent !== null && weightPercent >= 15) {
    return "This is currently among the largest direct drivers of your portfolio.";
  }
  if (relationship === "Direct exposure") {
    return "This market has a direct link to one or more of your holdings.";
  }
  if (relationship === "Thematic exposure") {
    return "This market is thematically linked to your holdings.";
  }
  if (relationship === "Broad-market exposure") {
    return "This broad market affects your diversified equity holdings.";
  }
  if (relationship === "Proxy exposure") {
    return "Your link is through a labelled proxy, not a spot series.";
  }
  return "This market is connected to your current holdings.";
}

export function portfolioValueMap(
  holdings: StoredPortfolioHolding[],
): { total: number; byId: Map<string, number> } {
  const byId = new Map<string, number>();
  let total = 0;
  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding);
    if (value === null || value <= 0) continue;
    byId.set(holding.id, value);
    total += value;
  }
  return { total, byId };
}

export function linkedPortfolioWeightPercent(
  asset: MarketPulseAsset,
  valueByHoldingId: Map<string, number>,
  totalValue: number,
): number | null {
  if (totalValue <= 0 || asset.portfolioLinks.length === 0) return null;
  let linked = 0;
  for (const link of asset.portfolioLinks) {
    linked += valueByHoldingId.get(link.holdingId) ?? 0;
  }
  if (linked <= 0) return null;
  return (linked / totalValue) * 100;
}

export function buildRelevanceWhy(
  asset: MarketPulseAsset,
  weightPercent: number | null,
  isLargestDirectDriver: boolean,
): string {
  const base =
    WHY_BY_MARKET[asset.id] ??
    `${asset.name} is connected to holdings in your portfolio.`;
  const relationship = asset.portfolioLinks[0]?.relationship;
  const second = relationshipLine(relationship, weightPercent);
  if (isLargestDirectDriver) {
    return `${asset.name} is currently the largest direct driver of your portfolio.\nLinked through ${asset.portfolioLinks.map((l) => l.symbol).join(", ")}.`;
  }
  return `${base}\n${second}`;
}

export function attachRelevance(
  assets: MarketPulseAsset[],
  holdings: StoredPortfolioHolding[],
): MarketPulseAsset[] {
  const { total, byId } = portfolioValueMap(holdings);
  const withWeights = assets.map((asset) => ({
    ...asset,
    portfolioWeightPercent: linkedPortfolioWeightPercent(asset, byId, total),
    relevanceWhy: null as string | null,
  }));

  let largestDirectId: string | null = null;
  let largestDirectWeight = -1;
  for (const asset of withWeights) {
    if (
      asset.portfolioLinks.some((link) => link.relationship === "Direct exposure") &&
      (asset.portfolioWeightPercent ?? 0) > largestDirectWeight
    ) {
      largestDirectWeight = asset.portfolioWeightPercent ?? 0;
      largestDirectId = asset.id;
    }
  }

  return withWeights.map((asset) => ({
    ...asset,
    relevanceWhy:
      asset.portfolioLinks.length > 0
        ? buildRelevanceWhy(
            asset,
            asset.portfolioWeightPercent,
            asset.id === largestDirectId && largestDirectWeight >= 15,
          )
        : null,
  }));
}

export function sortByPortfolioRelevance(
  assets: MarketPulseAsset[],
): MarketPulseAsset[] {
  return [...assets].sort((a, b) => {
    const aw = a.portfolioWeightPercent ?? 0;
    const bw = b.portfolioWeightPercent ?? 0;
    if (bw !== aw) return bw - aw;
    const ac = Math.abs(a.quoteChangePercent ?? 0);
    const bc = Math.abs(b.quoteChangePercent ?? 0);
    if (bc !== ac) return bc - ac;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Hero ranking uses quoteChangePercent only among daily/session-comparable
 * assets. Chart/momentum period moves are never included.
 */
export function buildHeroMarketDriver(
  linked: MarketPulseAsset[],
): HeroMarketDriver {
  if (linked.length === 0) {
    return {
      kind: "unavailable",
      marketId: null,
      name: null,
      changePercent: null,
      changePeriod: null,
      portfolioWeightPercent: null,
      summary:
        "Add valued holdings to see which markets are moving your portfolio.",
      usesTodayWording: false,
    };
  }

  const comparable = linked.filter(
    (asset) =>
      asset.quoteChangePercent !== null &&
      isHeroComparablePeriod(asset.quoteChangePeriod),
  );

  if (comparable.length === 0) {
    return {
      kind: "distributed",
      marketId: null,
      name: null,
      changePercent: null,
      changePeriod: null,
      portfolioWeightPercent: null,
      summary:
        "Latest portfolio-linked market moves are not yet comparable on a daily or session basis.",
      usesTodayWording: false,
    };
  }

  const periods = comparable.map((asset) => asset.quoteChangePeriod);
  const usesTodayWording = allHeroPeriodsAreSameDayFraming(periods);

  const scored = comparable
    .map((asset) => {
      const weight = asset.portfolioWeightPercent ?? 0;
      const move = asset.quoteChangePercent!;
      const impact = Math.abs(move) * Math.max(weight, 1);
      return { asset, impact, move, weight };
    })
    .sort((a, b) => b.impact - a.impact);

  const top = scored[0];
  const second = scored[1];
  const dominant =
    top &&
    top.weight >= 12 &&
    (!second || top.impact >= second.impact * 1.35 || top.weight >= 25);

  if (dominant && top) {
    return {
      kind: "dominant",
      marketId: top.asset.id,
      name: top.asset.name,
      changePercent: top.move,
      changePeriod: top.asset.quoteChangePeriod,
      portfolioWeightPercent: top.weight > 0 ? top.weight : null,
      summary: usesTodayWording
        ? "Today's biggest market driver"
        : "Latest biggest market move",
      usesTodayWording,
    };
  }

  return {
    kind: "distributed",
    marketId: null,
    name: null,
    changePercent: null,
    changePeriod: null,
    portfolioWeightPercent: null,
    summary: usesTodayWording
      ? "Today's portfolio-linked market moves are broadly distributed across several exposures."
      : "Latest portfolio-linked market moves are broadly distributed across several exposures.",
    usesTodayWording,
  };
}
