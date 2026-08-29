/**
 * Phase 3B X-Ray materiality — product heuristics only.
 */

/** Display hidden company exposures at or above this portfolio weight %. */
export const XRAY_HIDDEN_DISPLAY_MIN_WEIGHT = 1;

/** Overlap insight: at least this many source holdings. */
export const XRAY_OVERLAP_MIN_HOLDINGS = 2;

/** Overlap insight: combined portfolio weight %. */
export const XRAY_OVERLAP_MIN_COMBINED_WEIGHT = 2;

/** Max default hidden exposures in UI / conclusions. */
export const XRAY_TOP_EXPOSURES_LIMIT = 8;

/** Max default conclusions. */
export const XRAY_MAX_CONCLUSIONS = 3;
