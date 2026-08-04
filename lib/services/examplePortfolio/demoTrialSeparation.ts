/**
 * Helpers that keep Demo Portfolio showroom data separate from clean
 * personal Premium trials (no shared seed path).
 */

import type { ExampleTrialKind } from "@/lib/services/examplePortfolio/types";

export function resolveSeedHoldingsPreference(input: {
  seedHoldings?: boolean;
  metadata?: Record<string, unknown> | null;
}): boolean {
  if (typeof input.seedHoldings === "boolean") return input.seedHoldings;
  const meta = input.metadata ?? {};
  if (meta.pending_personal_trial === true) return false;
  if (meta.example_trial_kind === "personal") return false;
  return true;
}

export function resolveExampleTrialKind(input: {
  seedHoldings: boolean;
  metadata?: Record<string, unknown> | null;
}): ExampleTrialKind {
  if (!input.seedHoldings) return "personal";
  const existing = input.metadata?.example_trial_kind;
  if (existing === "personal" || existing === "demo") return existing;
  return "demo";
}

/**
 * Demo seed holdings and a personal-trial stamp must never coexist.
 * Used by focused tests and defensive UI gates.
 */
export function demoAndPersonalStatesConflict(input: {
  hasDemoSeedHoldings: boolean;
  trialKind: ExampleTrialKind | null | undefined;
}): boolean {
  return input.hasDemoSeedHoldings && input.trialKind === "personal";
}

/** Existing seeded accounts keep their data; migrate later if needed. */
export const EXISTING_SEEDED_USER_MIGRATION_NOTES = [
  "Do not auto-wipe accounts with seeded_at or demo holdings.",
  "Optional later migration: stamp example_trial_kind=demo where seeded_at is set.",
  "Optional later UX: offer Import / Add holdings and hide demo callout once the user replaces holdings.",
  "Never delete holdings or goals from already-seeded trial accounts without an explicit user action and durable origin stamps.",
] as const;
