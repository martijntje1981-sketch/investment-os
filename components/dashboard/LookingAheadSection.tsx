"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appIntelligenceAccentCardClass,
  appIntelligenceAccentEyebrowClass,
  appIntelligenceAccentMetricClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { LookingAheadModel } from "@/lib/services/lookingAhead";

export function LookingAheadSection({
  model,
}: {
  model: LookingAheadModel;
}) {
  const quiet = model.status !== "ready";

  return (
    <section
      id="looking-ahead"
      className={`${appIntelligenceAccentCardClass} min-w-0 overflow-x-clip`}
      data-testid="looking-ahead"
      data-status={model.status}
      aria-labelledby="looking-ahead-heading"
    >
      <div className="px-4 py-4 sm:px-5">
        <p className={appSectionLabelClass} id="looking-ahead-heading">
          Looking Ahead
        </p>
        {model.modeledDisclaimer ? (
          <p className={`mt-1 ${appIntelligenceAccentEyebrowClass}`}>
            {model.modeledDisclaimer}
          </p>
        ) : (
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            What the evidence suggests to watch next
          </p>
        )}

        <p className="mt-3 text-[1.05rem] font-semibold leading-snug text-slate-950 sm:text-[1.2rem]">
          {model.headline}
        </p>
        {model.support ? (
          <p className={`mt-1.5 ${appSectionMetaClass}`}>{model.support}</p>
        ) : null}

        {!quiet && model.facts.length > 0 ? (
          <div
            className={`mt-4 grid min-w-0 gap-2 ${
              model.facts.length > 1 ? "sm:grid-cols-2" : ""
            }`}
          >
            {model.facts.map((fact) => (
              <div key={fact.id} className={appIntelligenceAccentMetricClass}>
                <p className={appSectionLabelClass}>{fact.label}</p>
                <p className="mt-1 text-[1.15rem] font-bold tabular-nums text-slate-950">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {model.event ? (
          <p className={`mt-3 ${appSectionMetaClass}`}>
            Next relevant event · {model.event.title} · {model.event.whenLabel}
          </p>
        ) : null}

        <Link
          href={model.explore.href}
          className={`${appTextLinkClass} mt-3 inline-flex min-h-11 items-center gap-1`}
        >
          {model.explore.label}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
