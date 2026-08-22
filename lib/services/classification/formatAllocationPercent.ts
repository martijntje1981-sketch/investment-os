/**
 * Display formatting for portfolio allocation weights.
 * Does not change allocation math.
 */

export function formatAllocationPercent(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value <= 0) return "0%";
  if (value < 0.1) return "<0.1%";

  const tenths = Math.round(value * 10) / 10;
  if (tenths < 1) return `${tenths.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}
