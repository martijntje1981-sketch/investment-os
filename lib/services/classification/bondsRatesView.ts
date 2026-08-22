/**
 * Presentation model for Analysis → Bonds & Rates.
 * Reuses existing classification, official RSS context, and the canonical
 * official-rates service. No duration math and no invented yields.
 */

import { holdingDetailPath, portfolioAddPath } from "@/lib/navigation/appRoutes";
import { classifyHoldingExposure } from "@/lib/services/classification/classifyHoldingExposure";
import { formatAllocationPercent } from "@/lib/services/classification/formatAllocationPercent";
import {
  buildWhyRatesMatterCopy,
  selectVisibleOfficialRates,
} from "@/lib/services/officialRates/interpretFixedIncomeRates";
import type {
  OfficialRatesRegionGroup,
  OfficialRatesSnapshot,
} from "@/lib/services/officialRates/types";
import {
  FIXED_INCOME_CREDIT_LABELS,
  FIXED_INCOME_DURATION_LABELS,
  FIXED_INCOME_TYPE_LABELS,
  formatFixedIncomeSubtypeLabel,
  inferFixedIncomeShareClassContext,
  type FixedIncomeClassification,
  type FixedIncomeFieldConfidence,
} from "@/lib/services/classification/classifyFixedIncome";
import { buildFixedIncomeRateEducation } from "@/lib/services/classification/fixedIncomeEducation";
import type { PortfolioExposureAllocation } from "@/lib/services/classification/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const BONDS_RATES_SECTION_ID = "bonds-rates";

export const BONDS_RATES_OFFICIAL_CONTEXT_LABEL = "Official macro context";

export const BONDS_RATES_OFFICIAL_NOT_CAUSE =
  "Official headlines are macro context, not proof that a bond holding moved.";

export const BONDS_RATES_ADD_HOLDING_HREF = portfolioAddPath("investment");

export const BONDS_RATES_EMPTY_HEADLINE =
  "No Fixed Income holdings in this portfolio.";

export const BONDS_RATES_EMPTY_BODY =
  "Add a bond or bond ETF and Tobailey can place it in your allocation and explain how interest rates relate to that exposure.";

export type BondsRatesOfficialContext = {
  title: string;
  canonicalUrl: string;
  sourceName: string;
  publishedAt: string | null;
};

export type BondsRatesMetric = {
  id: string;
  label: string;
  value: string;
  detail: string | null;
};

export type BondsRatesHoldingRow = {
  id: string;
  symbol: string;
  name: string;
  href: string;
  percent: number;
};

export type BondsRatesView = {
  hasFixedIncome: boolean;
  weightPercent: number | null;
  sleeveValue: number | null;
  allocationLine: string;
  emptyHeadline: string;
  emptyBody: string;
  addHoldingHref: string;
  whatMatters: string | null;
  rateEffect: string | null;
  educationHeadline: string;
  educationBody: string;
  durationNote: string | null;
  showBreakdown: boolean;
  metrics: BondsRatesMetric[];
  holdings: BondsRatesHoldingRow[];
  subtypeRows: Array<{ id: string; label: string; percent: number }>;
  officialContext: BondsRatesOfficialContext | null;
  limitations: string[];
  rateGroups: OfficialRatesRegionGroup[];
  ratesAreStale: boolean;
  showRateChanges: boolean;
  whyRatesMatter: string | null;
};

const MATERIAL_WEIGHT_PERCENT = 1;

function classifiedShare(sleeve: {
  durationClassifiedSharePercent?: number;
  durationKnownSharePercent: number;
}): number {
  if (
    sleeve.durationClassifiedSharePercent != null &&
    Number.isFinite(sleeve.durationClassifiedSharePercent)
  ) {
    return sleeve.durationClassifiedSharePercent;
  }
  return sleeve.durationKnownSharePercent;
}

export function buildFixedIncomePortfolioContextLine(
  weightPercent: number | null | undefined,
): string | null {
  if (weightPercent == null || !Number.isFinite(weightPercent)) return null;
  if (weightPercent < MATERIAL_WEIGHT_PERCENT) return null;
  return `Fixed income now represents ${formatAllocationPercent(weightPercent)} of your portfolio.`;
}

export function formatFixedIncomeHoldingField(
  valueLabel: string,
  confidence: FixedIncomeFieldConfidence,
): string {
  return formatFixedIncomeSubtypeLabel({
    displayLabel: valueLabel,
    confidence,
  });
}

