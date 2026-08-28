"use client";

import { ChevronRight } from "lucide-react";

import { AmbiguousListingHelp, HoldingIdentifierLabel } from "@/components/import/HoldingIdentifierHelp";
import { AMBIGUOUS_LISTING_BODY } from "@/lib/content/holdingIdentifierHelp";
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
  title = AMBIGUOUS_LISTING_BODY,
}: ListingCandidatePickerProps) {
  const candidates = buildListingCandidates(source);
  if (candidates.length === 0) return null;

  return (
    <div className="min-w-0">
      <AmbiguousListingHelp title={title} />
      <div className="mt-3 space-y-2">
        {candidates.map((candidate) => {
          const details = formatListingDetails(candidate);
          const selected = selectedProviderSymbol === candidate.providerSymbol;

          return (
            <button
              key={candidate.providerSymbol ?? details.summaryLine}
              type="button"
              onClick={() => onSelect(candidate)}
              className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${
                selected
                  ? "border-slate-400 bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="min-w-0">
                <p className="break-words text-[15px] font-semibold text-slate-900">
                  {details.instrumentName}
                </p>
                <p className="mt-1 break-words text-[15px] font-medium text-slate-600">
                  {details.ticker} · {details.exchange} · {details.currency}
                </p>
                <p className="mt-1 break-all text-[13px] font-medium text-slate-500">
                  {details.providerSymbol}
                </p>
                <p className="mt-1 break-all text-[15px] text-slate-500">
                  ISIN: {details.isin}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          );
        })}
      </div>
      <div className="mt-2">
        <HoldingIdentifierLabel term="currency">
          <span className="text-[13px] font-semibold text-slate-600">
            Listing currency
          </span>
        </HoldingIdentifierLabel>
      </div>
    </div>
  );
}
