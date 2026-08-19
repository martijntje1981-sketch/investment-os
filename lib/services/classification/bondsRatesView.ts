/**
 * Presentation model for Analysis → Bonds & Rates.
 * Reuses existing classification + official RSS context.
 * No yields, duration math, provider calls, or numeric policy rates.
 */

import {
  FIXED_INCOME_CREDIT_LABELS,
  FIXED_INCOME_DURATION_LABELS,
  FIXED_INCOME_TYPE_LABELS,
  formatFixedIncomeSubtypeLabel,
  type FixedIncomeClassification,
} from "@/lib/services/classification/classifyFixedIncome";
import { buildFixedIncomeRateEducation } from "@/lib/services/classification/fixedIncomeEducation";
import type { PortfolioExposureAllocation } from "@/lib/services/classification/types";
import type { NewsContentItem } from "@/lib/types/newsContent";

export const BONDS_RATES_SECTION_ID = "bonds-rates";

export const BONDS_RATES_OFFICIAL_CONTEXT_LABEL = "Official macro context";

export const BONDS_RATES_OFFICIAL_NOT_CAUSE =
  "Official headlines are macro context, not proof that a bond holding moved.";

export type BondsRatesOfficialContext = {
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
};

export type BondsRatesView = {
  hasFixedIncome: boolean;
  weightPercent: number | null;
  allocationLine: string;
  educationHeadline: string;
  educationBody: string;
  durationNote: string | null;
  showBreakdown: boolean;
  subtypeRows: Array<{ id: string; label: string; percent: number }>;
  durationHonesty: string | null;
  creditHonesty: string | null;
  officialContext: BondsRatesOfficialContext | null;
  limitations: string[];
};

const MATERIAL_WEIGHT_PERCENT = 1;

export function buildFixedIncomePortfolioContextLine(
  weightPercent: number | null | undefined,
): string | null {
  if (weightPercent == null || !Number.isFinite(weightPercent)) return null;
  if (weightPercent < MATERIAL_WEIGHT_PERCENT) return null;
  return `Fixed income now represents ${Math.round(weightPercent)}% of your portfolio.`;
}

export function formatFixedIncomeHoldingField(
  valueLabel: string,
  confidence: FixedIncomeClassification["confidence"][keyof FixedIncomeClassification["confidence"]],
): string {
  return formatFixedIncomeSubtypeLabel({
    displayLabel: valueLabel,
    confidence,
  });
}

export function buildFixedIncomeHoldingProfile(
  classification: FixedIncomeClassification | null | undefined,
): {
  typeLabel: string;
  durationLabel: string;
  creditLabel: string;
  durationUnknown: boolean;
} | null {
  if (!classification?.isFixedIncome) return null;
  return {
    typeLabel: formatFixedIncomeHoldingField(
      FIXED_INCOME_TYPE_LABELS[classification.type],
      classification.confidence.type,
    ),
    durationLabel:
      classification.durationBucket === "unknown"
        ? "Duration is not available for this holding."
        : formatFixedIncomeHoldingField(
            `${FIXED_INCOME_DURATION_LABELS[classification.durationBucket]} duration`,
            classification.confidence.duration,
          ),
    creditLabel: formatFixedIncomeHoldingField(
      FIXED_INCOME_CREDIT_LABELS[classification.creditQuality],
      classification.confidence.creditQuality,
    ),
    durationUnknown: classification.durationBucket === "unknown",
  };
}

export function buildQualitativeRateOutlook(input: {
  weightPercent: number | null;
  durationKnownSharePercent: number;
  majorityIsLongDuration: boolean;
}): string | null {
  if (input.weightPercent == null || input.weightPercent < 8) return null;
  if (!(input.durationKnownSharePercent > 0)) {
    return "Bond prices are generally sensitive to market yields, but Tobailey does not estimate a numeric rate shock because duration is unavailable.";
  }
  if (input.majorityIsLongDuration) {
    return "A large share of your classified bond exposure is long-duration, so it may be more sensitive to yield changes. This is qualitative context, not a modeled shock.";
  }
  return "Fixed income is part of this portfolio. Rate sensitivity is qualitative only; Tobailey does not calculate a precise rate shock.";
}

export function buildBondsRatesView(input: {
  allocation: PortfolioExposureAllocation;
  ratePolicyContext?: Pick<
    NewsContentItem,
    "title" | "canonicalUrl" | "sourceName" | "publishedAt"
  > | null;
  intelligenceDepth?: "free" | "complete";
}): BondsRatesView {
  const sleeve = input.allocation.fixedIncome;
  const hasFixedIncome = Boolean(sleeve && sleeve.weightPercent >= MATERIAL_WEIGHT_PERCENT);
  const education = buildFixedIncomeRateEducation(sleeve);
  const showBreakdown = input.intelligenceDepth !== "free" && hasFixedIncome;
  const allocationLine =
    buildFixedIncomePortfolioContextLine(sleeve?.weightPercent ?? null) ??
    (hasFixedIncome
      ? "This portfolio includes classified Fixed Income holdings."
      : "This portfolio currently has no classified Fixed Income holdings.");

  const official =
    hasFixedIncome && input.ratePolicyContext
      ? {
          title: input.ratePolicyContext.title,
          canonicalUrl: input.ratePolicyContext.canonicalUrl,
          sourceName: input.ratePolicyContext.sourceName,
          publishedAt: input.ratePolicyContext.publishedAt ?? null,
        }
      : null;

  const limitations = [
    "Tobailey does not invent live yields, coupons, or policy-rate values here.",
    education.durationNote,
    BONDS_RATES_OFFICIAL_NOT_CAUSE,
  ].filter((row): row is string => Boolean(row));

  return {
    hasFixedIncome,
    weightPercent: sleeve?.weightPercent ?? null,
    allocationLine,
    educationHeadline: education.headline,
    educationBody: education.body,
    durationNote: education.durationNote,
    showBreakdown,
    subtypeRows: showBreakdown
      ? (sleeve?.subgroups ?? []).map((row) => ({
          id: row.subgroupId,
          label: formatFixedIncomeSubtypeLabel(row),
          percent: row.displayPercent,
        }))
      : [],
    durationHonesty: showBreakdown
      ? sleeve && sleeve.durationKnownSharePercent > 0
        ? "Duration is classified for some bond holdings. Tobailey still does not calculate a numeric rate shock."
        : "Duration is not available for this portfolio’s bond holdings."
      : null,
    creditHonesty: showBreakdown
      ? sleeve && sleeve.creditKnownSharePercent > 0
        ? "Credit quality is classified for some bond holdings, with inferred labels marked as inferred."
        : "Credit ratings are not confirmed for this sleeve unless labeled."
      : null,
    officialContext: official,
    limitations,
  };
}

export function buildFixedIncomeReportContext(input: {
  weightPercent: number | null | undefined;
  ratePolicyContext?: Pick<NewsContentItem, "sourceName"> | null;
}): string[] {
  const lines: string[] = [];
  const allocationLine = buildFixedIncomePortfolioContextLine(input.weightPercent);
  if (allocationLine) lines.push(allocationLine);
  if (
    allocationLine &&
    input.ratePolicyContext?.sourceName.trim()
  ) {
    lines.push(
      `Official ${input.ratePolicyContext.sourceName.trim()} rate policy is relevant context for your bond exposure.`,
    );
  }
  return lines;
}
