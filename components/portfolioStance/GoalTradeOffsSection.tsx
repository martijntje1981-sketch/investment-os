"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import {
  appCardClass,
  appCardPaddingClass,
  appIntelligenceAccentMetricClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { GoalTradeOffs } from "@/lib/services/portfolioStance";
import {
  STANCE_ILLUSTRATIVE_DISCLAIMER,
  STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON,
} from "@/lib/services/portfolioStance";
import type { ProductAccess } from "@/lib/services/productAccess";

function formatEur(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatImpact(value: number | null): string {
  if (value == null) return "Unavailable";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export function GoalTradeOffsSection({
  model,
  productAccess,
}: {
  model: GoalTradeOffs;
  productAccess: ProductAccess;
}) {
  const complete = productAccess.intelligenceDepth === "complete";
  const currentMonthly = model.contribution.currentMonthly;
  const exploreOptions = model.contribution.options.filter((row) => !row.isCurrent);
  const defaultExplore = exploreOptions[exploreOptions.length - 1]?.monthly ?? currentMonthly ?? 0;
  const [exploreMonthly, setExploreMonthly] = useState(defaultExplore);

  const selected = useMemo(
    () =>
      model.contribution.options.find((row) => row.monthly === exploreMonthly) ??
      model.contribution.options.find((row) => row.isCurrent) ??
      null,
    [exploreMonthly, model.contribution.options],
  );
  const currentOption = model.contribution.options.find((row) => row.isCurrent) ?? null;

  if (!complete) return null;
  if (!model.available && model.contribution.currentMonthly == null) return null;

  return (
    <section
      id="goal-trade-offs"
      aria-labelledby="goal-trade-offs-heading"
      className={`${appCardClass} ${appCardPaddingClass} min-w-0 scroll-mt-24 overflow-x-clip`}
      data-testid="goal-trade-offs"
    >
      <p className={appSectionLabelClass}>Goal trade-offs</p>
      <h2 id="goal-trade-offs-heading" className={appSectionTitleClass}>
        What could change the path?
      </h2>
      <p className={`mt-2 ${appSectionBodyClass}`}>{model.pathCopy}</p>
      <p className={`mt-2 ${appSectionMetaClass}`}>{STANCE_ILLUSTRATIVE_DISCLAIMER}</p>

      {!model.available ? (
        <p className={`mt-5 ${appSectionMetaClass}`}>{model.reason}</p>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border border-slate-200/80 px-4 py-4">
            <p className={appSectionLabelClass}>Current path</p>
            <p className="mt-1 text-[1.25rem] font-bold text-slate-950">
              {currentOption?.projectedCompletionLabel ?? "Projected completion unavailable"}
            </p>
            {currentMonthly != null ? (
              <p className={`mt-1 ${appSectionMetaClass}`}>
                {formatEur(currentMonthly)} / month
              </p>
            ) : null}
            {model.stance.currentLabel ? (
              <p className={`mt-1 ${appSectionMetaClass}`}>
                Current stance: {model.stance.currentLabel}
              </p>
            ) : null}
          </div>

          {currentMonthly != null && model.contribution.options.length > 1 ? (
            <div className="mt-5">
              <p className={appSectionTitleClass}>Explore monthly contribution</p>
              <label className="mt-3 block">
                <span className={appSectionMetaClass}>
                  {formatEur(currentMonthly)} → {formatEur(exploreMonthly)}
                </span>
                <input
                  type="range"
                  min={currentMonthly}
                  max={Math.max(...model.contribution.options.map((row) => row.monthly))}
                  step={50}
                  value={exploreMonthly}
                  onChange={(event) => setExploreMonthly(Number(event.target.value))}
                  className="mt-2 h-11 w-full accent-cyan-800"
                />
              </label>
              {selected && !selected.isCurrent ? (
                <p className={`mt-2 ${appSectionBodyClass}`}>
                  Projected completion {currentOption?.projectedCompletionLabel ?? "—"} →{" "}
                  {selected.projectedCompletionLabel ?? "unavailable"}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6">
            <p className={appSectionTitleClass}>Modeled trade-off</p>
            <p className={`mt-2 ${appSectionMetaClass}`}>
              {STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON}
            </p>
            <div className="mt-3 grid min-w-0 gap-3">
              {model.stance.paths.map((path) => (
                <div key={path.id} className={appIntelligenceAccentMetricClass}>
                  <p className={appSectionLabelClass}>{path.label}</p>
                  <p className="mt-1 font-semibold text-slate-950">{path.stanceLabel}</p>
                  <p className={`mt-1 ${appSectionMetaClass}`}>
                    Modeled downside {formatImpact(path.modeledDownsidePercent)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={DASHBOARD_DEEP_LINKS.whatIf}
            className={`${appTextLinkClass} mt-4 inline-flex min-h-11 items-center`}
          >
            Explore contribution scenarios →
          </Link>
        </>
      )}
    </section>
  );
}
