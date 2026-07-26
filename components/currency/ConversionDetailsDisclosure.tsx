"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  baseCurrencyFxStatusLabel,
  formatEurToBaseRateDisclosure,
} from "@/lib/services/prices/baseCurrencyFxSnapshot";
import { portfolioBaseCurrencyLabel } from "@/lib/types/portfolioBaseCurrency";

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
  tone = "light",
}: {
  defaultOpen?: boolean;
  compactTrigger?: boolean;
  /** Use dark on slate/hero surfaces so the trigger stays readable. */
  tone?: "light" | "dark";
}) {
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(defaultOpen);
  const { snapshot, baseCurrency } = useBaseCurrencyDisplay();
  const rateLine = formatEurToBaseRateDisclosure(snapshot);
  const isDark = tone === "dark";

  const compactButtonClass = isDark
    ? "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-200 underline-offset-2 hover:text-white hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
    : "inline-flex min-h-[44px] items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

  const fullButtonClass = isDark
    ? "inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-left text-sm font-semibold text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 sm:w-auto"
    : "inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-left text-sm font-semibold text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto";

  return (
    <div className="min-w-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={compactTrigger ? compactButtonClass : fullButtonClass}
      >
        <span>{open ? "Hide conversion details" : "View conversion details"}</span>
        {!compactTrigger ? (
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
              ? "mt-3 rounded-2xl border border-white/15 bg-slate-900 px-4 py-3 text-sm leading-6 text-slate-200"
              : "mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700"
          }
        >
          {baseCurrency === "EUR" ? (
            <p>Portfolio values use EUR as the base currency.</p>
          ) : (
            <dl className="space-y-2">
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Conversion
                </dt>
                <dd>Converted from EUR</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Selected currency
                </dt>
                <dd>{portfolioBaseCurrencyLabel(baseCurrency)}</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Latest available FX rate
                </dt>
                <dd>{rateLine ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Source
                </dt>
                <dd>{snapshot.source === "EODHD" ? "EODHD" : "Identity"}</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Provider update time
                </dt>
                <dd>{formatProviderTime(snapshot.updatedAt)}</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Status
                </dt>
                <dd>{baseCurrencyFxStatusLabel(snapshot.status)}</dd>
              </div>
              <div>
                <dt
                  className={
                    isDark
                      ? "font-semibold text-slate-400"
                      : "font-semibold text-slate-500"
                  }
                >
                  Conversion path
                </dt>
                <dd className="break-words">{snapshot.conversionPath}</dd>
              </div>
            </dl>
          )}
        </div>
      ) : null}
    </div>
  );
}
