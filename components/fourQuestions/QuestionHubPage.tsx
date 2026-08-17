"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { FourQuestionsCompactNav } from "@/components/fourQuestions/FourQuestionsCompactNav";
import BottomNavigation from "@/components/home/BottomNav";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { DASHBOARD_PATH } from "@/lib/navigation/appRoutes";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import {
  getFourQuestionDefinition,
  type FourQuestionDefinition,
} from "@/lib/services/fourQuestions/catalog";
import type { FourQuestionId } from "@/lib/services/fourQuestions/types";
import { resolveIntelligenceScope } from "@/lib/services/intelligenceScope";
import { buildPortfolioPulse } from "@/lib/services/portfolio/periodScores";
import { buildResilienceProfile } from "@/lib/services/resilience";
import { areMajorMarketsClosed } from "@/lib/client/todaysDecision";
import { buildDashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

type QuestionHubPageProps = {
  questionId: FourQuestionId;
};

/**
 * Orchestration hub for one Four Question — reuses existing engines only.
 */
export function QuestionHubPage({ questionId }: QuestionHubPageProps) {
  const definition = getFourQuestionDefinition(questionId);
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const goalProgress = useGoalProgress({ holdings, goal, hasSavedGoal });
  const { realityCheck } = useGoalRealityCheck(
    holdings,
    goal,
    holdings.length > 0 && hasSavedGoal,
  );
  const { intelligence, payload } = useInvestmentIntelligence(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const weekHistory = usePortfolioPerformanceHistory(holdings, "1W");
  const monthHistory = usePortfolioPerformanceHistory(holdings, "1M");

  const intelligenceScope = useMemo(
    () => resolveIntelligenceScope().scope,
    [],
  );

  const snapshot = useMemo(
    () => buildDashboardPortfolioSnapshot(holdings, goal, hasSavedGoal),
    [goal, hasSavedGoal, holdings],
  );

  const marketsClosed = areMajorMarketsClosed();

  const portfolioPulse = useMemo(() => {
    if (holdings.length === 0) return null;
    const resilience = buildResilienceProfile({
      holdings,
      goal,
      hasSavedGoal,
    });
    return buildPortfolioPulse({
      daily: {
        holdings,
        marketsClosed,
        href: "/review",
      },
      weekly: {
        week: weekHistory.data,
        month: monthHistory.data,
        href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
      },
      monthly: {
        month: monthHistory.data,
        week: weekHistory.data,
        resilienceScore: resilience.score,
        largestHoldingWeightPercent:
          snapshot.concentrationWeightPercent ?? null,
        goalStatus: goalProgress.hasGoal ? goalProgress.status : null,
        hasSavedGoal: goalProgress.hasGoal,
        href: DASHBOARD_DEEP_LINKS.resilienceSleep,
      },
    });
  }, [
    goal,
    goalProgress.hasGoal,
    goalProgress.status,
    hasSavedGoal,
    holdings,
    marketsClosed,
    monthHistory.data,
    snapshot.concentrationWeightPercent,
    weekHistory.data,
  ]);

  const answer = useMemo(() => {
    if (holdings.length === 0) return null;
    const nextEvent = payload.upcomingEvents?.[0];
    const bundle = buildFourQuestions({
      holdings,
      preferredScope: intelligenceScope,
      goal,
      hasSavedGoal,
      goalProgress,
      realityCheck,
      intelligence,
      pulse: portfolioPulse,
      nextEventLabel: nextEvent?.title?.trim() || null,
      nextEventHref: nextEvent?.title ? "/events" : null,
    });
    return bundle.questions.find((row) => row.id === questionId) ?? null;
  }, [
    goal,
    goalProgress,
    hasSavedGoal,
    holdings,
    intelligence,
    intelligenceScope,
    payload.upcomingEvents,
    portfolioPulse,
    questionId,
    realityCheck,
  ]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer>
        <FourQuestionsCompactNav />

        <HubHero definition={definition} />

        {holdings.length === 0 ? (
          <EmptyPortfolioGuide
            title="Add holdings to answer this question"
            body="Import or add holdings so Tobailey can build this answer from your portfolio."
          />
        ) : answer ? (
          <div className="mt-5 space-y-5" data-testid={`question-hub-${questionId}`}>
            <section
              className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${definition.visual.panel}`}
              data-testid="question-hub-conclusion"
            >
              <p
                className={`text-[11px] font-bold uppercase tracking-[0.14em] ${definition.visual.eyebrow}`}
              >
                Answer
              </p>
              <h2 className="mt-2 text-[1.2rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.35rem]">
                {answer.answer}
              </h2>
              {answer.support ? (
                <p className="mt-1.5 text-[14px] leading-snug text-slate-600">
                  {answer.support}
                </p>
              ) : null}
            </section>

            {answer.expandItems.length > 0 ? (
              <section className={`${appCardClass} ${appCardPaddingClass}`}>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                  Important evidence
                </p>
                <ul className="mt-3 space-y-1">
                  {answer.expandItems.map((item) => (
                    <EvidenceRow key={item.id} item={item} />
                  ))}
                </ul>
              </section>
            ) : null}

            {answer.disclosures.map((line) => (
              <p key={line} className={`text-[12px] ${appSectionMetaClass}`}>
                {line}
              </p>
            ))}

            <section className={`${appCardClass} ${appCardPaddingClass}`}>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                Deep dive
              </p>
              <ul className="mt-3 space-y-2">
                {definition.deepDives.map((dive) => (
                  <li key={dive.href}>
                    <Link
                      href={dive.href}
                      className={`inline-flex min-h-11 items-center gap-1.5 text-[14px] font-semibold ${appTextLinkClass}`}
                    >
                      {dive.label}
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        <p className="mt-8 text-center text-[13px] text-slate-500">
          <Link href={DASHBOARD_PATH} className={appTextLinkClass}>
            Back to Dashboard
          </Link>
        </p>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

function HubHero({ definition }: { definition: FourQuestionDefinition }) {
  return (
    <header
      className={`mt-5 rounded-[24px] border px-4 py-5 sm:px-6 sm:py-6 ${definition.visual.panel}`}
      data-testid="question-hub-hero"
    >
      <p
        className={`text-[11px] font-semibold tabular-nums tracking-[0.1em] ${definition.visual.number}`}
      >
        {definition.numberLabel} · {definition.question}
      </p>
      <h1 className="mt-2 text-[1.5rem] font-bold tracking-[-0.035em] text-slate-950 sm:text-[1.75rem]">
        {definition.humanQuestion}
      </h1>
      <p className="mt-1.5 max-w-xl text-[14px] leading-snug text-slate-600">
        {definition.meaning}
      </p>
    </header>
  );
}

function EvidenceRow({
  item,
}: {
  item: {
    id: string;
    label: string;
    detail?: string | null;
    href?: string | null;
    hrefExternal?: boolean;
  };
}) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {item.label}
        </span>
        {item.detail ? (
          <span className="mt-0.5 block text-[14px] leading-snug text-slate-800">
            {item.detail}
          </span>
        ) : null}
      </span>
      {item.href ? (
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      ) : null}
    </>
  );

  const className =
    "flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-2 text-left";

  if (!item.href) {
    return <div className={className}>{body}</div>;
  }

  if (item.hrefExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${className} cursor-pointer transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35`}
        aria-label={`${item.label}. Opens in a new tab.`}
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${className} cursor-pointer transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35`}
    >
      {body}
    </Link>
  );
}
