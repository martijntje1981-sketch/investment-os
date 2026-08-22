"use client";

import Link from "next/link";
import { ArrowRight, FileUp, Sparkles } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appDashboardHeroMetricLabelClass,
  appHeroShellClass,
  appPrimaryButtonClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { CONVERSION_COPY } from "@/lib/client/conversionCopy";

/**
 * Premium zero-holdings dashboard hero — not a full-app onboarding block.
 */
export function DashboardZeroHoldingsHero() {
  return (
    <section
      className={`${appHeroShellClass} px-5 py-7 sm:px-8 sm:py-8`}
      aria-labelledby="zero-holdings-hero-heading"
    >
      <p className={appDashboardHeroMetricLabelClass}>Your command centre</p>
      <h1
        id="zero-holdings-hero-heading"
        className="mt-2 text-3xl font-bold tracking-[-0.03em] text-slate-950 sm:text-4xl"
      >
        {CONVERSION_COPY.zeroHoldingsHeroTitle}
      </h1>
      <p className={`mt-3 max-w-2xl ${appSectionMetaClass} sm:text-base`}>
        {CONVERSION_COPY.zeroHoldingsHeroCopy}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href={CONVERSION_COPY.primaryHref}
          className={`${appPrimaryButtonClass} bg-brand text-brand-navy`}
        >
          <FileUp className="h-4 w-4" aria-hidden />
          {CONVERSION_COPY.zeroHoldingsPrimaryCta}
        </Link>
        <Link
          href={CONVERSION_COPY.manualAddHref}
          className={appBrandSoftButtonClass}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {CONVERSION_COPY.zeroHoldingsSecondaryCta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <p className={`mt-5 ${appSectionMetaClass}`}>
        {CONVERSION_COPY.softLine}
      </p>
    </section>
  );
}
