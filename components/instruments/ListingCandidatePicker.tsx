"use client";

import { ChevronRight } from "lucide-react";

import {
  buildListingCandidates,
  formatListingDetails,
  type ListingCandidateSource,
} from "@/lib/services/instruments/listingConfirmation";
import type { ResolvedInstrument } from "@/lib/types/instrument";

type ListingCandidatePickerProps = {
  source: ListingCandidateSource;
  selectedProviderSymbol?: string | null;
  onSelect: (candidate: ResolvedInstrument) => void;
  title?: string;
};

export function ListingCandidatePicker({
  source,
  selectedProviderSymbol,
  onSelect,
  title = "Select listing",
}: ListingCandidatePickerProps) {
  const candidates = buildListingCandidates(source);
  if (candidates.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
        {title}
      </p>
      <div className="space-y-2">
        {candidates.map((candidate) => {
          const details = formatListingDetails(candidate);
          const selected = selectedProviderSymbol === candidate.providerSymbol;

          return (
            <button
              key={candidate.providerSymbol ?? details.summaryLine}
              type="button"
              onClick={() => onSelect(candidate)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
                selected
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">
                  {details.instrumentName}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {details.summaryLine}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  ISIN: {details.isin} · {details.providerSymbol}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SelectedListingSummary({
  listing,
}: {
  listing: ResolvedInstrument;
}) {
  const details = formatListingDetails(listing);

  return (
    <div className="rounded-2xl bg-emerald-50 px-4 py-3">
      <p className="text-[11px] font-black uppercase tracking-[0.1em] text-emerald-800">
        Confirmed listing
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">
        {details.instrumentName}
      </p>
      <p className="mt-1 text-xs text-slate-600">{details.summaryLine}</p>
      <p className="text-xs text-slate-500">{details.providerSymbol}</p>
    </div>
  );
}
