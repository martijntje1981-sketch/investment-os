"use client";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import {
  buildTodaysDecision,
  shouldShowTodaysDecisionSubsection,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

/**
 * Compact Today’s Decision subsection for the combined Market Briefing card.
 * Returns null when there is no useful additional content.
 */
export function DashboardTodaysDecision(context: TodaysDecisionContext) {
  const decision = buildTodaysDecision(context);
  if (!shouldShowTodaysDecisionSubsection(decision, context.intelligence)) {
    return null;
  }

  return (
    <div className="border-t border-slate-200/80 pt-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
        Today’s Decision
      </p>
      <p className="mt-0.5 text-[12px] font-medium text-slate-500">
        What deserves your attention today
      </p>
      <div className="mt-2.5">
        <TodaysDecisionBlock decision={decision} variant="light" compact />
      </div>
    </div>
  );
}
