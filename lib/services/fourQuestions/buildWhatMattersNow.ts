/**
 * Q2 — What matters now? (Personal Intelligence + scoped context)
 */

import {
  buildPersonalIntelligenceConclusion,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import { NEWS_HUB_PATH } from "@/lib/navigation/newsHubRoutes";
import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";
import { buildMarketCalmer } from "@/lib/services/marketCalmer";
import { buildPersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { buildThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
} from "@/lib/services/fourQuestions/types";
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
        label: "Full intelligence",
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
    answer = cryptoDashboardLine.trim();
    quiet = false;
  } else if (conclusion.isQuiet) {
    answer = QUIET_ANSWER;
  }

  const support =
    !quiet && conclusion.attentionLine
      ? conclusion.attentionLine
      : !quiet && planItems[0]
        ? planItems[0].headline
        : null;

  const expandItems: FourQuestionExpandItem[] = planItems
    .slice(0, 2)
    .map((item, index) => ({
      id: `matter-${index}`,
      label: item.categoryLabel,
      detail: item.headline,
      href: item.href?.trim() || null,
      hrefExternal: Boolean(item.hrefExternal),
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
        href: null,
      });
    }
  }

  return {
    id: "what_matters_now",
    numberLabel: "02",
    question: "What matters now?",
    answer,
    support: quiet ? null : support,
    expandItems,
    disclosures: [],
    explore: {
      label: "Full intelligence",
      href: NEWS_HUB_PATH,
    },
    quiet,
    scope,
  };
}
