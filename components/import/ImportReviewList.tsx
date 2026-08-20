"use client";

import { AlertCircle, Check } from "lucide-react";
import { useState } from "react";

import NumericInput from "@/components/NumericInput";
import { SupportStatusBadge } from "@/components/marketing/SupportStatusBadge";
import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import {
  HoldingIdentifierGlossaryDisclosure,
  HoldingIdentifierLabel,
} from "@/components/import/HoldingIdentifierHelp";
import { HoldingVenueSummary } from "@/components/instruments/HoldingVenueSummary";
import { ListingCandidatePicker } from "@/components/instruments/ListingCandidatePicker";
import { ExactListingSymbolField } from "@/components/import/ExactListingSymbolField";
import {
  buildListingCandidates,
} from "@/lib/services/instruments/listingConfirmation";
import {
  needsManualPricingSelection,
} from "@/lib/client/holdingVenuePresentation";
import {
  isMultipleListingGuidanceMessage,
  PURCHASE_EXCHANGE_CONFIRMED_HELPER,
} from "@/lib/client/listingLookupGuidance";
import { canConfirmImportRow } from "@/lib/services/portfolio/holdingValidation";
import {
  shouldShowExactListingFallback,
} from "@/lib/services/import/confidencePolicy";
import {
  extractionFieldLabel,
  getExtractionFieldsNeedingReview,
  shouldReviewExchange,
  type ExtractionReviewField,
} from "@/lib/services/extraction/fieldConfidence";
import {
  getPurchaseDateValidationError,
  importTierLabel,
  type ImportRow,
} from "@/lib/services/import";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import {
  resolveImportRowInstrumentSupportStatus,
} from "@/lib/services/instruments/instrumentSupportStatus";

type ImportReviewListProps = {
  rows: ImportRow[];
  onConfirm: (id: string) => void;
  onSelectCandidate: (id: string, candidate: ResolvedInstrument) => void;
  onFieldChange: (
    id: string,
    field: ExtractionReviewField,
    value: string | number,
  ) => void;
  onExchangeCommit: (
    id: string,
    exchangeCode: string | null,
    confirmed: boolean,
  ) => void;
  onManualExactListing: (id: string, providerSymbol: string) => void;
  onRemove: (id: string) => void;
};

export function ImportReviewList({
  rows,
  onConfirm,
  onSelectCandidate,
  onFieldChange,
  onExchangeCommit,
  onManualExactListing,
  onRemove,
}: ImportReviewListProps) {
  if (rows.length === 0) return null;

  return (
    <section className="min-w-0 space-y-4 overflow-x-hidden">
      <div>
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-amber-800">
          Needs your help
        </p>
        <h3 className="mt-1 text-[1.375rem] font-bold tracking-[-0.03em] text-slate-950">
          {rows.length === 1
            ? "Confirm this holding"
            : `Confirm ${rows.length} holdings`}
        </h3>
        <p className="mt-1 text-[16px] leading-relaxed text-slate-600">
          Matched holdings are ready. Only unresolved rows are shown here.
        </p>
        <div className="mt-2">
          <HoldingIdentifierGlossaryDisclosure />
        </div>
      </div>

      {rows.map((row) => (
        <ImportReviewCard
          key={row.id}
          row={row}
          onConfirm={() => onConfirm(row.id)}
          onSelectCandidate={(candidate) => onSelectCandidate(row.id, candidate)}
          onFieldChange={(field, value) => onFieldChange(row.id, field, value)}
          onExchangeCommit={(exchangeCode, confirmed) =>
            onExchangeCommit(row.id, exchangeCode, confirmed)
          }
          onManualExactListing={(providerSymbol) =>
            onManualExactListing(row.id, providerSymbol)
          }
          onRemove={() => onRemove(row.id)}
        />
      ))}
    </section>
  );
}

