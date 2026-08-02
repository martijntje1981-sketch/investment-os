"use client";

import { Compass } from "lucide-react";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
} from "@/components/layout/appSurface";
import {
  buildTodaysDecision,
  shouldShowTodaysDecisionSubsection,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

/**
 * Standalone Today’s Decision card for the Dashboard intelligence row.
 * Collapses entirely when there is no useful decision content.
 */
export function DashboardTodaysDecision(context: TodaysDecisionContext) {
  const decision = buildTodaysDecision(context);
  if (!shouldShowTodaysDecisionSubsection(decision, context.intelligence)) {
    return null;
  }

  return (
    <section className={`${appDashboardLightCardClass} h-full`}>
      <DashboardSectionHeader
        variant="compact"
        title="Today’s Decision"
        subtitle="What deserves attention now"
        icon={<Compass className="h-5 w-5" />}
        iconToneClassName="bg-blue-50 text-blue-700 ring-1 ring-blue-100"
      />
      <div className={`${appCardPaddingClass} pt-0`}>
        <TodaysDecisionBlock decision={decision} variant="light" compact />
      </div>
    </section>
  );
}
