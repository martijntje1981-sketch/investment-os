"use client";

import Link from "next/link";

import {
  appSectionMetaClass,
  appTintedPanelClass,
  appCardPaddingCompactClass,
} from "@/components/layout/appSurface";
import { buildPersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import {
  buildThirtySecondsBriefingView,
  type ThirtySecondsBriefingView,
} from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";

type PortfolioThirtySecondsProps = {
  intelligence: PersonalIntelligenceToday;
};

function driverToneClass(
  tone: ThirtySecondsBriefingView["drivers"][number]["tone"],
) {
  if (tone === "positive") return "text-emerald-800";
  if (tone === "negative") return "text-slate-800";
  return "text-slate-700";
}

/**
 * Compact Personal Intelligence surface for the Dashboard.
 * Phase 1B briefing + Phase 1C Action Plan in one calm section.
 * Deep links live on Action Plan items; Dashboard PageRelatedLinks cover continue destinations.
 */
export function PortfolioThirtySeconds({
  intelligence,
}: PortfolioThirtySecondsProps) {
  const view = buildThirtySecondsBriefingView(intelligence);
  const actionPlan = buildPersonalActionPlan(intelligence);

  return (
    <section
      aria-labelledby="portfolio-thirty-seconds-heading"
      className={`${appTintedPanelClass} ${appCardPaddingCompactClass}`}
      data-testid="portfolio-thirty-seconds"
    >
      <header className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy">
          Personal intelligence
        </p>
        <h2
          id="portfolio-thirty-seconds-heading"
          className="mt-1 text-[1.15rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]"
        >
          {view.title}
        </h2>
      </header>

      <p className="mt-3 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-[1.125rem]">
        {view.headline}
      </p>

      {view.isQuiet && view.supportingQuietLine ? (
        <div
          className="mt-4 rounded-2xl border border-slate-200/80 bg-white/80 px-3.5 py-3"
          data-testid="portfolio-thirty-seconds-quiet"
        >
          <p className="text-[14px] font-medium leading-relaxed text-slate-700">
            {view.supportingQuietLine}
          </p>
        </div>
      ) : null}

      {view.drivers.length > 0 ? (
        <div className="mt-4 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
            What drove it
          </p>
          <ul className="mt-2 divide-y divide-slate-100/90 rounded-2xl border border-slate-200/80 bg-white/85">
            {view.drivers.map((driver) => (
              <li
                key={`${driver.symbol}-${driver.contributionLabel}`}
                className="flex min-h-[44px] items-center justify-between gap-3 px-3.5 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-slate-950">
                    {driver.name}
                  </span>
                  {driver.periodLabel ? (
                    <span className="mt-0.5 block text-[11px] font-medium text-slate-500">
                      {driver.periodLabel}
                    </span>
                  ) : null}
                </span>
                <span
                  className={`shrink-0 text-[14px] font-bold tabular-nums tracking-[-0.02em] ${driverToneClass(driver.tone)}`}
                >
                  {driver.contributionLabel}
                </span>
              </li>
            ))}
          </ul>
          {view.periodNote ? (
            <p className={`mt-2 ${appSectionMetaClass}`}>{view.periodNote}</p>
          ) : null}
          {view.coverageNote ? (
            <p className={`mt-1.5 ${appSectionMetaClass}`}>{view.coverageNote}</p>
          ) : null}
        </div>
      ) : view.coverageNote ? (
        <p
          className={`mt-3 ${appSectionMetaClass}`}
          data-testid="attribution-coverage-note"
        >
          {view.coverageNote}
        </p>
      ) : null}

      {/* Phase 1C Action Plan — owns “what deserves attention”. */}
      <div className="mt-5 min-w-0" data-testid="personal-action-plan">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
          Action plan
        </p>

        {actionPlan.isNoAction ? (
          <div
            className="mt-2 rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-3"
            data-testid="personal-action-plan-quiet"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-navy">
              {actionPlan.items[0]?.categoryLabel}
            </p>
            <p className="mt-1 text-[14px] font-semibold leading-snug text-slate-950">
              {actionPlan.items[0]?.headline}
            </p>
            {actionPlan.items[0]?.detail ? (
              <p className={`mt-1 ${appSectionMetaClass}`}>
                {actionPlan.items[0].detail}
              </p>
            ) : null}
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {actionPlan.items.map((entry) => (
              <li
                key={entry.id}
                className="rounded-2xl border border-slate-200/80 bg-white/85 px-3.5 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-navy">
                  {entry.categoryLabel}
                </p>
                <p className="mt-1 text-[14px] font-semibold leading-snug text-slate-950">
                  {entry.headline}
                </p>
                <p className={`mt-1 ${appSectionMetaClass}`}>{entry.detail}</p>
                {entry.href && entry.hrefLabel ? (
                  <Link
                    href={entry.href}
                    className="mt-2 inline-flex min-h-[44px] items-center text-[13px] font-semibold text-brand-navy underline-offset-2 hover:underline"
                  >
                    {entry.hrefLabel}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
