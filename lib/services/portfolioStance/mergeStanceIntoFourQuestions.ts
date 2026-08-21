/**
 * Attach material stance change / modeled sensitivity to Four Questions.
 * Never rewrites glance answers. Supporting emphasis only.
 */

import { GOALS_PATH, PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import type { FourQuestionsBundle } from "@/lib/services/fourQuestions/types";
import type { PortfolioStanceHistory } from "@/lib/services/portfolioStance/types";

const STANCE_HREF = `${PORTFOLIO_HISTORY_PATH}#portfolio-stance`;
const TRADEOFF_HREF = `${GOALS_PATH}#goal-trade-offs`;

export function mergeStanceIntoFourQuestions(
  bundle: FourQuestionsBundle,
  history: PortfolioStanceHistory | null | undefined,
): FourQuestionsBundle {
  if (!history || history.current.status !== "ready") return bundle;
  const change = history.change;
  const stance = history.current;
  const scenarioName = stance.inputs?.modeledScenarioName;

  return {
    ...bundle,
    questions: bundle.questions.map((question) => {
      if (question.id === "what_matters_now") {
        if (!change?.material || !change.zoneChanged) return question;
        if (question.expandItems.some((item) => item.id === "stance-zone-shift")) {
          return question;
        }
        return {
          ...question,
          expandItems: [
            ...question.expandItems,
            {
              id: "stance-zone-shift",
              label: "Portfolio stance",
              detail: change.summary,
              bullets: history.current.drivers.slice(0, 2).map(
                (driver) => `${driver.label} ${driver.valueLabel}`,
              ),
              href: STANCE_HREF,
              emphasis: "supporting" as const,
            },
          ],
        };
      }

      if (question.id === "whats_ahead") {
        if (!scenarioName || question.quiet) return question;
        if (
          question.expandItems.some((item) => item.id === "stance-modeled-sensitivity")
        ) {
          return question;
        }
        return {
          ...question,
          expandItems: [
            ...question.expandItems,
            {
              id: "stance-modeled-sensitivity",
              label: "Portfolio stance",
              detail: `Your current stance makes ${scenarioName} the largest modeled sensitivity.`,
              href: TRADEOFF_HREF,
              emphasis: "supporting" as const,
            },
          ],
        };
      }

      return question;
    }),
  };
}