export function buildFixedIncomeHoldingProfile(
  classification: FixedIncomeClassification | null | undefined,
  holding?: Pick<StoredPortfolioHolding, "name" | "instrumentName">,
): {
  typeLabel: string | null;
  durationLabel: string | null;
  creditLabel: string | null;
  hedgeLabel: string | null;
  durationUnknown: boolean;
  typeUnknown: boolean;
  creditUnknown: boolean;
} | null {
  if (!classification?.isFixedIncome) return null;
  const typeUnknown = classification.type === "unknown";
  const durationUnknown = classification.durationBucket === "unknown";
  const creditUnknown = classification.creditQuality === "mixed_unknown";
  const hedge = holding
    ? inferFixedIncomeShareClassContext(holding).currencyHedge
    : null;
  return {
    typeLabel: typeUnknown
      ? null
      : formatFixedIncomeHoldingField(
          FIXED_INCOME_TYPE_LABELS[classification.type],
          classification.confidence.type,
        ),
    durationLabel: durationUnknown
      ? null
      : formatFixedIncomeHoldingField(
          `${FIXED_INCOME_DURATION_LABELS[classification.durationBucket]} duration`,
          classification.confidence.duration,
        ),
    creditLabel: creditUnknown
      ? null
      : formatFixedIncomeHoldingField(
          FIXED_INCOME_CREDIT_LABELS[classification.creditQuality],
          classification.confidence.creditQuality,
        ),
    hedgeLabel: hedge
      ? formatFixedIncomeHoldingField(hedge, "inferred")
      : null,
    durationUnknown,
    typeUnknown,
    creditUnknown,
  };
}

export function buildQualitativeRateOutlook(input: {
  weightPercent: number | null;
  durationKnownSharePercent: number;
  durationClassifiedSharePercent?: number;
  majorityIsLongDuration: boolean;
  majorityIsClassifiedLongDuration?: boolean;
}): string | null {
  if (input.weightPercent == null || input.weightPercent < 8) return null;
  const classified = classifiedShare({
    durationClassifiedSharePercent: input.durationClassifiedSharePercent,
    durationKnownSharePercent: input.durationKnownSharePercent,
  });
  const long =
    input.majorityIsClassifiedLongDuration ?? input.majorityIsLongDuration;
  if (!(classified > 0)) {
    return "Bond prices are generally sensitive to market yields. Exact rate sensitivity is not calculated because duration is unavailable.";
  }
  if (long) {
    return "A large share of this Fixed Income sleeve is classified as longer duration, so it is generally more sensitive to yield changes. This is qualitative context, not a modeled shock.";
  }
  return "Fixed income is part of this portfolio. Rate sensitivity is qualitative only; Tobailey does not calculate a precise rate shock.";
}

function dominantSubtype(allocation: PortfolioExposureAllocation) {
  const rows = allocation.fixedIncome?.subgroups ?? [];
  if (rows.length === 0) return null;
  return [...rows].sort((left, right) => right.value - left.value)[0] ?? null;
}

function creditMetric(
  holdings: StoredPortfolioHolding[],
  showBreakdown: boolean,
): BondsRatesMetric | null {
  if (!showBreakdown) return null;
  const fiCredits = holdings
    .map((row) => classifyHoldingExposure(row).fixedIncome)
    .filter((row): row is NonNullable<typeof row> => Boolean(row?.isFixedIncome))
    .map((row) => row.creditQuality);
  if (fiCredits.length === 0) return null;
  if (fiCredits.some((row) => row === "mixed_unknown")) return null;
  const unique = [...new Set(fiCredits)];
  if (unique.length !== 1 || !unique[0]) return null;
  return {
    id: "credit",
    label: "Credit profile",
    value: FIXED_INCOME_CREDIT_LABELS[unique[0]],
    detail: "Inferred",
  };
}

function rateSensitivityMetric(
  sleeve: NonNullable<PortfolioExposureAllocation["fixedIncome"]>,
  showBreakdown: boolean,
): BondsRatesMetric | null {
  if (!showBreakdown) return null;
  if (!(sleeve.durationClassifiedSharePercent > 0)) return null;
  const value = sleeve.majorityIsClassifiedLongDuration
    ? "Higher"
    : sleeve.majorityIsClassifiedShortDuration
      ? "Lower"
      : "Moderate";
  return {
    id: "sensitivity",
    label: "Rate sensitivity",
    value,
    detail:
      sleeve.durationKnownSharePercent > 0
        ? "From classified duration buckets"
        : "Inferred from maturity/duration language",
  };
}

