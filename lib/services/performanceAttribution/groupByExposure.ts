/**
 * Roll instrument attribution into existing exposure classification groups.
 */

import {
  classifyHoldingExposure,
  type ExposureClassificationHolding,
} from "@/lib/services/classification/classifyHoldingExposure";
import { EXPOSURE_GROUP_LABELS } from "@/lib/services/classification/types";
import {
  ATTR_DISPLAY_MIN_PP,
  ATTR_PRIMARY_DRIVER_MIN_PP,
} from "@/lib/services/performanceAttribution/materiality";
import type {
  AssetClassAttributionRow,
  HoldingAttributionRow,
} from "@/lib/services/performanceAttribution/types";

function absPp(value: number | null): number {
  return value != null && Number.isFinite(value) ? Math.abs(value) : 0;
}

export function classifyHoldingForAttribution(
  holding: ExposureClassificationHolding,
): { groupId: HoldingAttributionRow["exposureGroupId"]; label: string } {
  const classified = classifyHoldingExposure(holding);
  return {
    groupId: classified.normalizedGroupId,
    label: classified.displayLabel,
  };
}

export function groupAttributionByExposure(
  holdings: HoldingAttributionRow[],
): AssetClassAttributionRow[] {
  const included = holdings.filter((row) => row.included);
  const buckets = new Map<
    string,
    {
      groupId: NonNullable<HoldingAttributionRow["exposureGroupId"]>;
      label: string;
      contributionPp: number;
      contributionAmount: number;
      startingValue: number;
      endingValue: number;
      holdingCount: number;
    }
  >();

  for (const row of included) {
    const groupId = row.exposureGroupId ?? "other_unclassified";
    const label =
      row.exposureLabel ?? EXPOSURE_GROUP_LABELS[groupId] ?? "Other / Unclassified";
    const existing = buckets.get(groupId);
    const pp = row.contributionPp ?? 0;
    const amount = row.contributionAmount ?? 0;
    const start = row.startingValue ?? 0;
    const end = row.endingValue ?? 0;

    if (!existing) {
      buckets.set(groupId, {
        groupId,
        label,
        contributionPp: pp,
        contributionAmount: amount,
        startingValue: start,
        endingValue: end,
        holdingCount: 1,
      });
      continue;
    }

    existing.contributionPp += pp;
    existing.contributionAmount += amount;
    existing.startingValue += start;
    existing.endingValue += end;
    existing.holdingCount += 1;
  }

  const materialAbs = [...buckets.values()].reduce(
    (sum, bucket) =>
      sum +
      (Math.abs(bucket.contributionPp) >= ATTR_PRIMARY_DRIVER_MIN_PP
        ? Math.abs(bucket.contributionPp)
        : 0),
    0,
  );

  const totalStart = [...buckets.values()].reduce(
    (sum, bucket) => sum + bucket.startingValue,
    0,
  );
  const totalEnd = [...buckets.values()].reduce(
    (sum, bucket) => sum + bucket.endingValue,
    0,
  );

  return [...buckets.values()]
    .map((bucket) => {
      const returnPercent =
        bucket.startingValue > 0
          ? ((bucket.endingValue - bucket.startingValue) /
              bucket.startingValue) *
            100
          : null;
      const share =
        materialAbs > 0 &&
        Math.abs(bucket.contributionPp) >= ATTR_PRIMARY_DRIVER_MIN_PP
          ? Math.abs(bucket.contributionPp) / materialAbs
          : null;

      return {
        level: "classified_asset_group" as const,
        groupId: bucket.groupId,
        label: bucket.label,
        contributionPp: Number.isFinite(bucket.contributionPp)
          ? bucket.contributionPp
          : null,
        contributionAmount: Number.isFinite(bucket.contributionAmount)
          ? bucket.contributionAmount
          : null,
        returnPercent,
        startingWeightPercent:
          totalStart > 0 ? (bucket.startingValue / totalStart) * 100 : null,
        endingWeightPercent:
          totalEnd > 0 ? (bucket.endingValue / totalEnd) * 100 : null,
        contributionShare: share,
        holdingCount: bucket.holdingCount,
      };
    })
    .filter(
      (row) =>
        absPp(row.contributionPp) >= ATTR_DISPLAY_MIN_PP ||
        (row.startingWeightPercent ?? 0) >= 1,
    )
    .sort((a, b) => absPp(b.contributionPp) - absPp(a.contributionPp));
}

/** Holding pp sum vs asset-class pp sum within tolerance. */
export function assetClassRowsReconcileToHoldings(
  holdings: HoldingAttributionRow[],
  assetClasses: AssetClassAttributionRow[],
  tolerancePp = 0.05,
): boolean {
  const holdingSum = holdings
    .filter((row) => row.included)
    .reduce((sum, row) => sum + (row.contributionPp ?? 0), 0);
  const classSum = assetClasses.reduce(
    (sum, row) => sum + (row.contributionPp ?? 0),
    0,
  );
  return Math.abs(holdingSum - classSum) <= tolerancePp;
}
