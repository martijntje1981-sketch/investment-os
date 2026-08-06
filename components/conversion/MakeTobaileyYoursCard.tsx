"use client";

import Link from "next/link";
import { ArrowRight, FileUp, LogIn, Sparkles } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appCardClass,
  appPrimaryButtonClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { CONVERSION_COPY } from "@/lib/client/conversionCopy";
import type { AudienceState } from "@/lib/auth/routeAccess";

type MakeTobaileyYoursCardProps = {
  audience: AudienceState;
  /** Optional soft product line under the main card. */
  showSoftLine?: boolean;
  className?: string;
};

/**
 * Single restrained conversion card for public / zero-holdings intelligence pages.
 * Do not mount more than once per page.
 */
export function MakeTobaileyYoursCard({
  audience,
  showSoftLine = false,
  className = "",
}: MakeTobaileyYoursCardProps) {
  if (audience === "authenticated_holdings") return null;

  const primaryHref =
    audience === "guest"
      ? `/signup?next=${encodeURIComponent(CONVERSION_COPY.primaryHref)}`
      : CONVERSION_COPY.primaryHref;
  const secondaryHref =
    audience === "guest"
      ? `/login?next=${encodeURIComponent("/dashboard")}`
      : CONVERSION_COPY.exploreHref;

  return (
    <section
      className={`${appCardClass} px-5 py-6 sm:px-7 sm:py-7 ${className}`}
      aria-labelledby="make-tobailey-yours-heading"
    >
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="make-tobailey-yours-heading" className={appSectionTitleClass}>
            {CONVERSION_COPY.headline}
          </h2>
          <p className={`mt-2 max-w-2xl ${appSectionSubtitleClass}`}>
            {CONVERSION_COPY.supporting}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href={primaryHref} className={appPrimaryButtonClass}>
              <FileUp className="h-4 w-4" aria-hidden />
              {CONVERSION_COPY.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={secondaryHref} className={appBrandSoftButtonClass}>
              {audience === "guest" ? (
                <>
                  <LogIn className="h-4 w-4" aria-hidden />
                  {CONVERSION_COPY.secondaryCta}
                </>
              ) : (
                CONVERSION_COPY.zeroHoldingsSecondaryCta
              )}
            </Link>
          </div>
          {showSoftLine ? (
            <p className="mt-4 text-[13px] font-medium leading-relaxed text-slate-500">
              {CONVERSION_COPY.softLine}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
