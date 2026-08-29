import { isMixerAllocationValid } from "@/lib/services/portfolioMixer/allocation";
import { MIXER_SLEEVE_IDS, type MixerAllocation } from "@/lib/services/portfolioMixer/types";

/** Session-only key so Step 2 can read the last Mixer mix without a database. */
export const MIXER_ALLOCATION_STORAGE_KEY = "tobailey.mixer.allocation.v1";

export function serializeMixerAllocation(allocation: MixerAllocation): string {
  return JSON.stringify(allocation);
}

export function parseMixerAllocation(raw: unknown): MixerAllocation | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MixerAllocation>;
    if (!parsed || typeof parsed !== "object") return null;
    const allocation = {} as MixerAllocation;
    for (const id of MIXER_SLEEVE_IDS) {
      const value = parsed[id];
      if (typeof value !== "number" || !Number.isInteger(value)) return null;
      allocation[id] = value;
    }
    return isMixerAllocationValid(allocation) ? allocation : null;
  } catch {
    return null;
  }
}

export function writeMixerAllocationToSession(allocation: MixerAllocation): void {
  if (typeof window === "undefined") return;
  if (!isMixerAllocationValid(allocation)) return;
  try {
    window.sessionStorage.setItem(
      MIXER_ALLOCATION_STORAGE_KEY,
      serializeMixerAllocation(allocation),
    );
  } catch {
    // Private mode / quota — Mixer still works without persistence.
  }
}

export function readMixerAllocationFromSession(): MixerAllocation | null {
  if (typeof window === "undefined") return null;
  try {
    return parseMixerAllocation(
      window.sessionStorage.getItem(MIXER_ALLOCATION_STORAGE_KEY),
    );
  } catch {
    return null;
  }
}
