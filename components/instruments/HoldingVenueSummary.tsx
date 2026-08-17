"use client";

import { Check } from "lucide-react";

import {
  buildHoldingVenuePresentation,
  LIVE_PRICING_AUTO_SELECTED_COPY,
} from "@/lib/client/holdingVenuePresentation";
import { appSectionMetaClass } from "@/components/layout/appSurface";

type HoldingVenueSummaryProps = {
  exchange?: string | null;
  pricingExchange?: string | null;
  providerSymbol?: string | null;
  instrumentName?: string | null;
  name?: string | null;
  confirmationSource?: string | null;
  /** When true, also show the purchase-exchange confirmation block. */
  showPurchaseExchange?: boolean;
};

/**
 * Read-only venue summary: purchase exchange stays primary; live pricing is
 * secondary informational styling once deterministically resolved.
 */
export function HoldingVenueSummary({
  exchange,
  pricingExchange,
  providerSymbol,
  instrumentName,
  name,
  confirmationSource,
  showPurchaseExchange = true,
}: HoldingVenueSummaryProps) {
  const venue = buildHoldingVenuePresentation({
    exchange,
    pricingExchange,
    providerSymbol,
    instrumentName,
    name,
    confirmationSource,
  });

  if (!venue.providerSymbol && !venue.purchaseExchangeCode) {
    return null;
  }

  return (
    <div className="space-y-3">
      {showPurchaseExchange && venue.purchaseExchangeLabel ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-emerald-800">
              Purchase exchange
            </p>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800">
              <Check className="h-3 w-3" aria-hidden />
              Confirmed
            </span>
          </div>
          <p className="mt-1.5 text-sm font-bold text-slate-950">
            {venue.purchaseExchangeLabel}
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Purchased on {venue.purchaseExchangeLabel}
          </p>
        </div>
      ) : null}

      {venue.providerSymbol ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-500">
            Pricing source
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            {venue.pricingExchangeLabel ?? "Verified listing"}
          </p>
          <p className="mt-1 text-xs font-medium text-slate-600">
            {venue.providerSymbol}
          </p>
          {venue.instrumentName ? (
            <p className="mt-1 text-xs text-slate-500">{venue.instrumentName}</p>
          ) : null}
          <p className={`mt-2 ${appSectionMetaClass}`}>
            {venue.autoSelectedPricing
              ? LIVE_PRICING_AUTO_SELECTED_COPY
              : "Selected for market price updates."}
          </p>
        </div>
      ) : null}

      {venue.purchaseExchangeLabel &&
      venue.pricingExchangeLabel &&
      venue.providerSymbol ? (
        <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
            Before saving
          </p>
          <dl className="mt-2 space-y-1.5 text-sm text-slate-700">
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold text-slate-900">Purchased on:</dt>
              <dd>{venue.purchaseExchangeLabel}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold text-slate-900">Price source:</dt>
              <dd>{venue.pricingExchangeLabel}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-semibold text-slate-900">Provider symbol:</dt>
              <dd className="font-medium">{venue.providerSymbol}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer HoldingVenueSummary for purchase vs pricing separation. */
export function SelectedListingSummary({
  listing,
}: {
  listing: {
    providerSymbol?: string | null;
    instrumentName?: string | null;
    exchange?: string | null;
    pricingExchange?: string | null;
    confirmationSource?: string | null;
  };
}) {
  return (
    <HoldingVenueSummary
      exchange={listing.exchange}
      pricingExchange={listing.pricingExchange}
      providerSymbol={listing.providerSymbol}
      instrumentName={listing.instrumentName}
      confirmationSource={listing.confirmationSource}
      showPurchaseExchange={false}
    />
  );
}
