"use client";

import Link from "next/link";
import { BriefcaseBusiness, FileSpreadsheet, Pencil } from "lucide-react";

import {
  appSectionBodyClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  PORTFOLIO_SETUP_COPY,
  PORTFOLIO_SETUP_ROUTES,
} from "@/lib/client/portfolioSetup";

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

const primaryClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto";

const secondaryClass =
  "inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-brand-navy transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto";


/**
 * Shared empty-portfolio guidance for secondary surfaces.
 * Prefer PortfolioSetupOnboarding on the dashboard first-run path.
 */
export function EmptyPortfolioGuide({
  title = PORTFOLIO_SETUP_COPY.compactTitle,
  body = PORTFOLIO_SETUP_COPY.compactBody,
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
        className="mx-auto h-9 w-9 text-slate-300"
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
        <p className={`mx-auto mt-3 max-w-xl ${appSectionBodyClass} text-slate-600`}>
          {availableWithoutHoldings}
        </p>
      ) : null}
      <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
        <Link href={PORTFOLIO_SETUP_ROUTES.import} className={primaryClass}>
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          {PORTFOLIO_SETUP_COPY.importPrimary}
        </Link>
        <Link href={PORTFOLIO_SETUP_ROUTES.manualAdd} className={secondaryClass}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
          {PORTFOLIO_SETUP_COPY.manualSecondary}
        </Link>
      </div>
    </section>
  );
}
