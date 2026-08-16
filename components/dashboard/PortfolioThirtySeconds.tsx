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

/**
 * Category visuals inspired by Markets Today region cards:
 * soft tinted icon surfaces + accent border — not saturated blocks.
 */
const ACTION_CATEGORY_VISUAL: Record<
  ActionPlanCategory,
  {
    labelClass: string;
    iconSurfaceClass: string;
    iconClass: string;
    accentBorderClass: string;
    rowTintClass: string;
  }
> = {
  watch: {
    labelClass: "text-blue-700",
    iconSurfaceClass: "bg-blue-50",
    iconClass: "text-blue-700",
    accentBorderClass: "border-l-blue-500",
    rowTintClass: "bg-blue-50/40",
  },
  understand: {
    labelClass: "text-violet-700",
    iconSurfaceClass: "bg-violet-50",
    iconClass: "text-violet-700",
    accentBorderClass: "border-l-violet-500",
    rowTintClass: "bg-violet-50/35",
  },
  review: {
    labelClass: "text-amber-800",
    iconSurfaceClass: "bg-amber-50",
    iconClass: "text-amber-700",
    accentBorderClass: "border-l-amber-500",
    rowTintClass: "bg-amber-50/40",
  },
  goal: {
    labelClass: "text-teal-800",
    iconSurfaceClass: "bg-teal-50",
    iconClass: "text-teal-700",
    accentBorderClass: "border-l-teal-500",
    rowTintClass: "bg-teal-50/40",
  },
  look_ahead: {
    labelClass: "text-slate-700",
    iconSurfaceClass: "bg-slate-100",
    iconClass: "text-slate-700",
    accentBorderClass: "border-l-slate-400",
    rowTintClass: "bg-slate-50/60",
  },
  no_action_required: {
    labelClass: "text-emerald-800",
    iconSurfaceClass: "bg-emerald-50",
    iconClass: "text-emerald-700",
    accentBorderClass: "border-l-emerald-500",
    rowTintClass: "bg-emerald-50/45",
  },
};

function driverToneClass(tone: DriverRow["tone"]) {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-rose-700";
  return "text-slate-700";
}

function SymbolBadge({
  name,
  symbol,
  emphasized = false,
  tone = "neutral",
}: {
  name: string;
  symbol: string;
  emphasized?: boolean;
  tone?: DriverRow["tone"];
}) {
  const initials = (symbol || name).trim().slice(0, 2).toUpperCase() || "·";
  const surface =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-200/80"
      : tone === "negative"
        ? "bg-rose-50 text-rose-800 ring-rose-200/80"
        : emphasized
          ? "bg-blue-50 text-blue-800 ring-blue-200/80"
          : "bg-slate-100 text-slate-700 ring-slate-200/80";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl font-bold tracking-[-0.02em] ring-1 ring-inset ${surface} ${
        emphasized ? "h-12 w-12 text-[13px]" : "h-9 w-9 text-[11px]"
      }`}
      aria-hidden
    >
      {initials}
    </span>
  );
}

function ActionCategoryIcon({
  category,
  className,
}: {
  category: ActionPlanCategory;
  className: string;
}) {
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
  const visual = ACTION_CATEGORY_VISUAL[item.category];
  const body = (
    <>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${visual.iconSurfaceClass}`}
      >
        <ActionCategoryIcon
          category={item.category}
          className={`h-4 w-4 shrink-0 ${visual.iconClass}`}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[10px] font-bold uppercase tracking-[0.12em] ${visual.labelClass}`}
        >
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

  const rowClass = `flex min-h-[52px] items-start gap-3 rounded-xl border-l-[3px] ${visual.accentBorderClass} ${visual.rowTintClass} px-2.5 py-2.5`;

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
          <span className="rounded-full border border-blue-200/80 bg-blue-50/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-blue-800">
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
          className="mt-3 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-white px-3.5 py-3"
          data-testid="portfolio-thirty-seconds-quiet"
        >
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2
                className="h-4 w-4 text-emerald-700"
                aria-hidden
              />
            </span>
            <p className="text-[14px] font-medium leading-relaxed text-slate-700">
              {view.supportingQuietLine}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start lg:gap-6">
        <div className="min-w-0">
          {mainDriver ? (
            <div data-testid="pi-main-driver">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                Today’s main driver
              </p>
              <div
                className={`mt-2 flex items-center gap-3 rounded-2xl border-t-[3px] px-3.5 py-3 shadow-sm ${
                  mainDriver.tone === "positive"
                    ? "border-t-emerald-500 bg-gradient-to-br from-emerald-50/80 to-white"
                    : mainDriver.tone === "negative"
                      ? "border-t-rose-400 bg-gradient-to-br from-rose-50/70 to-white"
                      : "border-t-blue-500 bg-gradient-to-br from-blue-50/80 to-white"
                }`}
              >
                <SymbolBadge
                  name={mainDriver.name}
                  symbol={mainDriver.symbol}
                  emphasized
                  tone={mainDriver.tone}
                />
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
              <ul className="mt-1.5 space-y-1">
                {otherDrivers.map((driver) => (
                  <li
                    key={`${driver.symbol}-${driver.contributionLabel}`}
                    className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl px-1 py-1"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <SymbolBadge
                        name={driver.name}
                        symbol={driver.symbol}
                        tone={driver.tone}
                      />
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
            <div className="mt-2" data-testid="personal-action-plan-quiet">
              <ActionPlanRow item={actionPlan.items[0]!} />
            </div>
          ) : (
            <ul className="mt-2 space-y-1.5">
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
