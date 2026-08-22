"use client";

import Link from "next/link";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useId } from "react";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import type { DynamicPortfolioScore } from "@/lib/services/portfolio/periodScores";

const PERIOD_COPY: Record<
  DynamicPortfolioScore["id"],
  { title: string; question: string }
> = {
  daily: {
    title: "Daily Pulse",
    question: "What is happening in your portfolio right now?",
  },
  weekly: {
    title: "Weekly Pulse",
    question: "Is short-term direction improving or weakening?",
  },
  monthly: {
    title: "Monthly Pulse",
    question: "Is the portfolio structurally improving?",
  },
};

/**
 * Mobile-friendly Pulse detail sheet — explanation stays off the Dashboard surface.
 */
export function PortfolioPulseDetailSheet({
  score,
  open,
  onClose,
  attributionNotes = [],
}: {
  score: DynamicPortfolioScore | null;
  open: boolean;
  onClose: () => void;
  /** Optional Phase 3A attribution enrichment — explanatory only. */
  attributionNotes?: string[];
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !score) return null;

  const copy = PERIOD_COPY[score.id];
  const shaping = score.evidence.slice(0, 4);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="portfolio-pulse-detail"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy-hero/45"
        aria-label="Close pulse detail"
        onClick={onClose}
      />
      <div className="relative z-[1] max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white px-5 py-5 shadow-xl sm:rounded-3xl sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={appSectionLabelClass}>{copy.title}</p>
            <h2
              id={titleId}
              className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950"
            >
              {score.available && score.value != null
                ? `${score.value} · ${score.band?.label ?? "Available"}`
                : "Unavailable"}
            </h2>
            <p className={`mt-1 ${appSectionMetaClass}`}>{copy.question}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <p className={`mt-4 ${appSectionBodyClass}`}>{score.summary}</p>

        {attributionNotes.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className={appSectionLabelClass}>Performance drivers</p>
            <ul className="space-y-2">
              {attributionNotes.map((note) => (
                <li
                  key={note}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-sm font-medium text-slate-900"
                >
                  {note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {shaping.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className={appSectionLabelClass}>What shaped it</p>
            <ul className="space-y-2">
              {shaping.map((item) => {
                const sign =
                  item.impact === "positive"
                    ? "+"
                    : item.impact === "limiting"
                      ? "−"
                      : "·";
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      <span className="mr-1.5 tabular-nums text-slate-500">
                        {sign}
                      </span>
                      {item.label}
                      {item.value != null && item.value !== ""
                        ? ` · ${item.value}`
                        : ""}
                    </p>
                    <p className={`mt-0.5 ${appSectionMetaClass}`}>
                      {item.explanation}
                    </p>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        <p className={`mt-4 ${appSectionMetaClass}`}>{score.timingContext}</p>

        <Link
          href={score.href}
          className={`mt-4 inline-flex min-h-11 items-center gap-1.5 ${appTextLinkClass}`}
          onClick={onClose}
        >
          Open full context
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
