"use client";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { appCardClass, appCardPaddingClass } from "@/components/layout/appSurface";
import {
  buildTodaysDecision,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

export function DashboardTodaysDecision(context: TodaysDecisionContext) {
  const decision = buildTodaysDecision(context);

  return (
    <section className={`${appCardClass} ${appCardPaddingClass}`}>
      <TodaysDecisionBlock decision={decision} variant="light" />
    </section>
  );
}
