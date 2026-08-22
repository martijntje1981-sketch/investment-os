"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Percent, X } from "lucide-react";

import NumericInput from "@/components/NumericInput";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import {
  EXPECTED_ANNUAL_RETURN_MAX,
  EXPECTED_ANNUAL_RETURN_MIN,
  buildExpectedReturnImpactPreview,
  formatExpectedReturnAssumptionContext,
  formatExpectedReturnPa,
  getExpectedReturnAssumption,
  isValidExpectedAnnualReturnInput,
  withExpectedReturnAssumption,
} from "@/lib/client/expectedReturnAssumption";
import type { PortfolioHistoryPoint } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

/** Primary Goals surface — visible near projections. */
export function ExpectedReturnAssumptionPanel({
  percent,
  onEdit,
}: {
  percent: number;
  onEdit: () => void;
}) {
  return (
    <div
      className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3.5"
      data-testid="expected-return-assumption-panel"
    >
      <p className={appSectionLabelClass}>Expected return</p>
      <p className={`mt-1 ${appSectionTitleClass} text-lg`}>
        {formatExpectedReturnPa(percent)}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <p className={appSectionMetaClass}>Your assumption</p>
        <button
          type="button"
          onClick={onEdit}
          className={`inline-flex min-h-11 items-center ${appTextLinkClass}`}
          data-testid="expected-return-assumption-edit"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

/** Compact line for Sensitivity / Scenario / other forward-looking surfaces. */
export function ExpectedReturnAssumptionCompact({
  percent,
  onEdit,
}: {
  percent: number;
  onEdit: () => void;
}) {
  return (
    <p
      className={`${appSectionMetaClass} flex flex-wrap items-center gap-x-2 gap-y-1`}
      data-testid="expected-return-assumption-compact"
    >
      <span>
        {formatExpectedReturnAssumptionContext(percent)}
        {" · "}
      </span>
      <button
        type="button"
        onClick={onEdit}
        className={`inline-flex min-h-11 items-center ${appTextLinkClass}`}
      >
        Edit
      </button>
    </p>
  );
}

export function ExpectedReturnAssumptionEditor({
  open,
  onClose,
  goal,
  currentPortfolioValue,
  portfolioHistory,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  goal: GoalSettings;
  currentPortfolioValue: number;
  portfolioHistory?: PortfolioHistoryPoint[];
  onSave: (nextGoal: GoalSettings) => void;
}) {
  const titleId = useId();
  const current = getExpectedReturnAssumption(goal) ?? 0;
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDraft(getExpectedReturnAssumption(goal) ?? 0);
    setError(null);
  }, [open, goal]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const preview = useMemo(
    () =>
      buildExpectedReturnImpactPreview({
        goal,
        currentPortfolioValue,
        portfolioHistory,
        nextExpectedAnnualReturn: draft,
      }),
    [goal, currentPortfolioValue, portfolioHistory, draft],
  );

  if (!open) return null;

  function handleSave() {
    if (!isValidExpectedAnnualReturnInput(draft)) {
      setError(
        `Enter a number from ${EXPECTED_ANNUAL_RETURN_MIN} to ${EXPECTED_ANNUAL_RETURN_MAX}.`,
      );
      return;
    }
    const next = withExpectedReturnAssumption(goal, draft);
    if (!next) {
      setError("Could not update this assumption.");
      return;
    }
    onSave(next);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-testid="expected-return-assumption-editor"
    >
      <button
        type="button"
        className="absolute inset-0 bg-navy-hero/45"
        aria-label="Close expected return editor"
        onClick={onClose}
      />
      <div className="relative z-[1] max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-slate-200 bg-white px-5 py-5 shadow-xl sm:rounded-3xl sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={appSectionLabelClass}>Expected return</p>
            <h2
              id={titleId}
              className="mt-1 text-xl font-bold tracking-[-0.03em] text-slate-950"
            >
              Your assumption
            </h2>
            <p className={`mt-1.5 ${appSectionMetaClass}`}>
              This is your own assumption used for Tobailey projections. It is
              not a forecast or guarantee.
            </p>
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

        <label className="mt-5 block">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Percent className="h-4 w-4" aria-hidden />
            Expected annual return %
          </span>
          <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15">
            <NumericInput
              required
              value={draft}
              min={EXPECTED_ANNUAL_RETURN_MIN}
              aria-label="Expected annual return percent"
              onChange={(next) => {
                setError(null);
                setDraft(next);
              }}
              className="min-w-0 flex-1 bg-transparent px-2 py-3.5 text-base font-bold outline-none"
            />
            <span className="font-bold text-slate-400">% p.a.</span>
          </span>
        </label>

        {preview?.usable ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className={appSectionLabelClass}>Illustrative impact</p>
            <p className={`mt-1 ${appSectionBodyClass}`}>
              Expected return: {formatExpectedReturnPa(preview.fromPercent)}
              {" → "}
              {formatExpectedReturnPa(preview.toPercent)}
            </p>
            <p className={`mt-1 ${appSectionBodyClass}`}>
              Projected completion: {preview.fromCompletionLabel}
              {" → "}
              {preview.toCompletionLabel}
            </p>
          </div>
        ) : (
          <p className={`mt-4 ${appSectionMetaClass}`}>
            Save to apply this assumption to all forward-looking projections.
            Completion impact preview appears when the goal engine can estimate
            a date.
          </p>
        )}

        {error ? (
          <p className="mt-3 text-sm font-medium text-red-700" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSave}
          className={`mt-5 w-full ${appSolidButtonClass}`}
        >
          Save assumption
        </button>
      </div>
    </div>
  );
}
