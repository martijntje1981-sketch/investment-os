import Link from "next/link";

import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";
import { TRIAL_UPGRADE_HREF } from "@/lib/client/trialExperience";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";

const STEPS = [
  {
    title: "Create your account",
    body: "Start your 7-day Personal Trial with an empty portfolio.",
  },
  {
    title: "Import or build your portfolio",
    body: "Upload a supported file or add holdings manually. You can edit everything.",
  },
  {
    title: "Explore Premium features",
    body: "Use Tobailey with your own investments before deciding.",
  },
] as const;

export function TrialStepsCard({
  showCreateCta = false,
}: {
  showCreateCta?: boolean;
}) {
  return (
    <section
      className={`${appCardClass} ${appCardPaddingClass}`}
      aria-labelledby="trial-steps-heading"
      data-testid="trial-steps-card"
    >
      <h2 id="trial-steps-heading" className={appSectionTitleClass}>
        Start with your own portfolio
      </h2>
      <ol className="mt-4 space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-bold text-brand-navy"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold text-slate-950">
                {step.title}
              </span>
              <span className={`mt-0.5 block ${appSectionBodyClass}`}>
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <p className={`mt-4 ${appSectionMetaClass}`}>
        Your Portfolio History remains exportable to Excel.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {showCreateCta ? (
          <Link href="/signup?intent=trial" className={appSolidButtonClass}>
            Start your 7-day trial
          </Link>
        ) : (
          <Link href={PORTFOLIO_SETUP_ROUTES.import} className={appSolidButtonClass}>
            Import my portfolio
          </Link>
        )}
        <Link
          href={PORTFOLIO_HISTORY_PATH}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
        >
          Open Portfolio History
        </Link>
        <Link
          href={TRIAL_UPGRADE_HREF}
          className="inline-flex min-h-[44px] items-center text-sm font-semibold text-slate-600 underline-offset-2 hover:underline"
        >
          Upgrade
        </Link>
      </div>
    </section>
  );
}
