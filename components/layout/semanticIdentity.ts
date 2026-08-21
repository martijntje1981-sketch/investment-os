/**
 * Semantic visual identity — Four Questions palette reused across the product.
 * Happened = cyan, Matters = violet, On track = amber, Ahead = teal.
 * These four colors stay a Tobailey signature inside Four Questions.
 * Outside Four Questions, major Dashboard intelligence uses the shared
 * Q1 cyan family in appSurface (`appIntelligenceAccent*`), not violet/amber/teal.
 */

export const appIdentityHappenedCardClass =
  "overflow-hidden rounded-[24px] border-2 border-cyan-300 bg-gradient-to-br from-cyan-100 via-sky-50 to-white shadow-[0_12px_32px_-16px_rgba(8,145,178,0.5)]";

export const appIdentityMattersCardClass =
  "overflow-hidden rounded-[24px] border-2 border-violet-300 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-white shadow-[0_12px_32px_-16px_rgba(91,33,182,0.42)]";

export const appIdentityOnTrackCardClass =
  "overflow-hidden rounded-[24px] border-2 border-amber-300 bg-gradient-to-br from-amber-100 via-orange-50 to-white shadow-[0_12px_32px_-16px_rgba(180,83,9,0.42)]";

export const appIdentityAheadCardClass =
  "overflow-hidden rounded-[24px] border-2 border-teal-300 bg-gradient-to-br from-teal-100 via-emerald-50 to-white shadow-[0_12px_32px_-16px_rgba(15,118,110,0.45)]";

export const appIdentityHappenedIconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-md shadow-cyan-800/30";

export const appIdentityMattersIconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-md shadow-violet-800/30";

export const appIdentityOnTrackIconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-800/30";

export const appIdentityAheadIconClass =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-800/30";

export const appIdentityHappenedMetricClass =
  "min-w-0 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-white px-4 py-3.5";

export const appIdentityMattersMetricClass =
  "min-w-0 rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-4 py-3.5";

export const appIdentityOnTrackMetricClass =
  "min-w-0 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white px-4 py-3.5";

export const appIdentityAheadMetricClass =
  "min-w-0 rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white px-4 py-3.5";

export const appKpiPositiveClass =
  "font-bold tabular-nums text-emerald-600";

export const appKpiNegativeClass =
  "font-bold tabular-nums text-rose-600";

export const appKpiGoalClass =
  "font-bold tabular-nums text-amber-800";

export const appKpiIntelClass =
  "font-bold tabular-nums text-cyan-900";

export const appKpiFutureClass =
  "font-bold tabular-nums text-teal-800";
