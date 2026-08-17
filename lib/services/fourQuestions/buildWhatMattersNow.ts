/**
 * Q2 — What matters now? (Personal Intelligence + scoped context)
 */

import {
  buildPersonalIntelligenceConclusion,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { NEWS_HUB_PATH } from "@/lib/navigation/newsHubRoutes";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import { buildMarketCalmer } from "@/lib/services/marketCalmer";
import {
  buildPersonalActionPlan,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { buildThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type { FourQuestionAnswer } from "@/lib/services/fourQuestions/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const QUIET_ANSWER = "Nothing requires special attention right now.";

export function buildWhatMattersNowQuestion(input: {
  scope: IntelligenceScopeId;
  holdings: StoredPortfolioHolding[];
  intelligence: PersonalIntelligenceToday | null;
  /** Optional crypto-scoped one-liner when already computed. */
  cryptoDashboardLine?: string | null;
}): FourQuestionAnswer {
  const { scope, holdings, intelligence, cryptoDashboardLine } = input;

  if (!intelligence || holdings.length === 0) {
    return {
      id: "what_matters_now",
      numberLabel: "02",
      question: "What matters now?",
      answer: QUIET_ANSWER,
      support: null,
      expandItems: [],
      disclosures: [],
      explore: {
        label: "Explore news",
        href: NEWS_HUB_PATH,
      },
      quiet: true,
      scope,
    };
  }

  const view = buildThirtySecondsBriefingView(intelligence);
  const calmer = buildMarketCalmer({
    intelligence,
    holdings,
  });
  const actionPlan = buildPersonalActionPlan(intelligence, {
    suppressUnderstandForSymbols: undefined,
  });
  const conclusion = buildPersonalIntelligenceConclusion({
    intelligence,
    view,
    calmer,
    actionPlan,
  });

  const planItems = selectDashboardActionPlanItems(actionPlan, {
    isQuiet: conclusion.isQuiet,
    calmerActive: calmer.activation !== "inactive",
  });

  let answer = conclusion.primaryConclusion;
  let quiet = conclusion.isQuiet;

  // Crypto scope: prefer owned-coin / crypto personal line when stronger.
  if (
    scope === "crypto" &&
    cryptoDashboardLine?.trim() &&
    !conclusion.isQuiet
  ) {
    answer = cryptoDashboardLine.trim();
  } else if (
    scope === "crypto" &&
    cryptoDashboardLine?.trim() &&
    conclusion.isQuiet
  ) {
    // Material crypto line can override quiet PI when present.
    answer = cryptoDashboardLine.trim();
    quiet = false;
  } else if (conclusion.isQuiet) {
    answer = QUIET_ANSWER;
  }

  // Complete: do not stack — keep single highest-value conclusion (already one line).
  const support =
    !quiet && conclusion.attentionLine
      ? conclusion.attentionLine
      : !quiet && planItems[0]
        ? planItems[0].headline
        : null;

  const expandItems = planItems.slice(0, 2).map((item, index) => ({
    id: `matter-${index}`,
    label: item.categoryLabel,
    detail: item.headline,
  }));

  if (
    !quiet &&
    intelligence.headline &&
    expandItems.every((row) => row.detail !== intelligence.headline)
  ) {
    if (expandItems.length < 2) {
      expandItems.push({
        id: "context",
        label: "Context",
        detail: intelligence.headline,
      });
    }
  }

  const exploreHref =
    conclusion.ctaHref ||
    (scope === "crypto"
      ? DASHBOARD_DEEP_LINKS.portfolioPerformance
      : DASHBOARD_DEEP_LINKS.portfolioNews);

  return {
    id: "what_matters_now",
    numberLabel: "02",
    question: "What matters now?",
    answer,
    support: quiet ? null : support,
    expandItems,
    disclosures: [],
    explore: {
      label: "Explore intelligence",
      href: exploreHref.includes("/news")
        ? exploreHref
        : NEWS_HUB_PATH,
    },
    quiet,
    scope,
  };
}
