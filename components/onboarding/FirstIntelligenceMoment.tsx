"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import {
  appHeroGhostButtonClass,
  appHeroShellClass,
  appPageHeroSubtitleClass,
  appPageHeroTitleClass,
  appPrimaryButtonClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import { COMPLETE_PERIOD_COPY } from "@/lib/content/completePeriodCopy";
import {
  dismissFirstIntelligence,
  shouldShowFirstIntelligence,
} from "@/lib/client/firstIntelligence";
import { GOAL_FORM_DEFAULT, useUserGoal } from "@/lib/client/useUserGoal";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

type FirstIntelligenceMomentProps = {
  userSub: string | null;
  hasHoldings: boolean;
  exampleActive: boolean;
  hasSavedGoal: boolean;
};

/**
 * First real product moment after holdings exist.
 * Optional goal uses the canonical Goals model. Skip is always available.
 */
export function FirstIntelligenceMoment({
  userSub,
  hasHoldings,
  exampleActive,
  hasSavedGoal,
}: FirstIntelligenceMomentProps) {
  const { persistGoal } = useUserGoal();
  const [visible, setVisible] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalSettings>(GOAL_FORM_DEFAULT);
  const [showGoal, setShowGoal] = useState(false);

  useEffect(() => {
    const search =
      typeof window === "undefined" ? "" : window.location.search;
    const show = shouldShowFirstIntelligence({
      userSub,
      hasHoldings,
      exampleActive,
      search,
    });
    setVisible(show);
    setShowGoal(show && !hasSavedGoal);
  }, [userSub, hasHoldings, exampleActive, hasSavedGoal]);

  if (!visible || !userSub) return null;

  function close() {
    dismissFirstIntelligence(userSub);
    setVisible(false);
  }

  function skipGoal() {
    setShowGoal(false);
  }

  function saveGoal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    persistGoal(goalDraft);
    setShowGoal(false);
  }

  return (
    <section
      className={`${appHeroShellClass} relative overflow-hidden px-5 py-7 sm:px-8 sm:py-8`}
      aria-labelledby="first-intelligence-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse at 14% 0%, rgba(56,189,248,0.18), transparent 46%), radial-gradient(ellipse at 90% 100%, rgba(52,211,153,0.12), transparent 40%)",
        }}
      />
      <div className="relative">
        <OnboardingProgress currentStep={showGoal ? 3 : 4} />

        <p
          className={`mt-5 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 ${appSectionLabelClass} text-q1-strong`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {showGoal ? "Almost there" : "Tobailey Complete"}
        </p>
        <h2
          id="first-intelligence-heading"
          className={`mt-4 ${appPageHeroTitleClass}`}
        >
          {showGoal ? "Make Am I on track? meaningful" : COMPLETE_PERIOD_COPY.firstValueTitle}
        </h2>
        <p className={appPageHeroSubtitleClass}>
          {showGoal
            ? "A target value, year and monthly contribution are enough. You can refine this later."
            : COMPLETE_PERIOD_COPY.firstValueBody}
        </p>

        {showGoal ? (
          <form className="mt-6 space-y-4" onSubmit={saveGoal}>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="text-[13px] font-bold text-brand-navy">
                  Target value
                </span>
                <input
                  type="number"
                  min={1}
                  inputMode="decimal"
                  value={goalDraft.targetValue}
                  onChange={(event) =>
                    setGoalDraft((current) => ({
                      ...current,
                      targetValue: Number(event.target.value),
                    }))
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] font-semibold text-brand-navy outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold text-brand-navy">
                  Target year
                </span>
                <input
                  type="number"
                  min={new Date().getFullYear()}
                  inputMode="numeric"
                  value={goalDraft.targetYear}
                  onChange={(event) =>
                    setGoalDraft((current) => ({
                      ...current,
                      targetYear: Number(event.target.value),
                    }))
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] font-semibold text-brand-navy outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold text-brand-navy">
                  Monthly contribution
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={goalDraft.monthlyContribution}
                  onChange={(event) =>
                    setGoalDraft((current) => ({
                      ...current,
                      monthlyContribution: Number(event.target.value),
                    }))
                  }
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-[16px] font-semibold text-brand-navy outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button type="submit" className={appPrimaryButtonClass}>
                Save goal
              </button>
              <button
                type="button"
                className={appHeroGhostButtonClass}
                onClick={skipGoal}
              >
                Skip for now
              </button>
            </div>
          </form>
        ) : (
          <>
            <ol className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {FOUR_QUESTIONS.map((question) => (
                <li
                  key={question.id}
                  className={`rounded-2xl border px-3 py-2.5 ${question.visual.panel}`}
                >
                  <p
                    className={`text-[10px] font-black uppercase tracking-[0.14em] ${question.visual.eyebrow}`}
                  >
                    {question.numberLabel}
                  </p>
                  <p className="mt-1 text-sm font-bold text-brand-navy">
                    {question.question}
                  </p>
                </li>
              ))}
            </ol>
            <div className="mt-5">
              <button
                type="button"
                className={appHeroGhostButtonClass}
                onClick={close}
              >
                Continue
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
