"use client";

import Link from "next/link";
import { ArrowUpRight, Bell, Check } from "lucide-react";

import {
  appIdentityHappenedCardClass,
  appIdentityHappenedIconClass,
  appKpiIntelClass,
} from "@/components/layout/semanticIdentity";
import {
  appFourQuestionSupportClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { COMPLETE_UPGRADE_HREF } from "@/lib/services/productAccess";
import type {
  PortfolioChangeAttention,
  SmartAlertsAccessMode,
} from "@/lib/services/portfolioChangeDetection";
import { FREE_CHANGE_TEASE } from "@/lib/services/portfolioChangeDetection";

type NewAndNotableSectionProps = {
  attention: PortfolioChangeAttention;
  accessMode: SmartAlertsAccessMode;
};

/**
 * Compact Dashboard change attention.
 * Comparison is snapshot-based, never last-opened.
 */
export function NewAndNotableSection({
  attention,
  accessMode,
}: NewAndNotableSectionProps) {
  const quiet =
    attention.status === "nothing_material" ||
    attention.status === "insufficient_history" ||
    attention.status === "unavailable";
  const primary = attention.primary;

  return (
    <section
      id="new-and-notable"
      className={`${quiet ? "overflow-hidden rounded-[24px] border border-slate-200/80 bg-white" : appIdentityHappenedCardClass} min-w-0 overflow-x-clip`}
      data-testid="new-and-notable"
      data-status={attention.status}
      data-access={accessMode}
      aria-labelledby="new-and-notable-heading"
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span
          className={
            quiet
              ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white"
              : appIdentityHappenedIconClass
          }
          aria-hidden
        >
          {quiet ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={appSectionLabelClass} id="new-and-notable-heading">
            New & Notable
          </p>
          <p className={`mt-0.5 ${appSectionMetaClass}`}>
            Changes worth knowing about
          </p>
          {attention.window.kind !== "unavailable" ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>{attention.window.label}</p>
          ) : null}

          {quiet ? (
            <p className={`mt-3 ${appKpiIntelClass} text-[1.05rem] leading-snug sm:text-[1.15rem]`}>
              {attention.headline}
            </p>
          ) : primary ? (
            <div className="mt-3 min-w-0">
              <p className="text-[1.05rem] font-bold leading-snug text-slate-950 sm:text-[1.2rem]">
                {primary.title}
              </p>
              <p className={`${appFourQuestionSupportClass} mt-1`}>
                {primary.whyItMatters}
              </p>
              {attention.secondary.slice(0, 1).map((signal) => (
                <p key={signal.id} className={`mt-2 ${appSectionMetaClass}`}>
                  {signal.title}
                </p>
              ))}
              <Link
                href={primary.destination.href}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-navy-hero px-3.5 text-[15px] font-semibold text-white transition hover:bg-navy-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {primary.destination.label}
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </Link>
              <details className="mt-3">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-700 underline-offset-2 hover:underline">
                  Why am I seeing this?
                </summary>
                <div className={`mt-2 space-y-1.5 ${appSectionMetaClass}`}>
                  <p>{primary.evidence.whyAmISeeingThis}</p>
                  <p>{primary.evidence.whatChanged}</p>
                  <p>{primary.evidence.whyItMattersToPortfolio}</p>
                  <p>{primary.evidence.howCalculated}</p>
                  <p>{primary.evidence.confidenceNote}</p>
                </div>
              </details>
            </div>
          ) : null}

          {attention.support && quiet ? (
            <p className={`${appFourQuestionSupportClass} mt-2`}>
              {attention.support}
            </p>
          ) : null}

          {accessMode === "free_preview" && attention.status === "attention" ? (
            <Link
              href={COMPLETE_UPGRADE_HREF}
              className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-q1-strong underline-offset-2 hover:underline"
            >
              {FREE_CHANGE_TEASE}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
