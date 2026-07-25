/**
 * Conservative distribution-policy classification engine.
 * Evidence hierarchy: user-confirmed → reviewed registry → provider metadata →
 * verified cash events → name markers (ISIN-linked only) → unknown.
 */

import { lookupInstrumentResearchProfile } from "@/lib/services/discover/instrumentResearchMetadata";
import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { lookupVerifiedByProviderSymbol } from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { resolveDistributionInstrumentIdentity } from "@/lib/services/dividends/distributionInstrumentIdentity";
import {
  detectNameMarkerPolicy,
  isYieldMarketingTerm,
} from "@/lib/services/dividends/distributionPolicyNameMarkers";
import { lookupReviewedDistributionPolicy } from "@/lib/services/dividends/reviewedDistributionPolicyRegistry";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type {
  DistributionPolicy,
  DistributionPolicyClassification,
  DistributionPolicyUserOverride,
} from "@/lib/types/distributionPolicy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ClassifyDistributionPolicyInput = {
  holding: StoredPortfolioHolding;
  dividendQuote?: DividendApiQuote | null;
};

function buildClassification(
  base: Omit<
    DistributionPolicyClassification,
    | "instrumentIdentity"
    | "isin"
    | "providerSymbol"
    | "conflictDetected"
    | "conflictSummary"
    | "sourceUrl"
  > & { sourceUrl?: string | null },
  holding: StoredPortfolioHolding,
  conflict?: {
    detected: boolean;
    summary: string | null;
  },
): DistributionPolicyClassification {
  const identity = resolveDistributionInstrumentIdentity(holding);
  return {
    ...base,
    sourceUrl: base.sourceUrl ?? null,
    instrumentIdentity: identity.key,
    isin: identity.isin,
    providerSymbol: identity.providerSymbol,
    conflictDetected: conflict?.detected ?? false,
    conflictSummary: conflict?.summary ?? null,
  };
}

function isSpotCrypto(holding: StoredPortfolioHolding): boolean {
  return holding.assetType === "crypto";
}

function isCash(holding: StoredPortfolioHolding): boolean {
  return holding.assetType === "cash";
}

function isFundLike(holding: StoredPortfolioHolding): boolean {
  return inferAnalystCoverageKind(holding) === "fund_or_etc";
}

function isIndividualEquity(holding: StoredPortfolioHolding): boolean {
  if (isCash(holding) || isSpotCrypto(holding)) return false;
  return inferAnalystCoverageKind(holding) === "company";
}

function isCryptoLinkedEtp(holding: StoredPortfolioHolding): boolean {
  const profile = lookupInstrumentResearchProfile(holding.providerSymbol);
  if (profile?.assetClass === "digital_assets") {
    return true;
  }

  const providerSymbol = holding.providerSymbol ?? "";
  if (/\.CC$/i.test(providerSymbol) || /-USD\.CC$/i.test(providerSymbol)) {
    return true;
  }

  const label = `${holding.name} ${holding.symbol}`;
  return /\b(bitcoin|ethereum|btc|eth)\b/i.test(label) && isFundLike(holding);
}

function hasVerifiedCashDistributionEvent(
  quote: DividendApiQuote | null | undefined,
): boolean {
  const event = quote?.verifiedCashDistributionEvent;
  return (
    event != null &&
    Number.isFinite(event.amount) &&
    event.amount > 0 &&
    Boolean(event.date?.trim())
  );
}

