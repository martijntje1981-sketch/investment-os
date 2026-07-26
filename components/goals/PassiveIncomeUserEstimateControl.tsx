"use client";

import { useEffect, useId, useState } from "react";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import {
  sanitizeNumericInput,
  parseOptionalNumericInput,
} from "@/lib/client/numericInput";
import {
  buildAnnualCashAmountUserEstimate,
  buildAnnualYieldUserEstimate,
  MAX_PASSIVE_INCOME_USER_CASH_EUR,
  MAX_PASSIVE_INCOME_USER_YIELD_PERCENT,
  type PassiveIncomeUserEstimate,
} from "@/lib/types/passiveIncomeUserEstimate";

type EstimateMode = PassiveIncomeUserEstimate["mode"];

function formatEstimateDraft(estimate: PassiveIncomeUserEstimate | null): string {
  if (!estimate) return "";
  return estimate.mode === "annual_yield"
    ? String(estimate.annualYieldPercent)
    : String(estimate.annualCashAmountEur);
}

export function PassiveIncomeUserEstimateControl({
  currentEstimate,
  providerDataUsed,
  retainedButExcluded = false,
  exclusionReason,
  onSave,
  onRemove,
  disabled = false,
}: {
  currentEstimate: PassiveIncomeUserEstimate | null;
  providerDataUsed: boolean;
  retainedButExcluded?: boolean;
  exclusionReason?: string | null;
  onSave: (estimate: PassiveIncomeUserEstimate) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const groupId = useId();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<EstimateMode>(
    currentEstimate?.mode ?? "annual_yield",
  );
  const [rawValue, setRawValue] = useState(() =>
    formatEstimateDraft(currentEstimate),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editing) {
      setMode(currentEstimate?.mode ?? "annual_yield");
      setRawValue(formatEstimateDraft(currentEstimate));
      setError(null);
    }
  }, [currentEstimate, editing]);

  function resetDraft() {
    setMode(currentEstimate?.mode ?? "annual_yield");
    setRawValue(formatEstimateDraft(currentEstimate));
    setError(null);
    setEditing(false);
  }

  function handleSave() {
    const parsed = parseOptionalNumericInput(rawValue);
    if (parsed == null) {
      setError("Enter a valid number greater than zero.");
      return;
    }

    const estimate =
      mode === "annual_yield"
        ? buildAnnualYieldUserEstimate(parsed)
        : buildAnnualCashAmountUserEstimate(parsed);

    if (!estimate) {
      setError(
        mode === "annual_yield"
          ? `Yield must be greater than 0 and at most ${MAX_PASSIVE_INCOME_USER_YIELD_PERCENT}%.`
          : `Amount must be greater than 0 and at most €${MAX_PASSIVE_INCOME_USER_CASH_EUR.toLocaleString("en-GB")}.`,
      );
      return;
    }

    onSave(estimate);
    setError(null);
    setEditing(false);
  }

  if (retainedButExcluded) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
        <p className={`${appSectionLabelClass} text-amber-900`}>
          User estimate retained
        </p>
        <p className={`mt-1 ${appSectionMetaClass}`}>
          {exclusionReason ??
            "This holding is not currently eligible for Passive Income. The saved estimate is kept but excluded from totals."}
        </p>
        {currentEstimate ? (
          <p className={`mt-2 ${appSectionBodyClass}`}>
            Saved{" "}
            {currentEstimate.mode === "annual_yield"
              ? `annual yield ${currentEstimate.annualYieldPercent}%`
              : `annual cash amount €${currentEstimate.annualCashAmountEur.toLocaleString("en-GB")}`}
            .
          </p>
        ) : null}
      </div>
    );
  }

  if (providerDataUsed) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
        <p className={`${appSectionLabelClass} text-emerald-800`}>
          Provider data is used
        </p>
        <p className={`mt-1 ${appSectionMetaClass}`}>
          Provider data will take priority when available. Estimates are not
          guaranteed distributions.
        </p>
        {currentEstimate ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>
            A saved user estimate remains stored for if provider data becomes
            unavailable.
          </p>
        ) : null}
      </div>
    );
  }

  if (!editing && currentEstimate) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <p className={appSectionLabelClass}>User estimate</p>
        <p className={appSectionBodyClass}>
          {currentEstimate.mode === "annual_yield"
            ? `Annual yield ${currentEstimate.annualYieldPercent}%`
            : `Annual cash amount €${currentEstimate.annualCashAmountEur.toLocaleString("en-GB")}`}
        </p>
        <p className={appSectionMetaClass}>
          Provider data will take priority when available. Estimates are not
          guaranteed distributions.
        </p>
        {currentEstimate.mode === "annual_cash_amount" ? (
          <p className={appSectionMetaClass}>
            Annual cash amount does not automatically adjust when quantity changes.
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Edit estimate
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Remove estimate
          </button>
        </div>
      </div>
    );
  }

  if (!editing && !currentEstimate) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3">
        <p className={appSectionMetaClass}>
          No reliable provider income estimate is available for this eligible
          holding.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Add estimate
        </button>
      </div>
    );
  }

  return (
    <fieldset
      className="space-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-4"
      disabled={disabled}
    >
      <legend className={`${appSectionLabelClass} px-1`}>User estimate</legend>
      <p className={appSectionMetaClass}>
        Provider data will take priority when available. Estimates are not
        guaranteed distributions.
      </p>

      <div className="space-y-2" role="radiogroup" aria-label="Estimate type">
        {(
          [
            { value: "annual_yield" as const, label: "Annual yield (%)" },
            {
              value: "annual_cash_amount" as const,
              label: "Annual cash amount (€)",
            },
          ] as const
        ).map((option) => {
          const inputId = `${groupId}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700"
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                className="h-4 w-4 shrink-0"
                checked={mode === option.value}
                onChange={() => {
                  setMode(option.value);
                  setRawValue("");
                  setError(null);
                }}
              />
              <span className={`${appSectionBodyClass} break-words text-slate-900`}>
                {option.label}
              </span>
            </label>
          );
        })}
      </div>

      {mode === "annual_cash_amount" ? (
        <p className={appSectionMetaClass}>
          Annual cash amount does not automatically adjust when quantity changes.
        </p>
      ) : (
        <p className={appSectionMetaClass}>
          Yield uses the holding’s current market value in EUR. Enter 4.5 for 4.5%.
        </p>
      )}

      <label className="block" htmlFor={`${groupId}-value`}>
        <span className={appSectionLabelClass}>
          {mode === "annual_yield" ? "Yield percentage" : "Annual cash amount"}
        </span>
        <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100">
          {mode === "annual_cash_amount" ? (
            <span className="font-bold text-slate-400" aria-hidden="true">
              €
            </span>
          ) : null}
          <input
            id={`${groupId}-value`}
            type="text"
            inputMode="decimal"
            value={rawValue}
            placeholder={mode === "annual_yield" ? "4.5" : "1200"}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${groupId}-error` : undefined}
            onChange={(event) => {
              setRawValue(sanitizeNumericInput(event.target.value));
              setError(null);
            }}
            className="min-w-0 flex-1 bg-transparent px-2 py-3 text-base font-semibold outline-none"
          />
          {mode === "annual_yield" ? (
            <span className="font-bold text-slate-400" aria-hidden="true">
              %
            </span>
          ) : null}
        </span>
      </label>

      {error ? (
        <p
          id={`${groupId}-error`}
          className="text-sm font-semibold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Save estimate
        </button>
        <button
          type="button"
          onClick={resetDraft}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Cancel
        </button>
        {currentEstimate ? (
          <button
            type="button"
            onClick={() => {
              onRemove();
              setEditing(false);
              setRawValue("");
              setError(null);
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Remove estimate
          </button>
        ) : null}
      </div>
    </fieldset>
  );
}
