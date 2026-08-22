import type {
  OfficialMacroAssetClass,
  OfficialMacroMatchStrength,
} from "@/lib/services/news/officialMacro/types";
import type {
  OfficialMacroFeedKind,
  OfficialMacroTopic,
} from "@/lib/types/newsContent";

const STRONG_FIXED_INCOME = new Set<OfficialMacroTopic>([
  "interest_rates",
  "monetary_policy",
  "inflation",
  "financial_stability",
]);

const CONTEXTUAL_PRECIOUS_METALS = new Set<OfficialMacroTopic>([
  "interest_rates",
  "inflation",
  "fx_usd",
  "monetary_policy",
]);

const CONTEXTUAL_CRYPTO = new Set<OfficialMacroTopic>([
  "interest_rates",
  "liquidity",
  "monetary_policy",
  "fx_usd",
]);

const CONTEXTUAL_EQUITY = new Set<OfficialMacroTopic>([
  "interest_rates",
  "monetary_policy",
  "growth",
  "labor",
  "financial_stability",
]);

const CONTEXTUAL_COMMODITY = new Set<OfficialMacroTopic>([
  "growth",
  "inflation",
  "fx_usd",
]);

function isHighValueFeed(feedKind: OfficialMacroFeedKind): boolean {
  return feedKind === "policy_decision" || feedKind === "economic_release";
}

/**
 * Deterministic topic → asset-class map.
 * Speeches/research never attach to every equity holding.
 */
export function matchOfficialMacroRelevance(
  topic: OfficialMacroTopic | null,
  assetClass: OfficialMacroAssetClass,
  feedKind: OfficialMacroFeedKind,
): OfficialMacroMatchStrength {
  if (!topic || assetClass === "none") return "none";

  if (assetClass === "fixed_income") {
    return STRONG_FIXED_INCOME.has(topic) ? "strong" : "none";
  }

  if (assetClass === "precious_metals") {
    return CONTEXTUAL_PRECIOUS_METALS.has(topic) ? "contextual" : "none";
  }

  if (assetClass === "crypto") {
    return CONTEXTUAL_CRYPTO.has(topic) ? "contextual" : "none";
  }

  if (assetClass === "cash") {
    return topic === "interest_rates" && feedKind === "policy_decision"
      ? "contextual"
      : "none";
  }

  if (assetClass === "commodity") {
    if (!isHighValueFeed(feedKind)) return "none";
    return CONTEXTUAL_COMMODITY.has(topic) ? "contextual" : "none";
  }

  if (
    assetClass === "broad_equity" ||
    assetClass === "financials" ||
    assetClass === "sector_equity"
  ) {
    if (!isHighValueFeed(feedKind)) return "none";
    if (assetClass === "financials") {
      if (
        topic === "interest_rates" ||
        topic === "monetary_policy" ||
        topic === "financial_stability"
      ) {
        return "contextual";
      }
      return "none";
    }
    if (assetClass === "sector_equity") {
      return "none";
    }
    return CONTEXTUAL_EQUITY.has(topic) ? "contextual" : "none";
  }

  return "none";
}
