"use client";

import { useEffect, useId, useState } from "react";

import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  PORTFOLIO_BASE_CURRENCY_OPTIONS,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

export function PortfolioBaseCurrencySetting() {
  const selectId = useId();
  const helperId = useId();
  const {
    userSub,
    baseCurrency,
    preferenceReady,
    isSavingPreference,
    preferenceError,
    preferenceSaveSuccess,
    saveBaseCurrency,
  } = useBaseCurrencyDisplay();
  const [draft, setDraft] = useState<PortfolioBaseCurrency>(baseCurrency);

  useEffect(() => {
    setDraft(baseCurrency);
  }, [baseCurrency]);

  if (!preferenceReady) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm font-semibold text-slate-500" aria-live="polite">
          Loading currency preference…
        </p>
      </div>
    );
  }

  if (!userSub) {
    return (
      <div className="px-5 py-4">
        <p className="text-sm text-slate-500">
          Sign in to manage your portfolio base currency.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 px-5 py-4">
      <div>
        <label
          htmlFor={selectId}
          className="block text-sm font-bold text-slate-950"
        >
          Portfolio base currency
        </label>
        <p id={helperId} className="mt-1 text-sm leading-6 text-slate-500">
          This changes your portfolio display currency. Holdings and original
          trading currencies are not rewritten.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          id={selectId}
          aria-describedby={helperId}
          value={draft}
          disabled={isSavingPreference}
          onChange={(event) =>
            setDraft(event.target.value as PortfolioBaseCurrency)
          }
          className="min-h-[44px] w-full rounded-2xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5 disabled:cursor-not-allowed disabled:opacity-60 sm:max-w-xs"
        >
          {PORTFOLIO_BASE_CURRENCY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          disabled={isSavingPreference || draft === baseCurrency}
          onClick={() => {
            void saveBaseCurrency(draft);
          }}
          className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSavingPreference ? "Saving…" : "Save currency"}
        </button>
      </div>

      {preferenceSaveSuccess && !preferenceError ? (
        <p
          className="text-sm font-semibold text-emerald-700"
          role="status"
          aria-live="polite"
        >
          Portfolio base currency saved.
        </p>
      ) : null}

      {preferenceError ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {preferenceError}
        </p>
      ) : null}

      <ConversionDetailsDisclosure />
    </div>
  );
}
