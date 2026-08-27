/**
 * Deterministic whole-instrument exposure classifier.
 * Zero provider calls — assetType, verified research profiles, then conservative
 * fixed-income and physical precious-metals name/type heuristics.
 */

import {
  classifyFixedIncomeHolding,
  type FixedIncomeClassification,
} from "@/lib/services/classification/classifyFixedIncome";
import { lookupResearchProfileForHolding } from "@/lib/services/instruments/confirmedListingIdentity";
import type { InstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import {
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
  type HoldingExposureClassification,
} from "@/lib/services/classification/types";

export type ExposureClassificationHolding = Pick<
  StoredPortfolioHolding,
  | "assetType"
  | "providerSymbol"
  | "symbol"
  | "name"
  | "instrumentName"
  | "providerInstrumentType"
>;

function result(
  groupId: ExposureGroupId,
  source: HoldingExposureClassification["classificationSource"],
  confidence: HoldingExposureClassification["confidence"],
  reason: string,
  extras?: Pick<
    HoldingExposureClassification,
    "researchExposure" | "fundCategory" | "fixedIncome"
  >,
): HoldingExposureClassification {
  return {
    normalizedGroupId: groupId,
    displayLabel: EXPOSURE_GROUP_LABELS[groupId],
    classificationSource: source,
    confidence,
    researchExposure: extras?.researchExposure ?? null,
    fundCategory: extras?.fundCategory ?? null,
    reason,
    fixedIncome: extras?.fixedIncome ?? null,
  };
}

function mapFiSource(
  classification: FixedIncomeClassification,
): HoldingExposureClassification["classificationSource"] {
  if (classification.source === "provider_type") return "provider_type";
  if (classification.source === "research_profile") return "research_profile";
  return "name_heuristic";
}

function mapFiConfidence(
  classification: FixedIncomeClassification,
): HoldingExposureClassification["confidence"] {
  if (classification.confidence.assetClass === "known") return "high";
  if (classification.confidence.assetClass === "inferred") return "medium";
  return "low";
}

function exposureText(profile: InstrumentResearchProfile): string {
  return [...profile.sectorExposure, profile.fundCategory]
    .join(" ")
    .toLowerCase();
}

/**
 * Map verified research exposure / category text to a traditional group.
 * Allow-list only — never ticker guesses. Returns null when ambiguous.
 */
export function resolveGroupFromVerifiedExposureText(
  text: string,
): ExposureGroupId | null {
  const normalized = text.toLowerCase();

  if (
    /health\s*care|healthcare|pharma|biotech|biotechnology|medical/.test(
      normalized,
    )
  ) {
    return "healthcare";
  }

  if (
    /consumer discretionary|consumer defensive|consumer staples|\bconsumer\b/.test(
      normalized,
    )
  ) {
    return "consumer";
  }

  if (
    /technology|communication services|communications?|ai infrastructure|\bai\b|software|information technology|telecom/.test(
      normalized,
    )
  ) {
    return "technology_communication";
  }

  if (
    /financial services|financials?|real estate|\breit\b|banking|insurance/.test(
      normalized,
    )
  ) {
    return "financials_real_estate";
  }

  if (
    /industrials?|energy|uranium|nuclear|copper|materials|utilities|resource|commodit|miner/.test(
      normalized,
    )
  ) {
    return "industrials_resources";
  }

  return null;
}

function isAmbiguousStrategyProfile(profile: InstrumentResearchProfile): boolean {
  return profile.sectorExposure.some((item) =>
    /multi[-\s]?strategy|multi strategy|unclear|unknown/i.test(item),
  );
}

function mapResearchProfile(
  profile: InstrumentResearchProfile,
): HoldingExposureClassification {
  const extras = {
    researchExposure: profile.sectorExposure,
    fundCategory: profile.fundCategory,
  };

  if (profile.assetClass === "digital_assets") {
    return result(
      "crypto",
      "research_profile",
      "high",
      "Verified digital_assets research profile",
      extras,
    );
  }

  if (profile.assetClass === "precious_metals") {
    return result(
      "precious_metals",
      "research_profile",
      "high",
      "Verified physical precious-metals research profile",
      extras,
    );
  }

  if (profile.assetClass === "equity_etf") {
    return result(
      "diversified_equity",
      "research_profile",
      "high",
      "Verified broad equity ETF research profile",
      extras,
    );
  }

  if (profile.assetClass === "thematic_etf") {
    const mapped = resolveGroupFromVerifiedExposureText(exposureText(profile));
    if (mapped) {
      return result(
        mapped,
        "research_profile",
        "high",
        `Verified thematic research profile → ${mapped}`,
        extras,
      );
    }
    return result(
      "other_unclassified",
      "research_profile",
      "low",
      "Verified thematic profile without allow-listed exposure mapping",
      extras,
    );
  }

  if (profile.assetClass === "fixed_income") {
    const fixedIncome = classifyFixedIncomeHolding({
      assetType: "investment",
      symbol: profile.symbol,
      name: profile.fundCategory,
      fundCategory: profile.fundCategory,
    });
    return result(
      "fixed_income",
      "research_profile",
      "high",
      "Verified fixed_income research profile",
      {
        ...extras,
        fixedIncome: {
          ...fixedIncome,
          isFixedIncome: true,
          source: "research_profile",
          confidence: {
            ...fixedIncome.confidence,
            assetClass: "known",
          },
          reason: "Verified fixed_income research profile",
        },
      },
    );
  }

  if (profile.assetClass === "income_etp") {
    // Income is a strategy, not a sector. Map only via verified underlying exposure.
    if (isAmbiguousStrategyProfile(profile)) {
      return result(
        "other_unclassified",
        "research_profile",
        "low",
        "Income/strategy ETP underlying exposure is ambiguous",
        extras,
      );
    }
    const mapped = resolveGroupFromVerifiedExposureText(exposureText(profile));
    if (mapped) {
      return result(
        mapped,
        "research_profile",
        "medium",
        `Verified ETP underlying exposure → ${mapped}`,
        extras,
      );
    }
    return result(
      "other_unclassified",
      "research_profile",
      "low",
      "Income/strategy ETP lacks verified traditional exposure mapping",
      extras,
    );
  }

  return result(
    "other_unclassified",
    "research_profile",
    "low",
    "Research profile asset class has no allow-listed exposure mapping",
    extras,
  );
}

const MINING_OR_PRODUCER_PATTERN =
  /\b(miners?|mining|mine|royalty|streaming|producer|exploration|resources?)\b/i;
const PHYSICAL_PATTERN = /\bphysical\b/i;
const GOLD_OR_SILVER_PATTERN = /\b(gold|silver)\b/i;
const PRECIOUS_METALS_VEHICLE_PATTERN = /\b(etc|etp|etn)\b/i;

/**
 * Tight fallback for physical gold/silver bullion vehicles only.
 * Requires Physical + (Gold or Silver) + (ETC/ETP/ETN in name or type).
 * Never matches miners, companies, or a lone "gold"/"silver" token.
 */
function classifyPhysicalPreciousMetalsHeuristic(
  holding: ExposureClassificationHolding,
): HoldingExposureClassification | null {
  const nameBlob = [holding.name, holding.instrumentName]
    .filter(Boolean)
    .join(" ");
  const typeBlob = holding.providerInstrumentType ?? "";
  const combined = `${nameBlob} ${typeBlob}`;

  if (MINING_OR_PRODUCER_PATTERN.test(combined)) {
    return null;
  }
  if (!PHYSICAL_PATTERN.test(nameBlob)) {
    return null;
  }
  if (!GOLD_OR_SILVER_PATTERN.test(nameBlob)) {
    return null;
  }

  const vehicleInName = PRECIOUS_METALS_VEHICLE_PATTERN.test(nameBlob);
  const vehicleInType = PRECIOUS_METALS_VEHICLE_PATTERN.test(typeBlob);
  if (!vehicleInName && !vehicleInType) {
    return null;
  }

  return result(
    "precious_metals",
    vehicleInType && !vehicleInName ? "provider_type" : "name_heuristic",
    "medium",
    "Physical gold/silver bullion vehicle (ETC/ETP/ETN)",
  );
}

/**
 * Classify a single holding into one exposure group.
 * Precedence: cash → native crypto → research profile → conservative FI →
 * tight physical precious-metals heuristic → Other.
 */
export function classifyHoldingExposure(
  holding: ExposureClassificationHolding,
): HoldingExposureClassification {
  if (holding.assetType === "cash") {
    return result("cash", "asset_type", "high", "assetType is cash");
  }

  if (holding.assetType === "crypto") {
    return result("crypto", "asset_type", "high", "assetType is crypto");
  }

  const profile = lookupResearchProfileForHolding(holding);
  if (profile) {
    return mapResearchProfile(profile);
  }

  const fixedIncome = classifyFixedIncomeHolding({
    assetType: holding.assetType,
    symbol: holding.symbol,
    name: holding.name,
    instrumentName: holding.instrumentName,
    providerInstrumentType: holding.providerInstrumentType,
  });
  if (fixedIncome.isFixedIncome) {
    return result(
      "fixed_income",
      mapFiSource(fixedIncome),
      mapFiConfidence(fixedIncome),
      fixedIncome.reason,
      { fixedIncome },
    );
  }

  const preciousMetals = classifyPhysicalPreciousMetalsHeuristic(holding);
  if (preciousMetals) {
    return preciousMetals;
  }

  return result(
    "other_unclassified",
    "unclassified",
    "low",
    "No verified assetType special-case, research profile, or conservative fixed-income match",
  );
}

export function describeHoldingKindLabel(
  holding: ExposureClassificationHolding,
): string | null {
  if (holding.assetType === "cash") return "Cash";
  const classified = classifyHoldingExposure(holding);
  if (!classified.fixedIncome?.isFixedIncome) return null;
  const blob = [
    holding.providerInstrumentType,
    holding.name,
    holding.instrumentName,
  ]
    .filter(Boolean)
    .join(" ");
  return /\betf\b/i.test(blob) ? "Bond ETF" : "Fixed Income";
}
