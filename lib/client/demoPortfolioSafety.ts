/**
 * Safety gates for replacing Example Portfolio sample data.
 *
 * After cloud sync, seeded holding ids are remapped away from the
 * `example-*` prefix, and goals have no durable example stamp. Until a
 * durable origin field exists, destructive "Start fresh" must not run.
 */

import { EXAMPLE_HOLDING_ID_PREFIX } from "@/lib/services/examplePortfolio/templates";

export const DEMO_REPLACE_UNSAFE_REASON =
  "Sample holdings cannot be distinguished from your own data after sync. Automatic deletion is blocked to protect genuine holdings, goals and history.";

export const DEMO_ORIGIN_SCHEMA_NOTE =
  "Minimal durable stamp required before safe wipe: holdings.origin ('example_seed' | 'user'), goals.origin with the same values, set at seed time and preserved through sync. Do not rely on symbol heuristics.";

export type DemoReplaceSafetyResult =
  | { safe: true }
  | { safe: false; reason: string; schemaNote: string };

/**
 * Returns whether demo-only data can be wiped without risking user data.
 * Currently always unsafe — holding ids are remapped and goals are unstamped.
 */
export function canSafelyReplaceDemoPortfolio(input: {
  holdings: Array<{ id: string }>;
  exampleSeeded: boolean;
}): DemoReplaceSafetyResult {
  void input;
  // Even when some ids still use the example prefix, goals and remapped
  // holdings cannot be classified safely. Block all destructive wipes.
  return {
    safe: false,
    reason: DEMO_REPLACE_UNSAFE_REASON,
    schemaNote: DEMO_ORIGIN_SCHEMA_NOTE,
  };
}

/** Pure helper for tests — detects legacy in-memory example ids only. */
export function holdingIdLooksLikeExampleSeed(id: string): boolean {
  return id.startsWith(EXAMPLE_HOLDING_ID_PREFIX);
}
