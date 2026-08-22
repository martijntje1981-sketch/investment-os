"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Target } from "lucide-react";

import {
  appHeroShellClass,
  appPageHeroSubtitleClass,
  appPageHeroTitleClass,
  appPrimaryButtonClass,
  appHeroGhostButtonClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import { GOALS_PATH } from "@/lib/navigation/appRoutes";
import {
  dismissFirstIntelligence,
  shouldShowFirstIntelligence,
} from "@/lib/client/firstIntelligence";

type FirstIntelligenceMomentProps = {
  userSub: string | null;
  hasHoldings: boolean;
  exampleActive: boolean;
  hasSavedGoal: boolean;
};

/**
 * Post-setup aha moment: portfolio is ready, Four Questions are next.
 * Goal invite is optional and skippable. Never shown for Demo books.
 */
export function FirstIntelligenceMoment({
  userSub,
  hasHoldings,
  exampleActive,
  hasSavedGoal,
}: FirstIntelligenceMomentProps) {
  const [visible, setVisible] = useState(false);
  const [showGoalInvite, setShowGoalInvite] = useState(false);

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
    setShowGoalInvite(show && !hasSavedGoal);
  }, [userSub, hasHoldings, exampleActive, hasSavedGoal]);

  if (!visible || !userSub) return null;

  function close() {
    dismissFirstIntelligence(userSub);
    setVisible(false);
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
        <p
          className={`inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 ${appSectionLabelClass} text-emerald-800`}
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          Your portfolio is ready
        </p>
        <h2
          id="first-intelligence-heading"
          className={`mt-4 ${appPageHeroTitleClass}`}
        >
          Here’s what Tobailey sees
        </h2>
        <p className={appPageHeroSubtitleClass}>
          Your Four Questions are below. If history is still thin, Tobailey
          stays honest instead of inventing a story.
        </p>

        {showGoalInvite ? (
          <div className="mt-6 rounded-2xl border border-brand/25 bg-white/80 px-4 py-4">
            <p className="text-[16px] font-semibold leading-relaxed text-slate-950">
              Want Tobailey to track what you’re investing toward?
            </p>
            <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-slate-700">
              Optional. Skip this and keep using Dashboard and Four Questions.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href={GOALS_PATH}
                className={appPrimaryButtonClass}
                onClick={close}
              >
                <Target className="h-4 w-4" aria-hidden />
                Set a goal
              </Link>
              <button
                type="button"
                className={appHeroGhostButtonClass}
                onClick={() => setShowGoalInvite(false)}
              >
                Skip
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <button type="button" className={appHeroGhostButtonClass} onClick={close}>
            Continue
          </button>
        </div>
      </div>
    </section>
  );
}