function ImportReviewCard({
  row,
  onConfirm,
  onSelectCandidate,
  onFieldChange,
  onExchangeCommit,
  onManualExactListing,
  onRemove,
}: {
  row: ImportRow;
  onConfirm: () => void;
  onSelectCandidate: (candidate: ResolvedInstrument) => void;
  onFieldChange: (
    field: ExtractionReviewField,
    value: string | number,
  ) => void;
  onExchangeCommit: (exchangeCode: string | null, confirmed: boolean) => void;
  onManualExactListing: (providerSymbol: string) => void;
  onRemove: () => void;
}) {
  const tier = row.reviewTier ?? "review";
  const unresolvedCandidates = row.candidates ?? [];
  const alternatives = buildListingCandidates(row);
  const showPricingListingPicker = needsManualPricingSelection({
    providerSymbol: row.providerSymbol,
    candidates: unresolvedCandidates,
  });
  const uncertainFields = getExtractionFieldsNeedingReview(row);
  const otherUncertainFields = uncertainFields.filter((field) => field !== "exchange");
  const [exchangeFieldActive, setExchangeFieldActive] = useState(false);
  const showExchangeField =
    shouldReviewExchange(row) || exchangeFieldActive;
  const showFieldEditors =
    otherUncertainFields.length > 0 || showExchangeField;
  const needsMatchReview =
    tier === "blocked" ||
    !row.providerSymbol ||
    row.matchMethod === "unresolved";
  const purchaseDateError = getPurchaseDateValidationError(row.purchaseDate);
  const showOptionalPurchaseDate =
    row.assetType !== "cash" && !uncertainFields.includes("purchaseDate");
  const showExactListingFallback =
    needsMatchReview && shouldShowExactListingFallback(row, alternatives.length);
  const supportStatus = resolveImportRowInstrumentSupportStatus(row);

  return (
    <article className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  tier === "blocked"
                    ? "bg-red-50 text-red-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {importTierLabel(tier)}
              </span>
              <SupportStatusBadge status={supportStatus} />
            </div>
            <h4 className="mt-2 break-words text-[1.125rem] font-bold text-slate-950">
              {row.instrumentName ?? row.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-[44px] shrink-0 items-center rounded-xl px-3 py-2 text-[15px] font-bold text-red-700 hover:bg-red-50"
          >
            Remove
          </button>
        </div>

        <ReadOnlyFieldGrid row={row} uncertainFields={uncertainFields} />

        {row.reviewReason ? (
          (() => {
            const multipleListing = isMultipleListingGuidanceMessage(
              row.reviewReason,
            );
            if (multipleListing && showPricingListingPicker && row.exchange?.trim()) {
              return (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {PURCHASE_EXCHANGE_CONFIRMED_HELPER}
                </p>
              );
            }
            if (multipleListing && row.providerSymbol?.trim()) {
              return null;
            }
            return (
              <p className="mt-3 flex items-start gap-2 text-[16px] leading-6 text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {row.reviewReason}
              </p>
            );
          })()
        ) : null}
      </div>

      <div className="space-y-4 px-5 py-4 sm:px-6">
        {showFieldEditors ? (
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-amber-700">
              Check these fields
            </p>
            {showExchangeField ? (
              <ExchangeFieldEditor
                key={`${row.id}-exchange`}
                exchange={row.exchange}
                providerSymbol={row.providerSymbol}
                onCommit={onExchangeCommit}
                onFocusChange={setExchangeFieldActive}
                allowFreeText
              />
            ) : null}
            {otherUncertainFields.map((field) => (
              <UncertainFieldEditor
                key={field}
                field={field}
                row={row}
                onChange={(value) => onFieldChange(field, value)}
              />
            ))}
          </div>
        ) : null}

        {showOptionalPurchaseDate ? (
          <OptionalPurchaseDateField row={row} onChange={onFieldChange} />
        ) : null}

        {showPricingListingPicker ? (
          <ListingCandidatePicker
            source={{
              instrumentName: row.instrumentName ?? row.name,
              exchange: row.exchange,
              isin: row.isin,
              matchMethod: row.matchMethod,
              matchConfidence: row.matchConfidence,
              candidates: unresolvedCandidates,
            }}
            selectedProviderSymbol={row.providerSymbol}
            onSelect={onSelectCandidate}
          />
        ) : null}

        {showExactListingFallback ? (
          <ExactListingSymbolField
            disabled={Boolean(row.providerSymbol?.trim())}
            onApply={onManualExactListing}
          />
        ) : null}

        {row.providerSymbol ? (
          <HoldingVenueSummary
            exchange={row.exchange}
            pricingExchange={row.pricingExchange}
            providerSymbol={row.providerSymbol}
            instrumentName={row.instrumentName ?? row.name}
            confirmationSource={row.confirmationSource}
            showPurchaseExchange={!showExchangeField}
          />
        ) : null}

        {purchaseDateError ? (
          <p className="text-sm font-semibold text-red-700">{purchaseDateError}</p>
        ) : null}

        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirmImportRow(row) || purchaseDateError !== null}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-[16px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Confirm this holding
        </button>
      </div>
    </article>
  );
}

function ReadOnlyFieldGrid({
  row,
  uncertainFields,
}: {
  row: ImportRow;
  uncertainFields: ExtractionReviewField[];
}) {
  const uncertain = new Set(uncertainFields);
  const items: Array<{ label: string; value: string }> = [];

  if (row.symbol && !uncertain.has("ticker")) {
    items.push({ label: "Ticker", value: row.symbol });
  }
  if (row.isin && !uncertain.has("isin")) {
    items.push({ label: "ISIN", value: row.isin });
  }
  if (row.exchange && !uncertain.has("exchange")) {
    items.push({ label: "Exchange", value: row.exchange });
  }
  if (!uncertain.has("quantity")) {
    items.push({ label: "Quantity", value: String(row.quantity) });
  }
  if (row.purchasePrice > 0 && !uncertain.has("purchasePrice")) {
    items.push({ label: "Purchase", value: String(row.purchasePrice) });
  }
  if (row.currentPrice > 0 && !uncertain.has("currentPrice")) {
    items.push({ label: "Current", value: String(row.currentPrice) });
  }
  if (row.purchaseDate && !uncertain.has("purchaseDate")) {
    items.push({ label: "Purchased", value: row.purchaseDate });
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="w-full min-w-0 rounded-xl bg-slate-50 px-3 py-2"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-0.5 break-words text-[16px] font-bold text-slate-800">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function UncertainFieldEditor({
  field,
  row,
  onChange,
}: {
  field: ExtractionReviewField;
  row: ImportRow;
  onChange: (value: string | number) => void;
}) {
  const label = extractionFieldLabel(field);
  const inputClass =
    "w-full min-h-[48px] rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-sm font-bold";

  if (field === "quantity" || field === "purchasePrice" || field === "currentPrice") {
    const value =
      field === "quantity"
        ? row.quantity
        : field === "purchasePrice"
          ? row.purchasePrice
          : row.currentPrice;

    return (
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
          {label}
        </span>
        <NumericInput
          value={value}
          onChange={(next) => onChange(next)}
          className={inputClass}
          placeholder="0.00"
        />
      </label>
    );
  }

  if (field === "purchaseDate") {
    return (
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
          {label}
        </span>
        <input
          type="date"
          value={row.purchaseDate ?? ""}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      </label>
    );
  }

  const textValue =
    field === "name"
      ? row.name
      : field === "isin"
        ? row.isin ?? ""
        : row.symbol;

  const identifierTerm = field === "ticker" || field === "isin" ? field : null;
  const labelNode = identifierTerm ? (
    <HoldingIdentifierLabel term={identifierTerm}>
      <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
    </HoldingIdentifierLabel>
  ) : (
    <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
      {label}
    </span>
  );

  return (
    <div className="block min-w-0">
      {labelNode}
      <input
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} ${identifierTerm ? "mt-1.5" : ""}`}
      />
    </div>
  );
}

function OptionalPurchaseDateField({
  row,
  onChange,
}: {
  row: ImportRow;
  onChange: (field: ExtractionReviewField, value: string | number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
        Purchase date <span className="font-semibold normal-case text-slate-500">(optional)</span>
      </span>
      <input
        type="date"
        value={row.purchaseDate ?? ""}
        onChange={(event) => onChange("purchaseDate", event.target.value)}
        className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"
      />
    </label>
  );
}
