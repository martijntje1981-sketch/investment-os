"use client";

import { Compass } from "lucide-react";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardClass,
  appCardPaddingClass,
} from "@/components/layout/appSurface";
import {
  buildTodaysDecision,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

export function DashboardTodaysDecision(context: TodaysDecisionContext) {
  const decision = buildTodaysDecision(context);

  return (
    <section className={appCardClass}>
      <DashboardSectionHeader
        title="Today's decision"
        subtitle="What deserves your attention today"
        icon={<Compass className="h-5 w-5" />}
        iconToneClassName="bg-blue-50 text-blue-700"
      />
      <div className={appCardPaddingClass}>
        <TodaysDecisionBlock decision={decision} variant="light" />
      </div>
    </section>
  );
}
