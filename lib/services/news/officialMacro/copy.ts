import type { OfficialMacroAssetClass } from "@/lib/services/news/officialMacro/types";
import type {
  OfficialMacroInstitution,
  OfficialMacroTopic,
} from "@/lib/types/newsContent";

export const OFFICIAL_MACRO_CONTEXT_LABEL = "Macro context";

export const OFFICIAL_MACRO_NOT_CAUSE =
  "High relevance as macro context; not proof of today's price move.";

const INSTITUTION_LABEL: Record<OfficialMacroInstitution, string> = {
  ecb: "ECB",
  federal_reserve: "Federal Reserve",
  st_louis_fed: "St. Louis Fed",
  atlanta_fed: "Atlanta Fed",
};

const TOPIC_LABEL: Record<OfficialMacroTopic, string> = {
  interest_rates: "rate development",
  inflation: "inflation development",
  monetary_policy: "monetary-policy development",
  labor: "labor-market development",
  growth: "growth development",
  financial_stability: "financial-stability development",
  fx_usd: "dollar/FX development",
  liquidity: "liquidity development",
};

const ASSET_LABEL: Record<OfficialMacroAssetClass, string> = {
  fixed_income: "bond exposure",
  precious_metals: "precious-metals exposure",
  crypto: "crypto exposure",
  cash: "cash",
  broad_equity: "broad equity exposure",
  financials: "financials exposure",
  sector_equity: "equity exposure",
  commodity: "commodity-theme exposure",
  none: "portfolio",
};

export function officialInstitutionLabel(
  institution: OfficialMacroInstitution | undefined,
): string {
  if (!institution) return "Official source";
  return INSTITUTION_LABEL[institution];
}

export function officialMacroWhyRelevant(
  assetClass: OfficialMacroAssetClass,
): string {
  switch (assetClass) {
    case "fixed_income":
      return "Bond prices are generally sensitive to changes in market yields and rates.";
    case "precious_metals":
      return "Precious metals can respond to real-rate, inflation, and USD context.";
    case "crypto":
      return "Rates, liquidity, and USD conditions can be relevant macro context for crypto, not a proven driver.";
    case "cash":
      return "Policy rates can be relevant context for cash holdings.";
    case "commodity":
      return "Growth, inflation, and USD conditions can be relevant context for commodity themes.";
    case "financials":
      return "Banks and rate-sensitive financials can be affected by policy-rate and stability conditions.";
    case "broad_equity":
    case "sector_equity":
      return "Equity markets can be sensitive to growth, labor, and policy-rate conditions.";
    default:
      return "This is official macro context, not a proven driver of the holding.";
  }
}

export function officialMacroInterpretation(input: {
  institution?: OfficialMacroInstitution;
  topic?: OfficialMacroTopic | null;
  assetClass?: OfficialMacroAssetClass | null;
}): string {
  const source = officialInstitutionLabel(input.institution);
  const topic = input.topic ? TOPIC_LABEL[input.topic] : "policy development";
  const exposure =
    input.assetClass && input.assetClass !== "none"
      ? ASSET_LABEL[input.assetClass]
      : "your portfolio";
  const cryptoNote =
    input.assetClass === "crypto"
      ? " This is macro context, not a proven driver."
      : " This is not proof of today’s price move.";
  return `${source} ${topic} — relevant macro context for ${exposure}.${cryptoNote}`;
}

export function officialMacroRelevanceLabel(
  assetClasses: OfficialMacroAssetClass[],
): string {
  const unique = [...new Set(assetClasses.filter((row) => row !== "none"))];
  if (unique.length === 1 && unique[0]) {
    return `Macro context for your ${ASSET_LABEL[unique[0]]}`;
  }
  if (unique.length > 1) {
    return "Macro context for matched exposures";
  }
  return "Official macro context";
}
