"use client";

import Link from "next/link";
import { FileSpreadsheet, Pencil, Sparkles } from "lucide-react";

import {
  appHeroShellClass,
  appPageHeroSubtitleClass,
  appPageHeroTitleClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import {
  DEMO_PORTFOLIO_ENABLED,
  DEMO_PORTFOLIO_HREF,
  PORTFOLIO_SETUP_COPY,
  PORTFOLIO_SETUP_ROUTES,
  PORTFOLIO_SETUP_STEPS,
  SUPPORTED_PORTFOLIO_INPUT_METHODS,
} from "@/lib/client/portfolioSetup";

type SetupVariant = "first-time" | "returning-empty";

type PortfolioSetupOnboardingProps = {
  variant?: SetupVariant;
  /** Optional market status or other footer content (dashboard). */
  footer?: React.ReactNode;
};

const primaryCtaClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-[16px] font-semibold text-brand-navy shadow-sm transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-brand-navy sm:w-auto";

const secondaryCtaClass =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-[16px] font-semibold text-slate-950 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto";

const tertiaryCtaClass =
  "inline-flex min-h-[44px] w-full items-center justify-center px-2 py-2 text-[15px] font-medium text-slate-700 underline-offset-4 transition hover:text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 sm:w-auto";

export function PortfolioSetupOnboarding({
  variant = "first-time",
  footer,
}: PortfolioSetupOnboardingProps) {
  const isFirstTime = variant === "first-time";
  const eyebrow = isFirstTime
    ? PORTFOLIO_SETUP_COPY.welcomeEyebrow
    : PORTFOLIO_SETUP_COPY.returningEyebrow;
  const headline = isFirstTime
    ? PORTFOLIO_SETUP_COPY.headline
    : PORTFOLIO_SETUP_COPY.returningHeadline;
  const supporting = isFirstTime
    ? PORTFOLIO_SETUP_COPY.supporting
    : PORTFOLIO_SETUP_COPY.returningSupporting;

  return (
    <div className="space-y-6 md:space-y-8">
      <section
        className={`${appHeroShellClass} relative overflow-hidden px-5 py-7 sm:px-8 sm:py-9`}
        aria-labelledby="portfolio-setup-heading"
      >
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse at 12% 0%, rgba(56,189,248,0.16), transparent 48%), radial-gradient(ellipse at 88% 100%, rgba(129,140,248,0.12), transparent 42%)",
          }}
        />

        <div className="relative">
          <p
            className={`inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 ${appSectionLabelClass} text-q1-strong`}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {eyebrow}
          </p>

          <h1
            id="portfolio-setup-heading"
            className={`mt-4 sm:mt-5 ${appPageHeroTitleClass}`}
          >
            {headline}
          </h1>

          <p className={appPageHeroSubtitleClass}>
            {supporting}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-start">
            <div className="flex w-full flex-col gap-1.5 sm:w-auto">
              <Link
                href={PORTFOLIO_SETUP_ROUTES.import}
                className={primaryCtaClass}
                aria-describedby="portfolio-setup-import-hint"
              >
                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                {PORTFOLIO_SETUP_COPY.importPrimary}
              </Link>
              <p
                id="portfolio-setup-import-hint"
                className="text-center text-[13px] font-medium text-slate-600 sm:text-left"
              >
                {PORTFOLIO_SETUP_COPY.importHint}
              </p>
            </div>

            <Link
              href={PORTFOLIO_SETUP_ROUTES.manualAdd}
              className={secondaryCtaClass}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {PORTFOLIO_SETUP_COPY.manualSecondary}
            </Link>
          </div>

          {DEMO_PORTFOLIO_ENABLED ? (
            <div className="mt-3">
              <Link
                href={DEMO_PORTFOLIO_HREF}
                className={tertiaryCtaClass}
              >
                {PORTFOLIO_SETUP_COPY.demoTertiary}
              </Link>
            </div>
          ) : null}

          <ol
            className="mt-7 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4"
            aria-label="How portfolio setup works"
          >
            {PORTFOLIO_SETUP_STEPS.map((item) => (
              <li
                key={item.step}
                className="flex gap-3 rounded-2xl border border-brand/20 bg-white/80 px-3.5 py-3"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-q1-strong text-[13px] font-bold tabular-nums text-white"
                  aria-hidden="true"
                >
                  {item.step}
                </span>
                <span className="pt-0.5 text-[14px] font-medium leading-snug text-slate-800">
                  {item.title}
                </span>
              </li>
            ))}
          </ol>

          <div className="mt-6 border-t border-brand/20 pt-5">
            <p className={appSectionLabelClass}>
              Supported ways to add holdings
            </p>
            <ul className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
              {SUPPORTED_PORTFOLIO_INPUT_METHODS.map((method) => (
                <li
                  key={method.id}
                  className="text-[15px] font-medium text-slate-700"
                >
                  <span className="text-slate-950">{method.label}</span>
                  <span className="text-slate-700"> · {method.detail}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] font-medium text-slate-700">
              Direct broker connections are not available — use a file export or
              enter holdings yourself.
            </p>
          </div>
        </div>
      </section>

      {footer}
    </div>
  );
}
