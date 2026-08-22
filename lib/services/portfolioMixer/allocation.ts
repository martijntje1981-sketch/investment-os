import {
  MIXER_SLEEVE_IDS,
  type MixerAllocation,
  type MixerSleeveId,
} from "@/lib/services/portfolioMixer/types";

/**
 * Illustrative starting mix only — never framed as advice.
 * Chosen so the Mixer has a readable result on first paint.
 */
export const EXAMPLE_MIXER_ALLOCATION: MixerAllocation = {
  stocks: 45,
  bonds: 20,
  bitcoin: 8,
  other_crypto: 2,
  commodities: 5,
  cash: 20,
};

export const MIXER_SLEEVE_LABELS: Record<MixerSleeveId, string> = {
  stocks: "Stocks",
  bonds: "Bonds",
  bitcoin: "Bitcoin",
  other_crypto: "Other Crypto",
  commodities: "Commodities",
  cash: "Cash",
};

export function mixerAllocationTotal(allocation: MixerAllocation): number {
  return MIXER_SLEEVE_IDS.reduce((sum, id) => sum + allocation[id], 0);
}

export function isMixerAllocationValid(allocation: MixerAllocation): boolean {
  if (mixerAllocationTotal(allocation) !== 100) return false;
  return MIXER_SLEEVE_IDS.every((id) => {
    const value = allocation[id];
    return Number.isInteger(value) && value >= 0 && value <= 100;
  });
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Largest-remainder integer split so parts always sum to `total`. */
export function allocateIntegerShares(
  weights: ReadonlyArray<{ id: MixerSleeveId; weight: number }>,
  total: number,
): Partial<Record<MixerSleeveId, number>> {
  if (weights.length === 0 || total <= 0) return {};

  const safeWeights = weights.map((row) => ({
    id: row.id,
    weight: Number.isFinite(row.weight) && row.weight > 0 ? row.weight : 0,
  }));
  const weightSum = safeWeights.reduce((sum, row) => sum + row.weight, 0);
  const effective =
    weightSum > 0
      ? safeWeights
      : safeWeights.map((row) => ({ id: row.id, weight: 1 }));
  const effectiveSum = effective.reduce((sum, row) => sum + row.weight, 0);

  const exact = effective.map((row) => ({
    id: row.id,
    value: (row.weight / effectiveSum) * total,
  }));
  const floors = exact.map((row) => ({
    id: row.id,
    floor: Math.floor(row.value),
    fraction: row.value - Math.floor(row.value),
  }));
  let remainder = total - floors.reduce((sum, row) => sum + row.floor, 0);
  const byFraction = [...floors].sort((left, right) => {
    if (right.fraction !== left.fraction) return right.fraction - left.fraction;
    return left.id.localeCompare(right.id);
  });

  const result: Partial<Record<MixerSleeveId, number>> = {};
  for (const row of floors) {
    result[row.id] = row.floor;
  }
  for (const row of byFraction) {
    if (remainder <= 0) break;
    result[row.id] = (result[row.id] ?? 0) + 1;
    remainder -= 1;
  }
  return result;
}

/**
 * Move one sleeve and rescale the others so the mix stays at exactly 100%.
 * Other sleeves keep their relative weights. If they are all zero, the
 * remainder is split evenly.
 */
export function setMixerSleeve(
  allocation: MixerAllocation,
  sleeve: MixerSleeveId,
  nextValue: number,
): MixerAllocation {
  const clamped = clampPercent(nextValue);
  const others = MIXER_SLEEVE_IDS.filter((id) => id !== sleeve);
  const remaining = 100 - clamped;
  const shares = allocateIntegerShares(
    others.map((id) => ({ id, weight: allocation[id] })),
    remaining,
  );

  const next = { ...allocation, [sleeve]: clamped } as MixerAllocation;
  for (const id of others) {
    next[id] = shares[id] ?? 0;
  }
  return next;
}
