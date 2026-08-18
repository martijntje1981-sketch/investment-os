/**
 * Existing destinations for in-app report rows. No new routes.
 */

import { GOALS_PATH } from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PeriodReportExploreHrefs } from "@/lib/services/periodIntelligence/types";

export function periodReportExploreHrefs(
  hasGoalSection: boolean,
): PeriodReportExploreHrefs {
  return {
    happened: DASHBOARD_DEEP_LINKS.whatHappenedHub,
    changed: DASHBOARD_DEEP_LINKS.whatMattersHub,
    matters: DASHBOARD_DEEP_LINKS.whatMattersHub,
    goal: hasGoalSection ? GOALS_PATH : null,
    ahead: DASHBOARD_DEEP_LINKS.whatsAheadHub,
  };
}
