"use client";

import { useState } from "react";

import { parseProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";

type ExactListingSymbolFieldProps = {
  disabled?: boolean;
  onApply: (providerSymbol: string) => void;
};

export function ExactListingSymbolField({
  disabled = false,
  onApply,
}: ExactListingSymbolFieldProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function tryApply(raw: string) {
    const parsed = parseProviderSymbolInput(raw);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setError(null);
    onApply(parsed.providerSymbol);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <label className="block">
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
          Exact listing / provider symbol
        </span>
        <input
          type="text"
          value={value}
          disabled={disabled}
          placeholder="VWCE.XETRA"
          onChange={(event) => {
            setValue(event.target.value.toUpperCase());
            if (error) setError(null);
          }}
          onBlur={() => {
            if (value.trim()) {
              tryApply(value);
            }
          }}
          className="mt-2 w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 disabled:opacity-50"
        />
      </label>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter the exact listing code shown by your broker, for example VWCE.XETRA.
      </p>
      {error ? (
        <p className="mt-2 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={() => tryApply(value)}
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Use this listing
      </button>
    </div>
  );
}