function hedgeMetric(
  holdings: StoredPortfolioHolding[],
  fiSymbols: Set<string>,
  showBreakdown: boolean,
): BondsRatesMetric | null {
  if (!showBreakdown) return null;
  const labels = holdings
    .filter((row) => fiSymbols.has(row.symbol.trim().toUpperCase()))
    .map((row) => inferFixedIncomeShareClassContext(row).currencyHedge)
    .filter((row): row is string => Boolean(row));
  if (labels.length === 0) return null;
  const unique = [...new Set(labels)];
  if (unique.length !== 1 || !unique[0]) return null;
  return {
    id: "hedge",
    label: "Share class",
    value: unique[0],
    detail: "Inferred",
  };
}

function currencyMetric(
  holdings: StoredPortfolioHolding[],
  fiSymbols: Set<string>,
  showBreakdown: boolean,
): BondsRatesMetric | null {
  if (!showBreakdown) return null;
  const codes = [
    ...new Set(
      holdings
        .filter((row) => fiSymbols.has(row.symbol.trim().toUpperCase()))
        .map((row) => row.quoteCurrency?.trim().toUpperCase())
        .filter((code): code is string => Boolean(code)),
    ),
  ].sort();
  if (codes.length === 0) return null;
  return {
    id: "currency",
    label: "Currency",
    value: codes.join(" / "),
    detail: null,
  };
}

function whatMattersLine(
  sleeve: NonNullable<PortfolioExposureAllocation["fixedIncome"]>,
  typeRow: ReturnType<typeof dominantSubtype>,
): string {
  const weight = formatAllocationPercent(sleeve.weightPercent);
  const typePart =
    typeRow && typeRow.type !== "unknown"
      ? `, mostly ${formatFixedIncomeSubtypeLabel(typeRow).replace(/ · inferred$/i, "").toLowerCase()}`
      : "";
  const inferred = typeRow?.confidence === "inferred" ? " (inferred)" : "";
  if (sleeve.majorityIsClassifiedLongDuration) {
    return `Fixed Income is ${weight} of this portfolio${typePart}${inferred}. Classified holdings lean longer duration, so this sleeve is generally more sensitive to yield changes.`;
  }
  return `Fixed Income is ${weight} of this portfolio${typePart}${inferred}. Rates and existing bond prices generally move in opposite directions; this sleeve is part of that picture.`;
}

function rateEffectLine(
  sleeve: NonNullable<PortfolioExposureAllocation["fixedIncome"]>,
): string {
  if (sleeve.durationClassifiedSharePercent > 0) {
    if (sleeve.majorityIsClassifiedLongDuration) {
      return "Longer-duration holdings in this sleeve are generally more sensitive when market yields move. Exact price impact is not calculated.";
    }
    if (sleeve.majorityIsClassifiedShortDuration) {
      return "Shorter-duration holdings in this sleeve are generally less sensitive when market yields move. Exact price impact is not calculated.";
    }
    return "This sleeve includes classified duration buckets. Longer duration is generally more rate-sensitive; shorter duration is generally less so. Exact price impact is not calculated.";
  }
  return "Rates and existing bond prices generally move in opposite directions. Exact sensitivity is not calculated because duration is not available for this sleeve.";
}

