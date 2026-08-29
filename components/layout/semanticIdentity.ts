/**
 * Semantic visual identity — Four Questions palette reused across the product.
 * Q1 brightest Tobailey blue → Q4 deepest navy. One family, four depths.
 * Outside Four Questions, major Dashboard intelligence uses the shared
 * brand-blue accent in appSurface (`appIntelligenceAccent*`).
 */

import { FOUR_QUESTION_VISUAL } from "@/lib/services/fourQuestions/types";

export const appIdentityHappenedCardClass = FOUR_QUESTION_VISUAL.what_happened.card;

export const appIdentityMattersCardClass =
  FOUR_QUESTION_VISUAL.what_matters_now.card;

export const appIdentityOnTrackCardClass = FOUR_QUESTION_VISUAL.am_i_on_track.card;

export const appIdentityAheadCardClass = FOUR_QUESTION_VISUAL.whats_ahead.card;

export const appIdentityHappenedIconClass =
  FOUR_QUESTION_VISUAL.what_happened.iconWell;

export const appIdentityMattersIconClass =
  FOUR_QUESTION_VISUAL.what_matters_now.iconWell;

export const appIdentityOnTrackIconClass =
  FOUR_QUESTION_VISUAL.am_i_on_track.iconWell;

export const appIdentityAheadIconClass = FOUR_QUESTION_VISUAL.whats_ahead.iconWell;

export const appIdentityHappenedMetricClass =
  "min-w-0 rounded-2xl border border-q1/25 bg-gradient-to-br from-q1-soft to-white px-4 py-3.5";

export const appIdentityMattersMetricClass =
  "min-w-0 rounded-2xl border border-q2/25 bg-gradient-to-br from-q2-soft to-white px-4 py-3.5";

export const appIdentityOnTrackMetricClass =
  "min-w-0 rounded-2xl border border-q3/25 bg-gradient-to-br from-q3-soft to-white px-4 py-3.5";

export const appIdentityAheadMetricClass =
  "min-w-0 rounded-2xl border border-q4/25 bg-gradient-to-br from-q4-soft to-white px-4 py-3.5";

export const appKpiPositiveClass =
  "font-bold tabular-nums text-emerald-700";

export const appKpiNegativeClass =
  "font-bold tabular-nums text-rose-700";

export const appKpiGoalClass =
  "font-bold tabular-nums text-q3-strong";

export const appKpiIntelClass =
  "font-bold tabular-nums text-q1-deep";

export const appKpiFutureClass =
  "font-bold tabular-nums text-q4-strong";
