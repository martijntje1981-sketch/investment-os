"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Sparkles } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import {
  buildPersonalIntelligenceConclusion,
  selectDashboardActionPlanItems,
} from "@/lib/client/dashboardConclusions";
import {
  buildMarketCalmer,
  marketCalmerDriverSymbols,
  type MarketCalmerResult,
} from "@/lib/services/marketCalmer";
import {
  buildPersonalActionPlan,
  type PersonalActionPlanItem,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import { buildThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

type PortfolioThirtySecondsProps = {
  intelligence: PersonalIntelligenceToday;
  holdings?: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  hasSavedGoal?: boolean;
};

function CompactActionRow({ item }: { item: PersonalActionPlanItem }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {item.categoryLabel}
        </span>
        <span className="mt-0.5 block text-[14px] font-semibold leading-snug tracking-[-0.02em] text-slate-950">
          {item.headline}
        </span>
      </span>
      {item.href ? (
        <ArrowUpRight
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        />
      ) : null}
    </>
  );

  const rowClass =
    "flex min-h-11 items-start gap-2 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5";

  if (item.href) {
    return (
      <Link
        href={item.href}
        className={`${rowClass} transition hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40`}
      >
        {body}
      </Link>
    );
  }

  return <div className={rowClass}>{body}</div>;
}

function MarketCalmerBlock({ calmer }: { calmer: MarketCalmerResult }) {
  const detailsId = useId();
  const [expanded, setExpanded] = useState(calmer.activation === "high_stress");

  if (calmer.activation !== "high_stress" || !calmer.headline) {
    return null;
  }

  const directionBorder =
    calmer.direction === "negative"
      ? "border-l-rose-400"
      : calmer.direction === "positive"
        ? "border-l-emerald-500"
        : "border-l-sky-500";

  return (
    <div
      className={`mt-3 rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50/90 to-white px-3.5 py-3.5 shadow-sm border-l-[3px] ${directionBorder}`}
      data-testid="market-calmer"
      data-activation={calmer.activation}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
        Market context
      </p>
      <p className="mt-1 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-slate-950">
        {calmer.headline}
      </p>
      {calmer.mainDriver ? (
        <p className={`mt-1.5 ${appSectionMetaClass}`}>
          {calmer.mainDriver.summary}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-sky-800"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? "Hide context" : "See context"}
      </button>

      {expanded ? (
        <div
          id={detailsId}
          className="mt-2 space-y-2 border-t border-slate-200/70 pt-2"
        >
          {calmer.scenarioContext ? (
            <p className={appSectionMetaClass}>{calmer.scenarioContext.summary}</p>
          ) : null}
          {calmer.resilienceContext ? (
            <p className={appSectionMetaClass}>
              {calmer.resilienceContext.summary}
            </p>
          ) : null}
          {calmer.goalContext ? (
            <p className={appSectionMetaClass}>{calmer.goalContext.summary}</p>
          ) : null}
          <p className={appSectionMetaClass}>
            Review the context before drawing conclusions from one trading day.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Conclusion-first Personal Intelligence — one primary line, optional attention,
 * capped Action Plan, Market Calmer when high-stress.
 */
export function PortfolioThirtySeconds({
  intelligence,
  holdings = [],
  goal = null,
  hasSavedGoal = false,
}: PortfolioThirtySecondsProps) {
  const view = buildThirtySecondsBriefingView(intelligence);

  const calmer = useMemo(
    () =>
      buildMarketCalmer({
        intelligence,
        holdings,
        goal,
        hasSavedGoal,
      }),
    [intelligence, holdings, goal, hasSavedGoal],
  );

  const actionPlan = useMemo(
    () =>
      buildPersonalActionPlan(intelligence, {
        suppressUnderstandForSymbols: marketCalmerDriverSymbols(calmer),
      }),
    [intelligence, calmer],
  );

  const resilienceSensitivityName = useMemo(() => {
    const profile = buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });
    return profile.mostSensitive?.scenarioName ?? null;
  }, [holdings, goal, hasSavedGoal]);

  const conclusion = useMemo(
    () =>
      buildPersonalIntelligenceConclusion({
        intelligence,
        view,
        calmer,
        actionPlan,
        resilienceSensitivityName,
      }),
    [intelligence, view, calmer, actionPlan, resilienceSensitivityName],
  );

  const dashboardActions = useMemo(
    () =>
      selectDashboardActionPlanItems(actionPlan, {
        isQuiet: conclusion.isQuiet,
        calmerActive: calmer.activation !== "inactive",
      }),
    [actionPlan, conclusion.isQuiet, calmer.activation],
  );

  return (
    <section
      aria-labelledby="portfolio-thirty-seconds-heading"
      className={`min-w-0 overflow-hidden rounded-[24px] border border-blue-200/70 border-l-[3px] border-l-blue-500 bg-gradient-to-br from-blue-50/90 via-white to-[#f3f7fb] shadow-[var(--shadow-card)] md:rounded-[28px] ${appCardPaddingCompactClass}`}
      data-testid="portfolio-thirty-seconds"
      data-emphasis={conclusion.isQuiet ? "quiet" : "active"}
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-800 ring-1 ring-blue-100"
          aria-hidden
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <header className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-900/80">
              Personal intelligence
            </p>
            <h2
              id="portfolio-thirty-seconds-heading"
              className="mt-1 text-[1.15rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.2rem]"
            >
              Your portfolio in 30 seconds
            </h2>
          </header>

          <p
            className="mt-3 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-[1.1rem]"
            data-testid="pi-primary-conclusion"
          >
            {conclusion.primaryConclusion}
          </p>

          {conclusion.isQuiet ? (
            <div
              className="mt-3 flex items-start gap-2.5 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white px-3.5 py-3"
              data-testid="portfolio-thirty-seconds-quiet"
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2
                  className="h-4 w-4 text-emerald-700"
                  aria-hidden
                />
              </span>
              <p className="text-[14px] font-medium leading-snug text-slate-700">
                {conclusion.attentionLine}
              </p>
            </div>
          ) : conclusion.attentionLine ? (
            <div className="mt-3" data-testid="pi-attention-item">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                1 thing worth your attention
              </p>
              <p
                className={`mt-1 ${appSectionMetaClass} text-[14px] leading-snug text-slate-800`}
              >
                {conclusion.attentionLine}
              </p>
            </div>
          ) : null}

          <MarketCalmerBlock calmer={calmer} />

          {dashboardActions.length > 0 ? (
            <div className="mt-4 min-w-0" data-testid="personal-action-plan">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Action plan
              </p>
              <ul className="mt-2 space-y-1.5">
                {dashboardActions.map((entry) => (
                  <li key={entry.id}>
                    <CompactActionRow item={entry} />
                  </li>
                ))}
              </ul>
            </div>
          ) : conclusion.isQuiet ? (
            <div className="sr-only" data-testid="personal-action-plan-quiet">
              No action items for today.
            </div>
          ) : null}

          <Link
            href={conclusion.ctaHref}
            className={`mt-3 inline-flex min-h-11 items-center gap-1.5 ${appTextLinkClass}`}
            data-testid="pi-primary-cta"
          >
            {conclusion.ctaLabel}
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