function classifyAutomatic(
  input: ClassifyDistributionPolicyInput,
): DistributionPolicyClassification {
  const { holding, dividendQuote } = input;
  const identity = resolveDistributionInstrumentIdentity(holding);
  const dataUpdatedAt = dividendQuote?.updatedAt ?? null;

  if (isCash(holding)) {
    return buildClassification(
      {
        policy: "not_applicable",
        classificationSource: "Instrument type rule",
        classificationConfidence: "verified",
        evidenceType: "instrument_type_rule",
        evidenceSummary:
          "Cash holdings do not have a dividend or distribution policy.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  if (isSpotCrypto(holding)) {
    return buildClassification(
      {
        policy: "not_applicable",
        classificationSource: "Instrument type rule",
        classificationConfidence: "verified",
        evidenceType: "instrument_type_rule",
        evidenceSummary:
          "Spot crypto does not use a traditional dividend or distribution policy.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  if (dividendQuote?.providerUnavailable) {
    return buildClassification(
      {
        policy: "unknown",
        classificationSource: "Provider temporarily unavailable",
        classificationConfidence: "unknown",
        evidenceType: "none",
        evidenceSummary:
          "Distribution policy could not be checked because provider data is temporarily unavailable.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: true,
      },
      holding,
    );
  }

  const reviewed = lookupReviewedDistributionPolicy({
    isin: identity.isin,
    providerSymbol: identity.providerSymbol,
  });

  if (reviewed) {
    return buildClassification(
      {
        policy: reviewed.policy,
        classificationSource: "Reviewed instrument registry",
        classificationConfidence: "reviewed",
        evidenceType: "reviewed_registry",
        evidenceSummary: reviewed.sourceNote,
        verifiedAt: reviewed.reviewedAt,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: true,
        providerUnavailable: false,
        sourceUrl: reviewed.sourceUrl ?? null,
      },
      holding,
    );
  }

  if (hasVerifiedCashDistributionEvent(dividendQuote)) {
    const event = dividendQuote!.verifiedCashDistributionEvent!;
    return buildClassification(
      {
        policy: "distributing",
        classificationSource: "EODHD dividend calendar",
        classificationConfidence: "verified",
        evidenceType: "cash_distribution_history",
        evidenceSummary: `Verified cash distribution event of ${event.amount} ${event.currency} dated ${event.date}.`,
        verifiedAt: event.date,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  const verifiedEntry = lookupVerifiedByProviderSymbol(holding.providerSymbol);
  const officialName =
    verifiedEntry?.instrumentName ??
    holding.instrumentName ??
    holding.name ??
    null;

  if (identity.isin && officialName) {
    const markerPolicy = detectNameMarkerPolicy(officialName);
    if (markerPolicy && !isYieldMarketingTerm(officialName)) {
      return buildClassification(
        {
          policy: markerPolicy,
          classificationSource: "Official share-class name marker",
          classificationConfidence: "reviewed",
          evidenceType: "name_marker_supporting",
          evidenceSummary: `Share-class marker in official instrument name "${officialName}" for ISIN ${identity.isin}.`,
          verifiedAt: null,
          dataUpdatedAt,
          isUserConfirmed: false,
          isReviewedOverride: false,
          providerUnavailable: false,
        },
        holding,
      );
    }
  }

  if (isCryptoLinkedEtp(holding)) {
    return buildClassification(
      {
        policy: "not_applicable",
        classificationSource: "Instrument type rule",
        classificationConfidence: "unknown",
        evidenceType: "instrument_type_rule",
        evidenceSummary:
          "Crypto-linked ETPs are not classified using traditional equity dividend policy without exact product metadata.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  if (isIndividualEquity(holding)) {
    return buildClassification(
      {
        policy: "unknown",
        classificationSource: "No verified cash dividend events",
        classificationConfidence: "unknown",
        evidenceType: "none",
        evidenceSummary:
          "No verified cash dividend events were found for this equity. Absence of events does not prove a reinvesting policy.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  if (isFundLike(holding)) {
    return buildClassification(
      {
        policy: "unknown",
        classificationSource: "Insufficient share-class evidence",
        classificationConfidence: "unknown",
        evidenceType: "none",
        evidenceSummary:
          "No verified distributing or accumulating evidence for this exact fund share class. Yield fields alone are not used.",
        verifiedAt: null,
        dataUpdatedAt,
        isUserConfirmed: false,
        isReviewedOverride: false,
        providerUnavailable: false,
      },
      holding,
    );
  }

  return buildClassification(
    {
      policy: "unknown",
      classificationSource: "Insufficient evidence",
      classificationConfidence: "unknown",
      evidenceType: "none",
      evidenceSummary:
        "Available data is insufficient to classify this instrument's distribution policy reliably.",
      verifiedAt: null,
      dataUpdatedAt,
      isUserConfirmed: false,
      isReviewedOverride: false,
      providerUnavailable: false,
    },
    holding,
  );
}

function policiesConflict(
  left: DistributionPolicy,
  right: DistributionPolicy,
): boolean {
  if (left === "unknown" || right === "unknown") return false;
  if (left === "not_applicable" || right === "not_applicable") return false;
  return left !== right;
}

function applyUserOverride(
  holding: StoredPortfolioHolding,
  automatic: DistributionPolicyClassification,
  override: Exclude<DistributionPolicyUserOverride, null>,
): DistributionPolicyClassification {
  const conflict = policiesConflict(override, automatic.policy);

  return buildClassification(
    {
      policy: override,
      classificationSource: "User confirmed",
      classificationConfidence: "user_confirmed",
      evidenceType: "user_confirmed",
      evidenceSummary:
        "You confirmed this classification for this exact holding. It affects classification only and does not record dividend income.",
      verifiedAt: null,
      dataUpdatedAt: automatic.dataUpdatedAt,
      isUserConfirmed: true,
      isReviewedOverride: false,
      providerUnavailable: automatic.providerUnavailable,
      sourceUrl: null,
    },
    holding,
    conflict
      ? {
          detected: true,
          summary:
            "Conflicting distribution information — review required. Automatic evidence suggests a different policy.",
        }
      : undefined,
  );
}

export function classifyDistributionPolicy(
  input: ClassifyDistributionPolicyInput,
): DistributionPolicyClassification {
  const automatic = classifyAutomatic(input);
  const override = input.holding.distributionPolicyUserOverride ?? null;

  if (override === "distributing" || override === "accumulating") {
    return applyUserOverride(input.holding, automatic, override);
  }

  return automatic;
}

export function findDividendQuoteForClassification(
  holding: StoredPortfolioHolding,
  quotes: DividendApiQuote[],
): DividendApiQuote | null {
  const keys = new Set<string>();
  keys.add(holding.symbol.trim().toUpperCase());
  if (holding.providerSymbol) {
    keys.add(holding.providerSymbol.trim().toUpperCase());
  }

  return (
    quotes.find((quote) => {
      const quoteKeys = [
        quote.symbol.trim().toUpperCase(),
        quote.providerSymbol.trim().toUpperCase(),
      ];
      return quoteKeys.some((key) => keys.has(key));
    }) ?? null
  );
}

export function buildPortfolioDistributionPolicySnapshot(
  holdings: StoredPortfolioHolding[],
  quotes: DividendApiQuote[],
): import("@/lib/types/distributionPolicy").PortfolioDistributionPolicySnapshot {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");

  const classifications = investments.map((holding) =>
    classifyDistributionPolicy({
      holding,
      dividendQuote: findDividendQuoteForClassification(holding, quotes),
    }),
  );

  const summary = {
    distributing: 0,
    accumulating: 0,
    unknown: 0,
    notApplicable: 0,
    conflicted: 0,
    totalInvestments: investments.length,
  };

  for (const classification of classifications) {
    if (classification.conflictDetected) {
      summary.conflicted += 1;
    }

    switch (classification.policy) {
      case "distributing":
        summary.distributing += 1;
        break;
      case "accumulating":
        summary.accumulating += 1;
        break;
      case "not_applicable":
        summary.notApplicable += 1;
        break;
      default:
        summary.unknown += 1;
        break;
    }
  }

  return {
    summary,
    classifications,
    generatedAt: new Date().toISOString(),
  };
}
