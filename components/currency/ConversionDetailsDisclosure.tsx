"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  baseCurrencyFxStatusLabel,
  formatFxRateDisclosureLines,
  FX_UNAVAILABLE_EDIT_MESSAGE,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";

function formatProviderTime(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function ConversionDetailsDisclosure({
  defaultOpen = false,
  compactTrigger = false,
  quietTrigger = false,
  tone = "light",
}: {
  defaultOpen?: boolean;
  compactTrigger?: boolean;
  /** Smaller visual weight; keeps a 44px tap target via negative margin. */
  quietTrigger?: boolean;
  /** Use dark on slate/hero surfaces so the trigger stays readable. */
  tone?: "light" | "dark";
}) {
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const { snapshot, baseCurrency } = useBaseCurrencyDisplay();
  const rateLines = formatFxRateDisclosureLines(snapshot);
  const isDark = tone === "dark";
  const ratesUnavailable =
    baseCurrency !== "EUR" &&
    (snapshot.status === "unavailable" || rateLines == null);

  const quietButtonClass = isDark
    ? "inline-flex min-h-[44px] -my-2 items-center gap-1 rounded-lg px-0.5 text-[12px] font-medium text-white/70 underline-offset-2 hover:text-white/90 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
    : "inline-flex min-h-[44px] -my-2 items-center gap-1 rounded-lg px-0.5 text-[12px] font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

  const compactButtonClass = isDark
    ? "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-[15px] font-semibold text-white underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
    : "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

  const fullButtonClass = isDark
    ? "inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-left text-[15px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto"
    : "inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-left text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto";

  const dtClass = isDark
    ? "font-semibold text-white/90"
    : "font-semibold text-slate-500";

  return (
    <div className="min-w-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={
          quietTrigger
            ? quietButtonClass
            : compactTrigger
              ? compactButtonClass
              : fullButtonClass
        }
      >
        <span>{open ? "Hide conversion details" : "View conversion details"}</span>
        {!compactTrigger && !quietTrigger ? (
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className={
            isDark
              ? "mt-3 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-[15px] leading-6 text-white"
              : "mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
          }
        >
          {baseCurrency === "EUR" ? (
            <p>
              Portfolio ledger and selected base currency are both EUR. No
              conversion is required.
            </p>
          ) : (
            <dl className="space-y-2">
              <div>
                <dt className={dtClass}>Selected currency</dt>
                <dd>{baseCurrency}</dd>
              </div>
              <div>
                <dt className={dtClass}>Latest available FX rate</dt>
                <dd className="space-y-0.5">
                  {rateLines ? (
                    <>
                      <p>{rateLines.forward}</p>
                      <p>{rateLines.reciprocal}</p>
                    </>
                  ) : (
                    <p>Unavailable</p>
                  )}
                </dd>
              </div>
              <div>
                <dt className={dtClass}>Source</dt>
                <dd>EODHD</dd>
              </div>
              <div>
                <dt className={dtClass}>Provider quote time</dt>
                <dd>{formatProviderTime(snapshot.updatedAt)}</dd>
              </div>
              <div>
                <dt className={dtClass}>Status</dt>
                <dd>{baseCurrencyFxStatusLabel(snapshot.status)}</dd>
              </div>
              <div>
                <dt className={dtClass}>Conversion path</dt>
                <dd className="break-words">
                  {rateLines?.conversionPath ?? `EUR → ${baseCurrency}`}
                </dd>
              </div>
              {ratesUnavailable ? (
                <div>
                  <dt className={dtClass}>Recovery</dt>
                  <dd>{FX_UNAVAILABLE_EDIT_MESSAGE}</dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      ) : null}
    </div>
  );
}
