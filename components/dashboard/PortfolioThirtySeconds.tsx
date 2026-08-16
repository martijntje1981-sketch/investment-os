"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  Crosshair,
  Eye,
  Lightbulb,
  Search,
  Target,
} from "lucide-react";

import {
  appSectionMetaClass,
  appTintedPanelClass,
  appCardPaddingCompactClass,
} from "@/components/layout/appSurface";
import { REVIEW_PATH } from "@/lib/navigation/appRoutes";
import {
  buildPersonalActionPlan,
  type ActionPlanCategory,
  type PersonalActionPlanItem,
} from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import {
  buildThirtySecondsBriefingView,
  type ThirtySecondsBriefingView,
} from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";

type PortfolioThirtySecondsProps = {
  intelligence: PersonalIntelligenceToday;
};

type DriverRow = ThirtySecondsBriefingView["drivers"][number];

function driverToneClass(tone: DriverRow["tone"]) {
  if (tone === "positive") return "text-emerald-800";
  if (tone === "negative") return "text-slate-800";
  return "text-slate-700";
}

function SymbolBadge({ name, symbol }: { name: string; symbol: string }) {
  const initials = (symbol || name).trim().slice(0, 2).toUpperCase() || "·";
  return (
    <span
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-navy/8 text-[12px] font-bold tracking-[-0.02em] text-brand-navy"
      aria-hidden
    >
      {initials}
    </span>
  );
}

function ActionCategoryIcon({ category }: { category: ActionPlanCategory }) {
  const className = "h-4 w-4 shrink-0 text-brand-navy";
  switch (category) {
    case "watch":
      return <Eye className={className} aria-hidden />;
    case "understand":
      return <Lightbulb className={className} aria-hidden />;
    case "review":
      return <Search className={className} aria-hidden />;
    case "goal":
      return <Target className={className} aria-hidden />;
    case "look_ahead":
      return <Crosshair className={className} aria-hidden />;
    case "no_action_required":
      return <CheckCircle2 className={className} aria-hidden />;
    default:
      return <Eye className={className} aria-hidden />;
  }
}

function ActionPlanRow({ item }: { item: PersonalActionPlanItem }) {
  const body = (
    <>
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-navy/[0.06]">
        <ActionCategoryIcon category={item.category} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-brand-navy">
          {item.categoryLabel}
        </span>
        <span className="mt-0.5 block text-[14px] font-semibold leading-snug tracking-[-0.02em] text-slate-950">
          {item.headline}
        </span>
        <span className={`mt-0.5 block ${appSectionMetaClass} line-clamp-2`}>
          {item.detail}
        </span>
      </span>
      {item.href ? (
        <ArrowUpRight
          className="mt-1 h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        className="flex min-h-[56px] items-start gap-3 rounded-2xl px-1 py-2.5 transition hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="flex min-h-[56px] items-start gap-3 rounded-2xl px-1 py-2.5">
      {body}
    </div>
  );
}

/**
 * Compact Personal Intelligence surface — briefing + Action Plan as one product.
 */
export function PortfolioThirtySeconds({
  intelligence,
}: PortfolioThirtySecondsProps) {
  const view = buildThirtySecondsBriefingView(intelligence);
  const actionPlan = buildPersonalActionPlan(intelligence);
  const [mainDriver, ...otherDrivers] = view.drivers;

  return (
    <section
      aria-labelledby="portfolio-thirty-seconds-heading"
      className={`${appTintedPanelClass} ${appCardPaddingCompactClass}`}
      data-testid="portfolio-thirty-seconds"
    >
      <header className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy">
            Personal intelligence
          </p>
          <span className="rounded-full border border-slate-200/90 bg-white/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            Personalized for you
          </span>
        </div>
        <h2
          id="portfolio-thirty-seconds-heading"
          className="mt-1.5 text-[1.2rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.3rem]"
        >
          {view.title}
        </h2>
        <p className={`mt-1 ${appSectionMetaClass}`}>
          The key moves and what matters most.
        </p>
      </header>

      <p className="mt-3 text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] text-slate-950 sm:text-[1.1rem]">
        {view.headline}
      </p>

      {view.isQuiet && view.supportingQuietLine ? (
        <div
          className="mt-3 rounded-2xl border border-emerald-200/50 bg-emerald-50/40 px-3.5 py-3"
          data-testid="portfolio-thirty-seconds-quiet"
        >
          <div className="flex items-start gap-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
              aria-hidden
            />
            <p className="text-[14px] font-medium leading-relaxed text-slate-700">
              {view.supportingQuietLine}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-6">
        <div className="min-w-0">
          {mainDriver ? (
            <div data-testid="pi-main-driver">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                Today’s main driver
              </p>
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-white/85 px-3.5 py-3.5 ring-1 ring-slate-200/70">
                <SymbolBadge name={mainDriver.name} symbol={mainDriver.symbol} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                    {mainDriver.name}
                  </p>
                  <p className={`mt-0.5 ${appSectionMetaClass}`}>
                    {mainDriver.tone === "negative"
                      ? "Largest drag on today’s move"
                      : "Main contributor to today’s move"}
                    {mainDriver.periodLabel
                      ? ` · ${mainDriver.periodLabel}`
                      : ""}
                  </p>
                </div>
                <p
                  className={`shrink-0 text-[1.15rem] font-bold tabular-nums tracking-[-0.03em] ${driverToneClass(mainDriver.tone)}`}
                >
                  {mainDriver.contributionLabel}
                </p>
              </div>
            </div>
          ) : !view.isQuiet ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>
              No single material driver stands out today.
            </p>
          ) : null}

          {otherDrivers.length > 0 ? (
            <div className="mt-3 min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                Also moved the portfolio
              </p>
              <ul className="mt-2 space-y-1.5">
                {otherDrivers.map((driver) => (
                  <li
                    key={`${driver.symbol}-${driver.contributionLabel}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl px-1 py-1.5"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <SymbolBadge name={driver.name} symbol={driver.symbol} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] font-semibold text-slate-900">
                          {driver.name}
                        </span>
                        {driver.periodLabel ? (
                          <span className="block text-[11px] font-medium text-slate-500">
                            {driver.periodLabel}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 text-[13px] font-bold tabular-nums ${driverToneClass(driver.tone)}`}
                    >
                      {driver.contributionLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {view.periodNote ? (
            <p className={`mt-2 ${appSectionMetaClass}`}>{view.periodNote}</p>
          ) : null}
          {view.coverageNote ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>{view.coverageNote}</p>
          ) : null}
        </div>

        <div className="min-w-0" data-testid="personal-action-plan">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
            Action plan
          </p>

          {actionPlan.isNoAction ? (
            <div
              className="mt-2 rounded-2xl bg-white/80 px-3 py-3 ring-1 ring-slate-200/70"
              data-testid="personal-action-plan-quiet"
            >
              <ActionPlanRow item={actionPlan.items[0]!} />
            </div>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100/90">
              {actionPlan.items.map((entry) => (
                <li key={entry.id}>
                  <ActionPlanRow item={entry} />
                </li>
              ))}
            </ul>
          )}

          <Link
            href={REVIEW_PATH}
            className="mt-3 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            View full review
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
