/**
 * Phase 3A materiality — extends Phase 1 attribution thresholds.
 * Product heuristics (not statistical significance).
 */

export {
  ATTRIBUTION_DISPLAY_MIN_PP,
  ATTRIBUTION_MATERIAL_MIN_PP,
  ATTRIBUTION_DOMINANT_SHARE,
  ATTRIBUTION_RECONCILE_TOLERANCE_PP,
  formatContributionPp,
  absContributionPp,
  isDisplayMaterialContribution,
  isAttentionMaterialContribution,
  dominantMaterialDriverShare,
} from "@/lib/services/personalIntelligence/attribution";

/** Display rows in Analysis attribution list (noise floor). */
export const ATTR_DISPLAY_MIN_PP = 0.08;

/** Primary-driver / concentration conclusions. */
export const ATTR_PRIMARY_DRIVER_MIN_PP = 0.15;

/** Dominant share of material |pp| for “drove most of…” copy. */
export const ATTR_DOMINANT_SHARE = 0.55;

/** Broad performance: at least this many holdings with display-material same-sign pp. */
export const ATTR_BROAD_MIN_HOLDINGS = 3;

/** Broad: same-sign material holdings / included holdings. */
export const ATTR_BROAD_MIN_RATIO = 0.6;

/** Surface coverage warning below this portfolio value coverage. */
export const ATTR_COVERAGE_WARN_PERCENT = 85;

/** Conclusion materiality — quiet/flat below this |portfolio return %|. */
export const ATTR_QUIET_RETURN_ABS_PERCENT = 0.15;