export function buildBondsRatesView(input: {
  allocation: PortfolioExposureAllocation;
  holdings?: StoredPortfolioHolding[];
  ratePolicyContext?: Pick<
    NewsContentItem,
    "title" | "canonicalUrl" | "sourceName" | "publishedAt"
  > | null;
  intelligenceDepth?: "free" | "complete";
  officialRates?: OfficialRatesSnapshot | null;
}): BondsRatesView {
  const sleeve = input.allocation.fixedIncome;
  const fiGroup = input.allocation.groups.find(
    (group) => group.groupId === "fixed_income",
  );
  const hasFixedIncome = Boolean(sleeve);
  const education = buildFixedIncomeRateEducation(hasFixedIncome ? sleeve : null);
  const showBreakdown = input.intelligenceDepth !== "free" && hasFixedIncome;
  const typeRow = dominantSubtype(input.allocation);
  const fiSymbols = new Set(
    (fiGroup?.holdings ?? []).map((row) => row.symbol.trim().toUpperCase()),
  );

  const metrics: BondsRatesMetric[] = [];
  if (hasFixedIncome && sleeve) {
    if (typeRow && typeRow.type !== "unknown") {
      metrics.push({
        id: "type",
        label: "Type",
        value: formatFixedIncomeSubtypeLabel(typeRow).replace(/ · inferred$/i, ""),
        detail:
          typeRow.confidence === "inferred"
            ? "Inferred"
            : typeRow.confidence === "known"
              ? "Known"
              : null,
      });
    }
    const sensitivity = rateSensitivityMetric(sleeve, showBreakdown);
    if (sensitivity) metrics.push(sensitivity);
    const credit = creditMetric(input.holdings ?? [], showBreakdown);
    if (credit) metrics.push(credit);
    const hedge = hedgeMetric(input.holdings ?? [], fiSymbols, showBreakdown);
    if (hedge) metrics.push(hedge);
    const currency = currencyMetric(input.holdings ?? [], fiSymbols, showBreakdown);
    if (currency) metrics.push(currency);
  }

  const official =
    hasFixedIncome && input.ratePolicyContext
      ? {
          title: input.ratePolicyContext.title,
          canonicalUrl: input.ratePolicyContext.canonicalUrl,
          sourceName: input.ratePolicyContext.sourceName,
          publishedAt: input.ratePolicyContext.publishedAt ?? null,
        }
      : null;

  const depth = input.intelligenceDepth === "free" ? "free" : "complete";
  const visibleRates = selectVisibleOfficialRates(
    (input.officialRates?.groups ?? []).flatMap((group) => group.rates),
    depth,
  );
  const rateGroups = (input.officialRates?.groups ?? [])
    .map((group) => ({
      ...group,
      rates: group.rates.filter((rate) =>
        visibleRates.some((visible) => visible.id === rate.id),
      ),
    }))
    .filter((group) => group.rates.length > 0);
  const fiHolding = (input.holdings ?? []).find((row) =>
    fiSymbols.has(row.symbol.trim().toUpperCase()),
  );
  const whyRatesMatter =
    depth === "complete"
      ? buildWhyRatesMatterCopy({
          hasFixedIncome,
          subtype: typeRow?.type ?? null,
          durationUnknown: !sleeve || classifiedShare(sleeve) <= 0,
          currencyHedge: fiHolding
            ? inferFixedIncomeShareClassContext(fiHolding).currencyHedge
            : null,
          rates: visibleRates,
        })
      : null;

  const limitations = hasFixedIncome
    ? [
        "Official policy and overnight rates come from the ECB and New York Fed. Coupons, yields and duration are not invented.",
        education.durationNote,
        BONDS_RATES_OFFICIAL_NOT_CAUSE,
      ].filter((row): row is string => Boolean(row))
    : [
        "Bond ETFs and individual bonds can be added through Portfolio → Add holding.",
        "Tobailey classifies Fixed Income from existing instrument metadata and names, labeled known, inferred or unknown.",
      ];

  return {
    hasFixedIncome,
    weightPercent: sleeve?.weightPercent ?? null,
    sleeveValue: fiGroup?.value ?? null,
    allocationLine:
      buildFixedIncomePortfolioContextLine(sleeve?.weightPercent ?? null) ??
      (hasFixedIncome
        ? "This portfolio includes classified Fixed Income holdings."
        : BONDS_RATES_EMPTY_HEADLINE),
    emptyHeadline: BONDS_RATES_EMPTY_HEADLINE,
    emptyBody: BONDS_RATES_EMPTY_BODY,
    addHoldingHref: BONDS_RATES_ADD_HOLDING_HREF,
    whatMatters: hasFixedIncome && sleeve ? whatMattersLine(sleeve, typeRow) : null,
    rateEffect: hasFixedIncome && sleeve ? rateEffectLine(sleeve) : null,
    educationHeadline: education.headline,
    educationBody: education.body,
    durationNote: education.durationNote,
    showBreakdown,
    metrics,
    holdings: showBreakdown
      ? (fiGroup?.holdings ?? []).map((row) => ({
          id: row.id,
          symbol: row.symbol,
          name: row.name,
          href: holdingDetailPath(row.symbol),
          percent: fiGroup && fiGroup.value > 0 ? (row.value / fiGroup.value) * 100 : 0,
        }))
      : [],
    subtypeRows: showBreakdown
      ? (sleeve?.subgroups ?? []).map((row) => ({
          id: row.subgroupId,
          label: formatFixedIncomeSubtypeLabel(row),
          percent: row.displayPercent,
        }))
      : [],
    officialContext: official,
    limitations,
    rateGroups,
    ratesAreStale: Boolean(input.officialRates?.isStale),
    showRateChanges: depth === "complete",
    whyRatesMatter,
  };
}

export function buildFixedIncomeReportContext(input: {
  weightPercent: number | null | undefined;
  ratePolicyContext?: Pick<NewsContentItem, "sourceName"> | null;
}): string[] {
  const lines: string[] = [];
  const allocationLine = buildFixedIncomePortfolioContextLine(input.weightPercent);
  if (allocationLine) lines.push(allocationLine);
  if (allocationLine && input.ratePolicyContext?.sourceName.trim()) {
    lines.push(
      `Official ${input.ratePolicyContext.sourceName.trim()} rate policy is relevant context for your bond exposure.`,
    );
  }
  return lines;
}
