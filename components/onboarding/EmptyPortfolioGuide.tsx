"use client";

import Link from "next/link";
import { BriefcaseBusiness, Compass, FileSpreadsheet } from "lucide-react";

import {
  appBrandSoftButtonClass,
  appPrimaryButtonClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { CONVERSION_COPY } from "@/lib/client/conversionCopy";
import { PORTFOLIO_SETUP_ROUTES } from "@/lib/client/portfolioSetup";

type EmptyPortfolioGuideProps = {
  /** Page-specific title override. */
  title?: string;
  /** Page-specific body override. */
  body?: string;
  /** Visual density. */
  density?: "default" | "compact";
  /** Optional note for pages that still work without holdings. */
  availableWithoutHoldings?: string;
  className?: string;
};

/**
 * Shared empty-portfolio guidance for holdings-required surfaces.
 */
export function EmptyPortfolioGuide({
  title = "Add your holdings",
  body = CONVERSION_COPY.holdingsRequiredBody,
  density = "default",
  availableWithoutHoldings,
  className = "",
}: EmptyPortfolioGuideProps) {
  const padding =
    density === "compact" ? "px-5 py-7 sm:px-7 sm:py-8" : "px-6 py-10 sm:px-10 sm:py-12";

  return (
    <section
      className={`rounded-[28px] border border-slate-200 bg-white text-center shadow-sm ${padding} ${className}`}
      aria-labelledby="empty-portfolio-guide-heading"
    >
      <BriefcaseBusiness
        className="mx-auto h-9 w-9 text-brand/70"
        aria-hidden="true"
      />
      <h2
        id="empty-portfolio-guide-heading"
        className={`mt-4 ${appSectionTitleClass}`}
      >
        {title}
      </h2>
      <p className={`mx-auto mt-3 max-w-xl ${appSectionSubtitleClass}`}>{body}</p>
      {availableWithoutHoldings ? (
        <p className="mx-auto mt-3 max-w-xl text-[14px] font-medium leading-relaxed text-slate-600">
          {availableWithoutHoldings}
        </p>
      ) : null}
      <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href={PORTFOLIO_SETUP_ROUTES.import} className={appPrimaryButtonClass}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {CONVERSION_COPY.primaryCta}
        </Link>
        <Link href={CONVERSION_COPY.exploreHref} className={appBrandSoftButtonClass}>
          <Compass className="h-4 w-4" aria-hidden="true" />
          Explore the market
        </Link>
      </div>
    </section>
  );
}
