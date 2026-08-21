/**
 * Phase 13 materiality — conservative, deterministic, no article-count ranking.
 * Structural thresholds stay in Change Intelligence; this layer only adds
 * daily/news floors and attention caps.
 */

import { ATTRIBUTION_MATERIAL_MIN_PP } from "@/lib/services/personalIntelligence/attribution";

export const PORTFOLIO_CHANGE_MAX_PRIMARY = 1;
export const PORTFOLIO_CHANGE_MAX_SECONDARY = 2;

/** Contribution-only alerts sit above the daily briefing floor. */
export const PORTFOLIO_CHANGE_CONTRIBUTION_PP = 0.25;

/** News-backed holding moves may use the existing attention floor. */
export const PORTFOLIO_CHANGE_NEWS_BACKED_PP = ATTRIBUTION_MATERIAL_MIN_PP;

export const NOTHING_IMPORTANT_CHANGED_COPY =
  "No material portfolio changes need your attention right now.";

export const NOTHING_MATERIAL_SUPPORT_COPY =
  "Your portfolio remains broadly consistent with the latest comparable snapshot.";

export const INSUFFICIENT_CHANGE_HISTORY_COPY =
  "Tobailey doesn’t have enough comparable history yet to say what changed.";

export const UNAVAILABLE_CHANGE_COPY =
  "Change intelligence isn’t available for this portfolio yet.";

export const FREE_CHANGE_TEASE =
  "Complete shows up to two more portfolio changes when they matter.";

export const STRUCTURAL_COMPARISON_LIMITATION =
  "Structural comparison uses your last stored intelligence snapshot versus current holdings. Tobailey does not invent a previous state.";

export const DAILY_COMPARISON_LIMITATION =
  "Today’s holding contribution uses existing daily performance — not a stored intraday snapshot.";

export const NEWS_CAUSALITY_LIMITATION =
  "Matched news is context, not proof that the article caused the holding’s move.";
