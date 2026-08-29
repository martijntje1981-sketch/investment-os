/**
 * Shared helpers for Portfolio Health Score v1.
 */

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function roundScore(value: number): number {
  return Math.round(clampScore(value));
}

/** Piecewise-linear interpolation across ascending `at` anchors. */
export function interpolateAnchors(
  value: number,
  anchors: ReadonlyArray<{ readonly at: number; readonly score: number }>,
): number {
  if (anchors.length === 0) return 0;
  if (!Number.isFinite(value)) return anchors[0]!.score;

  if (value <= anchors[0]!.at) return anchors[0]!.score;
  const last = anchors[anchors.length - 1]!;
  if (value >= last.at) return last.score;

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const left = anchors[i]!;
    const right = anchors[i + 1]!;
    if (value >= left.at && value <= right.at) {
      const span = right.at - left.at;
      if (span <= 0) return right.score;
      const t = (value - left.at) / span;
      return left.score + t * (right.score - left.score);
    }
  }

  return last.score;
}

export function yearsRemaining(
  targetYear: number | null | undefined,
  now = new Date(),
): number | null {
  if (targetYear == null || !Number.isFinite(targetYear)) return null;
  const end = Date.UTC(targetYear, 11, 31);
  const ms = end - now.getTime();
  return Math.max(0, ms / (365.25 * 24 * 60 * 60 * 1000));
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}
