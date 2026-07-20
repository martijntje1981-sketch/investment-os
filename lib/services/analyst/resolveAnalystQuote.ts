/**
 * Resolves analyst data for a single instrument via the EODHD adapter.
 */

import { inferAnalystCoverageKind } from "@/lib/services/analyst/assetCoverageKind";
import { convertAnalystTargetToEur } from "@/lib/services/analyst/analystCalculations";
import {
  consensusFromProviderRating,
  normalizeRatingCounts,
  totalAnalystCount,
} from "@/lib/services/analyst/normalizeRating";
import {
  EODHD_ANALYST_SOURCE,
  fetchEodhdAnalystFundamentals,
} from "@/lib/services/analyst/eodhdAnalystClient";
import type {
  AnalystApiQuote,
  AnalystCoverageState,
  AnalystDataConfidence,
} from "@/lib/types/analyst";

type ResolveAnalystInput = {
  symbol: string;
  providerSymbol: string;
  name: string;
  assetType?: "investment" | "cash";
  fxRateToEur?: number | null;
};

function buildEmptyQuote(
  input: ResolveAnalystInput,
  coverageState: AnalystCoverageState,
  coverageKind: ReturnType<typeof inferAnalystCoverageKind>,
): AnalystApiQuote {
  return {
    symbol: input.symbol,
    providerSymbol: input.providerSymbol,
    coverageState,
    coverageKind,
    dataConfidence: "none",
    consensusRating: "No Coverage",
    ratingCounts: {
      strongBuy: 0,
      buy: 0,
      hold: 0,
      sell: 0,
      strongSell: 0,
    },
    analystCount: 0,
    averagePriceTarget: null,
    medianPriceTarget: null,
    highPriceTarget: null,
    lowPriceTarget: null,
    targetCurrency: null,
    source: EODHD_ANALYST_SOURCE,
    updatedAt: new Date().toISOString(),
  };
}

function deriveDataConfidence(input: {
  analystCount: number;
  averagePriceTarget: number | null;
  consensusRating: AnalystApiQuote["consensusRating"];
}): AnalystDataConfidence {
  if (input.consensusRating === "No Coverage" && input.analystCount === 0) {
    return "none";
  }
  if (input.analystCount > 0 && input.averagePriceTarget != null) {
    return "complete";
  }
  if (input.analystCount > 0 || input.averagePriceTarget != null) {
    return "partial";
  }
  return "none";
}

export async function resolveAnalystQuote(
  input: ResolveAnalystInput,
): Promise<AnalystApiQuote> {
  const coverageKind = inferAnalystCoverageKind(
    {
      name: input.name,
      symbol: input.symbol,
      assetType: input.assetType ?? "investment",
    },
    null,
  );

  if (input.assetType === "cash") {
    return buildEmptyQuote(input, "no_coverage", "unsupported");
  }

  try {
    const fundamentals = await fetchEodhdAnalystFundamentals(input.providerSymbol);
    const resolvedKind = inferAnalystCoverageKind(
      {
        name: input.name,
        symbol: input.symbol,
        assetType: input.assetType ?? "investment",
      },
      fundamentals.instrumentType,
    );

    const ratingCounts = normalizeRatingCounts(fundamentals.ratings);
    const analystCount = totalAnalystCount(ratingCounts);
    const consensusRating = consensusFromProviderRating(
      fundamentals.ratings?.Rating,
      ratingCounts,
    );

    const normalizedTarget = convertAnalystTargetToEur(
      fundamentals.ratings?.TargetPrice ??
        fundamentals.wallStreetTargetPrice ??
        null,
      fundamentals.currency,
      input.fxRateToEur ?? null,
    );
    const averagePriceTarget = normalizedTarget;

    const hasCoverage =
      analystCount > 0 ||
      (averagePriceTarget != null && averagePriceTarget > 0) ||
      consensusRating !== "No Coverage";

    if (!hasCoverage) {
      return {
        ...buildEmptyQuote(input, "no_coverage", resolvedKind),
        targetCurrency: fundamentals.currency,
      };
    }

    const dataConfidence = deriveDataConfidence({
      analystCount,
      averagePriceTarget,
      consensusRating,
    });

    return {
      symbol: input.symbol,
      providerSymbol: input.providerSymbol,
      coverageState: "live",
      coverageKind: resolvedKind,
      dataConfidence,
      consensusRating,
      ratingCounts,
      analystCount,
      averagePriceTarget,
      medianPriceTarget: null,
      highPriceTarget: null,
      lowPriceTarget: null,
      targetCurrency:
        normalizedTarget != null &&
        fundamentals.currency &&
        fundamentals.currency.toUpperCase() !== "EUR"
          ? "EUR"
          : fundamentals.currency,
      source: EODHD_ANALYST_SOURCE,
      updatedAt: new Date().toISOString(),
    };
  } catch {
    return buildEmptyQuote(input, "provider_unavailable", coverageKind);
  }
}
