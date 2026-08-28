import type { PortfolioExposureAllocation } from "@/lib/services/classification/types";

/** One concise mix cue from existing exposure allocation. Null when unreliable. */
export function formatPortfolioMixCue(
  allocation: PortfolioExposureAllocation,
): string | null {
  if (!allocation.hasAnyValue) return null;

  const top = allocation.groups.find(
    (group) =>
      group.groupId !== "other_unclassified" && group.displayPercent > 0,
  );
  if (!top) return null;

  return `${top.displayLabel} ${top.displayPercent}%`;
}
