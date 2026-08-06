"use client";

import { ChevronRight } from "lucide-react";

import { MANUAL_PRICING_SELECTION_TITLE } from "@/lib/client/holdingVenuePresentation";
import {
  buildListingCandidates,
  formatListingDetails,
  type ListingCandidateSource,
} from "@/lib/services/instruments/listingConfirmation";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export { HoldingVenueSummary, SelectedListingSummary } from "@/components/instruments/HoldingVenueSummary";

type ListingCandidatePickerProps = {
  source: ListingCandidateSource;
  selectedProviderSymbol?: string | null;
  onSelect: (candidate: ResolvedInstrument) => void;
  title?: string;
};

/**
 * Manual pricing-listing picker. Only mount when the match engine cannot
 * deterministically choose one live pricing source.
 */
export function ListingCandidatePicker({
  source,
  selectedProviderSymbol,
  onSelect,
  title = MANUAL_PRICING_SELECTION_TITLE,
}: ListingCandidatePickerProps) {
  const candidates = buildListingCandidates(source);
  if (candidates.length === 0) return null;

  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
        Live pricing source
      </p>
      <p className="mb-3 text-sm text-slate-600">{title}</p>
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
                  ? "border-slate-400 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {details.instrumentName}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-600">
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
