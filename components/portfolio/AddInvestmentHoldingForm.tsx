"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Search } from "lucide-react";

import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import { HoldingIdentifierLabel } from "@/components/import/HoldingIdentifierHelp";
import { ConfirmedListingIdentity } from "@/components/instruments/ConfirmedListingIdentity";
import { ListingCandidatePicker } from "@/components/instruments/ListingCandidatePicker";
import NumericInput from "@/components/NumericInput";
import {
  LISTING_LOOKUP_UNAVAILABLE_MESSAGE,
  UNIDENTIFIED_LISTING_MESSAGE,
} from "@/lib/content/holdingIdentifierHelp";
import { shouldTriggerManualListingAutoLookup } from "@/lib/client/manualHoldingAutoLookup";
import {
  resolveAddHoldingUiPhase,
  shouldShowAddHoldingEntryFields,
} from "@/lib/client/addHoldingUiState";
import { FX_UNAVAILABLE_SAVE_MESSAGE } from "@/lib/client/baseCurrencyInput";
import { portfolioBaseCurrencySymbol } from "@/lib/types/portfolioBaseCurrency";
import type { PortfolioBaseCurrency } from "@/lib/types/portfolioBaseCurrency";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type ListingLookupMessages = {
  guidance: string[];
  alerts: string[];
};

