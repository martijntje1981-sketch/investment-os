"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useMemo } from "react";

import { FourQuestionsCompactNav } from "@/components/fourQuestions/FourQuestionsCompactNav";
import { QuestionHubBrandBar } from "@/components/fourQuestions/QuestionHubBrandBar";
import { TobaileyMarkWatermark } from "@/components/fourQuestions/TobaileyMarkWatermark";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import {
  appFourQuestionAnswerClass,
  appFourQuestionSupportClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import { useGoalProgress } from "@/lib/client/useGoalProgress";
import { useGoalRealityCheck } from "@/lib/client/useGoalRealityCheck";
import { useInvestmentIntelligence } from "@/lib/client/useInvestmentIntelligence";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useChangeIntelligence } from "@/lib/client/useChangeIntelligence";
import { DASHBOARD_PATH } from "@/lib/navigation/appRoutes";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import {
  applyPortfolioChangeAccess,
  buildPortfolioChangeAttention,
  resolveSmartAlertsAccessMode,
} from "@/lib/services/portfolioChangeDetection";
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
 * Visual system is shared; only the question identity tokens change.
 */
export function QuestionHubPage({ questionId }: QuestionHubPageProps) {
  const definition = getFourQuestionDefinition(questionId);
  const { holdings, portfolioReady, userSub } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));
  const changeIntelligence = useChangeIntelligence({
    enabled: portfolioReady && Boolean(userSub) && holdings.length > 0,
    isDemo: productAccess.isDemo,
  });
  const smartAlertsMode = resolveSmartAlertsAccessMode(productAccess);
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
  const portfolioChangeAttention = useMemo(() => {
    if (holdings.length === 0) return null;
    return applyPortfolioChangeAccess(
      buildPortfolioChangeAttention({
        holdings,
        goal,
        hasSavedGoal,
        snapshots: changeIntelligence.snapshots,
        newsItems: [
          ...(payload.portfolioNews ?? []),
          ...(payload.macroNews ?? []),
        ],
        isDemo: productAccess.isDemo,
      }),
      smartAlertsMode,
    );
  }, [
    changeIntelligence.snapshots,
    goal,
    hasSavedGoal,
    holdings,
    payload.macroNews,
    payload.portfolioNews,
    productAccess.isDemo,
    smartAlertsMode,
  ]);
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
      intelligenceDepth: productAccess.intelligenceDepth,
      goal,
      hasSavedGoal,
      goalProgress,
      realityCheck,
      intelligence,
      newsItems: [
        ...(payload.portfolioNews ?? []),
        ...(payload.macroNews ?? []),
      ],
      pulse: portfolioPulse,
      nextEventLabel: nextEvent?.title?.trim() || null,
      nextEventHref: nextEvent?.title ? "/events" : null,
      changeIntelligence: changeIntelligence.summary,
      portfolioChangeAttention,
    });
    return bundle.questions.find((row) => row.id === questionId) ?? null;
  }, [
    changeIntelligence.summary,
    goal,
    goalProgress,
    hasSavedGoal,
    holdings,
    intelligence,
    intelligenceScope,
    payload.macroNews,
    payload.portfolioNews,
    payload.upcomingEvents,
    portfolioChangeAttention,
    portfolioPulse,
    productAccess.intelligenceDepth,
    questionId,
    realityCheck,
  ]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  const v = definition.visual;

  return (
    <>
      <PageContainer
        className={`${v.hubPageWash} !pt-4 sm:!pt-5`}
        stackClassName="gap-4 md:gap-5"
      >
        <QuestionHubBrandBar />

        <FourQuestionsCompactNav />

        <HubHero definition={definition} />

        {holdings.length === 0 ? (
          <EmptyPortfolioGuide
            title="Add holdings to answer this question"
            body="Import or add holdings so Tobailey can build this answer from your portfolio."
          />
        ) : answer ? (
          <div
            className="space-y-4 sm:space-y-5"
            data-testid={`question-hub-${questionId}`}
          >
            <section
              className={`rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${v.hubAnswer}`}
              data-testid="question-hub-conclusion"
            >
              <p className={`${appSectionLabelClass} ${v.hubAnswerEyebrow}`}>
                Answer
              </p>
              <h2 className={`${appFourQuestionAnswerClass} font-black text-slate-950`}>
                {answer.answer}
              </h2>
              {answer.support ? (
                <p className={`mt-2 ${appFourQuestionSupportClass}`}>
                  {answer.support}
                </p>
              ) : null}
            </section>

            {answer.expandItems.length > 0 ? (
              <section className={`rounded-2xl px-4 py-4 shadow-sm sm:px-5 sm:py-5 ${v.expandPanel}`}>
                <p className={`${appSectionLabelClass} ${v.expandLabel}`}>
                  Important evidence
                </p>
                <ul className="mt-3 space-y-2">
                  {answer.expandItems.map((item) => (
                    <EvidenceRow
                      key={item.id}
                      item={item}
                      visual={v}
                    />
                  ))}
                </ul>
              </section>
            ) : null}

            {answer.disclosures.map((line) => (
              <p key={line} className={appSectionMetaClass}>
                {line}
              </p>
            ))}

            <section
              className={`rounded-2xl px-4 py-4 sm:px-5 sm:py-5 ${v.hubTintSection}`}
            >
              <p
                className={`${appSectionLabelClass} ${v.hubAccentText}`}
              >
                Deep dive
              </p>
              <ul className="mt-3 space-y-1.5">
                {definition.deepDives.map((dive) => (
                  <li key={dive.href}>
                    <Link
                      href={dive.href}
                      className={`inline-flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-2 py-2 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 ${v.hubAccentText} ${v.hubRowHover} ${v.ring}`}
                    >
                      <span>{dive.label}</span>
                      <ArrowUpRight
                        className={`h-4 w-4 shrink-0 ${v.hubAccentIcon}`}
                        aria-hidden
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}

        <p className="mt-4 text-center text-[13px] text-slate-500">
          <Link
            href={DASHBOARD_PATH}
            className={`font-semibold underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 ${v.hubAccentText} ${v.ring}`}
          >
            Back to Dashboard
          </Link>
        </p>
      </PageContainer>
    </>
  );
}

function HubHero({ definition }: { definition: FourQuestionDefinition }) {
  const v = definition.visual;
  const title = definition.question.replace(/\?$/, "").toUpperCase();

  return (
    <header
      className={`relative overflow-hidden rounded-[24px] px-4 py-6 sm:px-6 sm:py-7 ${v.hubHero}`}
      data-testid="question-hub-hero"
    >
      <TobaileyMarkWatermark className="-right-8 top-1/2 -translate-y-1/2 sm:-right-6" />

      <div className="relative z-10 max-w-[min(100%,28rem)] sm:max-w-xl">
        <p className="text-[13px] font-semibold tabular-nums tracking-[0.08em] text-white/80">
          {definition.numberLabel} · {title}?
        </p>
        <h1 className="mt-2.5 text-[1.55rem] font-black leading-tight tracking-[-0.04em] text-white sm:text-[1.9rem]">
          {definition.humanQuestion}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-white/80 sm:text-[16px]">
          {definition.meaning}
        </p>
      </div>
    </header>
  );
}

function EvidenceRow({
  item,
  visual,
}: {
  item: {
    id: string;
    label: string;
    detail?: string | null;
    bullets?: string[];
    href?: string | null;
    hrefExternal?: boolean;
    emphasis?: "high" | "supporting" | "low";
  };
  visual: FourQuestionDefinition["visual"];
}) {
  const emphasis =
    item.emphasis ?? (item.id === "complete-preview" ? "high" : "supporting");
  const isComplete = item.id === "complete-preview";
  const surface = isComplete
    ? visual.completeTease
    : emphasis === "high"
      ? visual.expandHigh
      : emphasis === "low"
        ? visual.expandLow
        : visual.expandSupporting;
  const labelClass = isComplete
    ? "text-white/80"
    : emphasis === "high"
      ? visual.expandLabel
      : "text-slate-500";
  const detailClass = isComplete
    ? "text-white"
    : emphasis === "low"
      ? "text-slate-600"
      : "text-slate-800";
  const bulletClass = isComplete ? "text-white/90" : "text-slate-600";
  const iconClass = isComplete ? "text-white/90" : visual.hubAccentIcon;

  const body = (
    <>
      <span
        className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${isComplete ? "bg-white/80" : visual.hubDot}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className={`block ${appSectionLabelClass} ${labelClass}`}>
          {item.label}
        </span>
        {item.detail ? (
          <span className={`mt-0.5 block text-[16px] leading-relaxed ${detailClass}`}>
            {item.detail}
          </span>
        ) : null}
        {item.bullets && item.bullets.length > 0 ? (
          <ul className={`mt-2 space-y-1 pl-4 text-[15px] leading-relaxed ${bulletClass}`}>
            {item.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </span>
      {item.href ? (
        <ArrowUpRight
          className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
          aria-hidden
        />
      ) : null}
    </>
  );

  const className = `flex min-h-11 w-full items-start gap-2.5 rounded-xl px-2.5 py-3 text-left ${surface}`;

  if (!item.href) {
    return (
      <div className={className} data-clickable="false">
        {body}
      </div>
    );
  }

  const clickable = `${className} cursor-pointer transition ${
    isComplete ? "hover:brightness-110" : visual.expandClickable
  } focus-visible:outline-none focus-visible:ring-2 ${visual.ring}`;

  if (item.hrefExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={clickable}
        aria-label={`${item.label}. Opens in a new tab.`}
        data-clickable="true"
      >
        {body}
      </a>
    );
  }

  return (
    <Link href={item.href} className={clickable} data-clickable="true">
      {body}
    </Link>
  );
}
