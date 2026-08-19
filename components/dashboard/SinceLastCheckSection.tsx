"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Bell, Check } from "lucide-react";

import {
  appIdentityAheadCardClass,
  appIdentityAheadIconClass,
  appIdentityHappenedCardClass,
  appIdentityHappenedIconClass,
  appIdentityMattersCardClass,
  appIdentityMattersIconClass,
  appIdentityOnTrackCardClass,
  appIdentityOnTrackIconClass,
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
  PortfolioChangeSignal,
  SmartAlertsAccessMode,
} from "@/lib/services/portfolioChangeDetection";
import { FREE_CHANGE_TEASE } from "@/lib/services/portfolioChangeDetection";
import {
  markLastCheckAt,
  readLastCheckAt,
} from "@/lib/client/lastCheckMemory";

type SinceLastCheckSectionProps = {
  attention: PortfolioChangeAttention;
  accessMode: SmartAlertsAccessMode;
  userSub?: string | null;
};

function cardClassFor(signal: PortfolioChangeSignal | null): string {
  const question = signal?.fourQuestionId;
  if (question === "what_matters_now") return appIdentityMattersCardClass;
  if (question === "am_i_on_track") return appIdentityOnTrackCardClass;
  if (question === "whats_ahead") return appIdentityAheadCardClass;
  return appIdentityHappenedCardClass;
}

function iconClassFor(signal: PortfolioChangeSignal | null): string {
  const question = signal?.fourQuestionId;
  if (question === "what_matters_now") return appIdentityMattersIconClass;
  if (question === "am_i_on_track") return appIdentityOnTrackIconClass;
  if (question === "whats_ahead") return appIdentityAheadIconClass;
  return appIdentityHappenedIconClass;
}

function formatWhen(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function SignalRow({
  signal,
  role,
}: {
  signal: PortfolioChangeSignal;
  role: "primary" | "secondary";
}) {
  const titleClass =
    role === "primary"
      ? "text-[1.125rem] font-bold leading-snug text-slate-950 sm:text-[1.25rem]"
      : "text-[16px] font-semibold leading-snug text-slate-900";

  return (
    <div className="min-w-0" data-testid={`since-last-check-${role}`}>
      <p className={titleClass}>{signal.title}</p>
      <p className={`${appFourQuestionSupportClass} mt-1`}>
        {signal.whyItMatters}
      </p>
      <Link
        href={signal.destination.href}
        className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-slate-950 px-3.5 text-[16px] font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        {signal.destination.label}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
      <details className="mt-3">
        <summary className="cursor-pointer list-none text-[15px] font-semibold text-slate-700 underline-offset-2 hover:underline">
          Why am I seeing this?
        </summary>
        <div className={`mt-2 space-y-1.5 ${appSectionMetaClass}`}>
          <p>{signal.evidence.whyAmISeeingThis}</p>
          <p>{signal.evidence.whatChanged}</p>
          <p>{signal.evidence.whyItMattersToPortfolio}</p>
          <p>{signal.evidence.howCalculated}</p>
          <p>{signal.evidence.confidenceNote}</p>
          {signal.limitations.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </details>
    </div>
  );
}

export function SinceLastCheckSection({
  attention,
  accessMode,
  userSub = null,
}: SinceLastCheckSectionProps) {
  const [lastOpenedLabel, setLastOpenedLabel] = useState<string | null>(null);

  useEffect(() => {
    const previous = readLastCheckAt(userSub);
    setLastOpenedLabel(formatWhen(previous));
    markLastCheckAt(userSub);
  }, [userSub]);

  const quiet =
    attention.status === "nothing_material" ||
    attention.status === "insufficient_history" ||
    attention.status === "unavailable";
  const shell = quiet
    ? "overflow-hidden rounded-[24px] border-2 border-slate-200 bg-gradient-to-br from-slate-50 via-white to-white shadow-[0_12px_32px_-18px_rgba(15,23,42,0.18)]"
    : cardClassFor(attention.primary);
  const icon = quiet
    ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-white"
    : iconClassFor(attention.primary);

  return (
    <section
      id="since-last-check"
      className={shell}
      data-testid="since-last-check"
      data-status={attention.status}
      data-access={accessMode}
    >
      <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
        <span className={icon} aria-hidden>
          {quiet ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={appSectionLabelClass}>Since your last check</p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            {attention.window.label}
            {lastOpenedLabel ? ` · Last opened ${lastOpenedLabel}` : ""}
          </p>

          {quiet ? (
            <p className={`mt-3 ${appKpiIntelClass} text-[1.125rem] leading-snug sm:text-[1.25rem]`}>
              {attention.headline}
            </p>
          ) : attention.primary ? (
            <div className="mt-3 space-y-4">
              <SignalRow signal={attention.primary} role="primary" />
              {attention.secondary.map((signal) => (
                <SignalRow
                  key={signal.id}
                  signal={signal}
                  role="secondary"
                />
              ))}
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
              className="mt-3 inline-flex min-h-11 items-center text-[16px] font-semibold text-cyan-800 underline-offset-2 hover:underline"
            >
              {FREE_CHANGE_TEASE}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
