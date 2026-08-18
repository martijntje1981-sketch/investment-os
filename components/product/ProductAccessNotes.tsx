"use client";

import Link from "next/link";

import { appSectionLabelClass, appSecondaryButtonClass } from "@/components/layout/appSurface";
import type { ProductAccess } from "@/lib/services/productAccess";

export function formatPlanLabel(access: ProductAccess): string {
  if (access.isDemo) return "Demo";
  if (access.tier === "trial") {
    return access.trialIndicatorLabel ?? "Complete Trial";
  }
  if (access.tier === "complete") return "Complete";
  return "Free";
}

export function PlanStatusBadge({
  access,
}: {
  access: ProductAccess;
}) {
  const label = formatPlanLabel(access);
  const tone =
    access.tier === "complete"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : access.tier === "trial"
        ? "border-violet-200 bg-violet-50 text-violet-900"
        : access.isDemo
          ? "border-sky-200 bg-sky-50 text-sky-900"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-semibold ${tone}`}
      data-testid="plan-status-badge"
      data-tier={access.tier}
    >
      {label}
    </span>
  );
}

/**
 * Unobtrusive Complete trial strip for Dashboard.
 */
export function CompleteTrialIndicator({
  access,
}: {
  access: ProductAccess;
}) {
  if (!access.isCompleteTrial || !access.trialIndicatorLabel) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-[15px] text-slate-700 sm:px-4"
      data-testid="complete-trial-indicator"
      data-tier={access.tier}
    >
      <p className="min-w-0 font-medium text-slate-800">
        {access.trialIndicatorLabel}
      </p>
      <Link
        href={access.upgradeHref}
        className="shrink-0 font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {access.upgradeCtaLabel}
      </Link>
    </div>
  );
}

/**
 * Calm Free-tier note when Complete depth is unavailable.
 */
export function FreeIntelligenceNote({
  access,
}: {
  access: ProductAccess;
}) {
  if (access.tier !== "free") return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/70 bg-slate-50/80 px-3.5 py-2.5 text-[15px] text-slate-700 sm:px-4"
      data-testid="free-intelligence-note"
      data-tier="free"
    >
      <p className="min-w-0">
        You’re on Free — basic portfolio answers stay available. Complete adds
        deeper personal intelligence.
      </p>
      <Link
        href={access.upgradeHref}
        className="shrink-0 font-semibold text-slate-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {access.upgradeCtaLabel}
      </Link>
    </div>
  );
}

export function PlanStatusCard({
  access,
}: {
  access: ProductAccess;
}) {
  const title =
    access.tier === "complete"
      ? "Tobailey Complete"
      : access.tier === "trial"
        ? "Tobailey Complete Trial"
        : access.isDemo
          ? "Tobailey Demo"
          : "Tobailey Free";

  const detail =
    access.tier === "complete"
      ? "€5.99/month"
      : access.tier === "trial"
        ? access.trialIndicatorLabel ?? "Complete intelligence is active during your trial."
        : access.isDemo
          ? "Read-only demonstration access."
          : "Your portfolio remains available with limited intelligence depth.";

  const followUp =
    access.tier === "trial"
      ? "After your trial: continue with Free or get Complete for €5.99/month."
      : access.tier === "free"
        ? "Upgrade any time for full intelligence depth."
        : access.tier === "complete"
          ? "You currently have full intelligence depth."
          : "Demo remains isolated from your personal portfolio.";

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5"
      data-testid="plan-status-card"
      data-tier={access.tier}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={appSectionLabelClass}>
            Your plan
          </p>
          <h2 className="mt-1 text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700">{detail}</p>
          <p className="mt-2 text-[15px] leading-relaxed text-slate-600">{followUp}</p>
        </div>
        {!access.isDemo && access.tier !== "complete" ? (
          <Link
            href={access.upgradeHref}
            className={`${appSecondaryButtonClass} shrink-0`}
          >
            {access.upgradeCtaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