export function AddInvestmentHoldingForm({
  draft,
  listingCandidates,
  listingWarnings,
  listingLookupPending,
  lookupUnavailable,
  listingLookupMessages,
  showPricingListingPicker,
  editorError,
  editorCurrencyLocked,
  canPersistMonetary,
  baseCurrency,
  isEditing = false,
  onDraftChange,
  onSelectListing,
  onLookupListing,
  onRetryFx,
}: {
  draft: StoredPortfolioHolding;
  listingCandidates: ResolvedInstrument[];
  listingWarnings: string[];
  listingLookupPending: boolean;
  lookupUnavailable: boolean;
  listingLookupMessages: ListingLookupMessages;
  showPricingListingPicker: boolean;
  editorError: string | null;
  editorCurrencyLocked: PortfolioBaseCurrency;
  canPersistMonetary: boolean;
  baseCurrency: PortfolioBaseCurrency;
  isEditing?: boolean;
  onDraftChange: (next: StoredPortfolioHolding) => void;
  onSelectListing: (candidate: ResolvedInstrument) => void;
  onLookupListing: () => void;
  onRetryFx: () => void;
}) {
  const [moreSearchOptions, setMoreSearchOptions] = useState(false);
  const listingSelected = Boolean(draft.providerSymbol?.trim());
  const searchActive = shouldTriggerManualListingAutoLookup({
    assetType: draft.assetType,
    symbol: draft.symbol,
    name: draft.name,
    isin: draft.isin,
    providerSymbol: draft.providerSymbol,
  });
  const uiPhase = resolveAddHoldingUiPhase({
    listingSelected,
    listingLookupPending,
    candidateCount: listingCandidates.length,
    searchActive,
    lookupUnavailable,
  });
  const showQuantity =
    shouldShowAddHoldingEntryFields(uiPhase) || isEditing;

  useEffect(() => {
    if (uiPhase === "resolved") {
      setMoreSearchOptions(false);
    }
  }, [uiPhase]);

  return (
    <div className="mt-7 space-y-5">
      <p className="text-[15px] leading-relaxed text-slate-600">
        Search by name, ticker or ISIN
      </p>
      <div className="block min-w-0" data-testid="add-holding-search">
        <HoldingIdentifierLabel term="ticker">
          <span className="text-sm font-bold text-slate-700">Search</span>
        </HoldingIdentifierLabel>
        <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
          <input
            type="text"
            value={draft.symbol}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              onDraftChange({
                ...draft,
                symbol: event.target.value,
                providerSymbol: null,
              });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
              }
            }}
            className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none"
          />
          {listingLookupPending ? (
            <Loader2
              className="h-4 w-4 shrink-0 animate-spin text-slate-400"
              data-testid="add-holding-searching"
              aria-label="Searching"
            />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          )}
        </span>
      </div>

      {uiPhase === "searching" ? (
        <p className="text-sm font-semibold text-slate-500" data-testid="add-holding-searching-copy">
          Searching…
        </p>
      ) : null}

      {uiPhase === "unresolved" ? (
        <div
          className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"
          data-testid="add-holding-no-match"
        >
          <p className="font-semibold">{UNIDENTIFIED_LISTING_MESSAGE}</p>
          {!moreSearchOptions ? (
            <button
              type="button"
              onClick={() => setMoreSearchOptions(true)}
              className="mt-2 text-sm font-bold text-slate-900 underline"
            >
              More search options
            </button>
          ) : null}
        </div>
      ) : null}

      {listingWarnings.length > 0 && uiPhase !== "resolved" ? (
        <div className="space-y-3">
          {listingLookupMessages.guidance.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {listingLookupMessages.guidance.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          ) : null}
          {listingLookupMessages.alerts.length > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {listingLookupMessages.alerts.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : lookupUnavailable ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">
                {LISTING_LOOKUP_UNAVAILABLE_MESSAGE}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {uiPhase === "ambiguous" && showPricingListingPicker ? (
        <ListingCandidatePicker
          source={{
            instrumentName: draft.instrumentName ?? draft.name,
            exchange: draft.exchange,
            isin: draft.isin,
            matchMethod: draft.matchMethod as
              | ResolvedInstrument["matchMethod"]
              | undefined,
            matchConfidence: draft.matchConfidence,
            candidates: listingCandidates,
          }}
          selectedProviderSymbol={draft.providerSymbol}
          onSelect={onSelectListing}
        />
      ) : null}

      {listingSelected ? <ConfirmedListingIdentity holding={draft} /> : null}

      {showQuantity ? (
        <div data-testid="add-holding-entry-fields">
          <Field
            label="Quantity"
            type="number"
            min="0"
            step="any"
            value={draft.quantity}
            onChange={(value) =>
              onDraftChange({ ...draft, quantity: Number(value) })
            }
          />
          <Field
            label={`Cost basis, optional (${editorCurrencyLocked})`}
            type="number"
            prefix={portfolioBaseCurrencySymbol(editorCurrencyLocked)}
            min="0"
            step="any"
            required={false}
            value={draft.purchasePrice}
            onChange={(value) =>
              onDraftChange({ ...draft, purchasePrice: Number(value) })
            }
          />
        </div>
      ) : null}

      <div>
        <button
          type="button"
          data-testid="add-holding-more-options"
          aria-expanded={moreSearchOptions}
          onClick={() => setMoreSearchOptions((open) => !open)}
          className="inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-slate-700"
        >
          More search options
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              moreSearchOptions ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>
        {moreSearchOptions ? (
          <div
            className="mt-4 space-y-5"
            data-testid="add-holding-more-options-panel"
          >
            <Field
              label="ISIN (optional)"
              helpTerm="isin"
              required={false}
              value={draft.isin ?? ""}
              onChange={(value) => {
                onDraftChange({
                  ...draft,
                  isin: value || null,
                  providerSymbol: null,
                });
              }}
            />
            <Field
              label="Instrument name (optional)"
              required={false}
              value={draft.name}
              onChange={(value) => {
                onDraftChange({
                  ...draft,
                  name: value,
                  providerSymbol: null,
                });
              }}
            />
            <ExchangeFieldEditor
              exchange={draft.exchange}
              providerSymbol={draft.providerSymbol}
              allowFreeText
              onCommit={(exchangeCode) => {
                onDraftChange({
                  ...draft,
                  exchange: exchangeCode,
                  providerSymbol: null,
                });
              }}
            />
            <Field
              label={`Current price (${editorCurrencyLocked})`}
              type="number"
              prefix={portfolioBaseCurrencySymbol(editorCurrencyLocked)}
              min="0"
              step="any"
              required={false}
              value={draft.currentPrice}
              onChange={(value) =>
                onDraftChange({ ...draft, currentPrice: Number(value) })
              }
            />
            <button
              type="button"
              onClick={onLookupListing}
              disabled={listingLookupPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"
            >
              {listingLookupPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Find listing
            </button>
            <p className="text-[14px] leading-relaxed text-slate-500">
              Bond ETFs and individual bonds use this same flow. Prefer ISIN or
              ticker plus exchange (for example EUNA), then Find listing.
            </p>
          </div>
        ) : null}
      </div>

      {editorError ? (
        <p className="text-sm font-semibold text-red-700" role="alert">
          {editorError}
        </p>
      ) : null}
      {!canPersistMonetary && baseCurrency !== "EUR" ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{FX_UNAVAILABLE_SAVE_MESSAGE}</p>
          <button
            type="button"
            onClick={onRetryFx}
            className="mt-2 inline-flex min-h-[44px] items-center font-semibold underline"
          >
            Retry conversion
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
  min,
  step,
  required = type === "number",
  helpTerm,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  prefix?: string;
  min?: string;
  step?: string;
  required?: boolean;
  helpTerm?: "ticker" | "isin" | "exchange" | "currency";
}) {
  const labelText = (
    <span
      className={
        type === "number"
          ? "text-[15px] font-bold text-slate-800"
          : "text-sm font-bold text-slate-700"
      }
    >
      {label}
    </span>
  );
  const labelNode = helpTerm ? (
    <HoldingIdentifierLabel term={helpTerm}>{labelText}</HoldingIdentifierLabel>
  ) : (
    labelText
  );
  const Wrapper = helpTerm ? "div" : "label";

  if (type === "number") {
    return (
      <Wrapper className="block min-w-0">
        {labelNode}
        <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
          {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
          <NumericInput
            required={required}
            value={Number(value)}
            min={min ? Number(min) : undefined}
            placeholder={step === "0.01" ? "0.00" : "0"}
            onChange={(next) => onChange(String(next))}
            className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none"
          />
        </span>
      </Wrapper>
    );
  }

  return (
    <Wrapper className="block min-w-0">
      {labelNode}
      <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
        {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
        <input
          required={required}
          type={type}
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none"
        />
      </span>
    </Wrapper>
  );
}
