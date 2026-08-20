/**
 * Deterministic whole-instrument exposure classifier.
 * Zero provider calls — assetType, verified research profiles, then conservative
 * fixed-income name/type heuristics.
 */

import {
  classifyFixedIncomeHolding,
  type FixedIncomeClassification,
} from "@/lib/services/classification/classifyFixedIncome";
import {
  lookupInstrumentResearchProfile,
  type InstrumentResearchProfile,
} from "@/lib/services/discover/instrumentResearchMetadata";
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

/**
 * Classify a single holding into one exposure group.
 * Precedence: cash → native crypto → crypto-linked research → research profile → Other.
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

  const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
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
