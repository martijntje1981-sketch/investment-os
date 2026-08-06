"use client";

import Link from "next/link";
import { ArrowRight, FileUp, Sparkles } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appHeroMetricLabelClass,
  appHeroShellClass,
  appPrimaryButtonClass,
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
      <p className={appHeroMetricLabelClass}>Your command centre</p>
      <h1
        id="zero-holdings-hero-heading"
        className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white sm:text-4xl"
      >
        {CONVERSION_COPY.zeroHoldingsHeroTitle}
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] font-medium leading-relaxed text-white/75 sm:text-base">
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
          className={`${appBrandSoftButtonClass} border-white/20 bg-white/10 text-white hover:bg-white/15`}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          {CONVERSION_COPY.zeroHoldingsSecondaryCta}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <p className="mt-5 text-[13px] font-medium text-white/55">
        {CONVERSION_COPY.softLine}
      </p>
    </section>
  );
}
