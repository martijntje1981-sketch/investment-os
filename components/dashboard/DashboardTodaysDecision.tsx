"use client";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionEyebrowClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  buildTodaysDecision,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

export function DashboardTodaysDecision(context: TodaysDecisionContext) {
  const decision = buildTodaysDecision(context);

  return (
    <section className={`${appCardClass} ${appCardPaddingClass}`}>
      <div className="mb-4">
        <p className={appSectionEyebrowClass}>Action</p>
        <h2 className={`mt-1 ${appSectionTitleClass}`}>Today&apos;s decision</h2>
      </div>
      <TodaysDecisionBlock decision={decision} variant="light" />
    </section>
  );
}
