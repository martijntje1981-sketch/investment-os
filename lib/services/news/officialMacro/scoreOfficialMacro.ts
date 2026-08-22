import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { resolveOfficialMacroAssetClass } from "@/lib/services/news/officialMacro/assetClass";
import {
  officialMacroInterpretation,
  officialMacroRelevanceLabel,
} from "@/lib/services/news/officialMacro/copy";
import { matchOfficialMacroRelevance } from "@/lib/services/news/officialMacro/relevanceMap";
import type { OfficialMacroAssetClass } from "@/lib/services/news/officialMacro/types";
import type { NewsContentItem, NewsMatchedHolding } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const OFFICIAL_MACRO_STRONG_SCORE = 16;
export const OFFICIAL_MACRO_CONTEXTUAL_SCORE = 10;
export const OFFICIAL_MACRO_PORTFOLIO_ITEM_CAP = 2;
export const OFFICIAL_MACRO_HOLDING_PAGE_MAX = 1;

const SECTOR_EQUITY_MIN_WEIGHT_PERCENT = 10;

export function isOfficialMacroItem(
  item: Pick<NewsContentItem, "contextKind">,
): boolean {
  return item.contextKind === "macro_official";
}

function holdingWeightPercent(
  holding: StoredPortfolioHolding,
  totalValue: number,
): number | null {
  const value = getHoldingMarketValue(holding);
  if (value == null || !(totalValue > 0)) return null;
  return (value / totalValue) * 100;
}

function allowContextualMatch(
  assetClass: OfficialMacroAssetClass,
  weightPercent: number | null,
): boolean {
  if (assetClass === "sector_equity") {
    return weightPercent != null && weightPercent >= SECTOR_EQUITY_MIN_WEIGHT_PERCENT;
  }
  return true;
}

export function scoreOfficialMacroItem(
  item: NewsContentItem,
  holdings: StoredPortfolioHolding[],
): NewsContentItem {
  if (!isOfficialMacroItem(item)) return item;

  const totalValue = holdings.reduce((sum, holding) => {
    const value = getHoldingMarketValue(holding);
    return sum + (value ?? 0);
  }, 0);

  const matches: Array<{
    holding: StoredPortfolioHolding;
    assetClass: OfficialMacroAssetClass;
    strength: "strong" | "contextual";
  }> = [];

  for (const holding of holdings) {
    const assetClass = resolveOfficialMacroAssetClass(holding);
    const strength = matchOfficialMacroRelevance(
      item.macroTopic ?? null,
      assetClass,
      item.officialFeedKind ?? "research",
    );
    if (strength === "none") continue;
    const weightPercent = holdingWeightPercent(holding, totalValue);
    if (strength === "contextual" && !allowContextualMatch(assetClass, weightPercent)) {
      continue;
    }
    matches.push({ holding, assetClass, strength });
  }

  if (matches.length === 0) {
    return {
      ...item,
      relevanceScore: 0,
      relevanceLabel: null,
      matchedHoldingIds: [],
      matchedSymbols: [],
      matchedHoldings: [],
    };
  }

  const hasStrong = matches.some((row) => row.strength === "strong");
  const matchedHoldings: NewsMatchedHolding[] = matches.map((row) => ({
    id: row.holding.id,
    symbol: row.holding.symbol,
    name: row.holding.name,
    providerSymbol: row.holding.providerSymbol ?? null,
  }));

  return {
    ...item,
    matchedHoldingIds: matches.map((row) => row.holding.id),
    matchedSymbols: matches.map((row) => row.holding.symbol),
    matchedHoldings,
    relevanceLabel: officialMacroRelevanceLabel(matches.map((row) => row.assetClass)),
    relevanceScore: hasStrong
      ? OFFICIAL_MACRO_STRONG_SCORE
      : OFFICIAL_MACRO_CONTEXTUAL_SCORE,
    interpretation: officialMacroInterpretation({
      institution: item.officialInstitution,
      topic: item.macroTopic,
      assetClass: primaryAssetClass(matches.map((row) => row.assetClass)),
    }),
  };
}

function primaryAssetClass(
  assetClasses: OfficialMacroAssetClass[],
): OfficialMacroAssetClass | null {
  if (assetClasses.includes("fixed_income")) return "fixed_income";
  if (assetClasses.includes("precious_metals")) return "precious_metals";
  if (assetClasses.includes("crypto")) return "crypto";
  return assetClasses[0] ?? null;
}

export function capOfficialMacroPortfolioItems(
  items: NewsContentItem[],
  cap = OFFICIAL_MACRO_PORTFOLIO_ITEM_CAP,
): NewsContentItem[] {
  let officialCount = 0;
  return items.filter((item) => {
    if (!isOfficialMacroItem(item)) return true;
    officialCount += 1;
    return officialCount <= cap;
  });
}
