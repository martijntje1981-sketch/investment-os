/**
 * Q2 expand items for Portfolio Evolution.
 * Never overrides the glance answer.
 */

import { PORTFOLIO_EVOLUTION_HREF } from "@/lib/services/portfolioEvolution/config";
import type { PortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution/types";
import type { FourQuestionExpandItem } from "@/lib/services/fourQuestions/types";

export function buildEvolutionQ2ExpandItems(
  timeline: PortfolioEvolutionTimeline | null | undefined,
): FourQuestionExpandItem[] {
  if (!timeline || timeline.emptyState === "building") return [];
  if (!timeline.conclusion.material) return [];

  const bullets = [
    ...timeline.beforeNow.slice(0, 3).map(
      (row) => `${row.label} ${row.fromLabel} → ${row.toLabel}`,
    ),
    ...timeline.fundingEvents.slice(0, 1).map((event) => {
      const sign = event.amount >= 0 ? "+" : "−";
      return `Recorded ${event.title.toLowerCase()} ${sign}€${Math.round(Math.abs(event.amount)).toLocaleString("en-GB")}`;
    }),
  ].slice(0, 3);

  return [
    {
      id: "evolution-structure",
      label: timeline.conclusion.primary,
      detail: "Explore evolution →",
      bullets: bullets.length > 0 ? bullets : undefined,
      href: PORTFOLIO_EVOLUTION_HREF,
      emphasis: "supporting",
    },
  ];
}
