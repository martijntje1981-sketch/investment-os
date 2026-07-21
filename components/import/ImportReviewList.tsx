"use client";

import { AlertCircle, Check, ChevronRight } from "lucide-react";
import { useState } from "react";

import NumericInput from "@/components/NumericInput";
import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import {
  extractionFieldLabel,
  getExtractionFieldsNeedingReview,
  shouldReviewExchange,
  type ExtractionReviewField,
} from "@/lib/services/extraction/fieldConfidence";
import {
  getPurchaseDateValidationError,
  importTierLabel,
  roundConfidencePercent,
  type ImportRow,
} from "@/lib/services/import";
import type { ResolvedInstrument } from "@/lib/types/instrument";

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
  onRemove: (id: string) => void;
};

export function ImportReviewList({
  rows,
  onConfirm,
  onSelectCandidate,
  onFieldChange,
  onExchangeCommit,
  onRemove,
}: ImportReviewListProps) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">
          Review needed
        </p>
        <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
          Confirm {rows.length} holding{rows.length === 1 ? "" : "s"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Only uncertain fields are editable. Everything else was read
          automatically.
        </p>
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
  onRemove: () => void;
}) {
  const tier = row.reviewTier ?? "review";
  const confidence = roundConfidencePercent(
    row.matchConfidence ?? row.extractionConfidence,
  );
  const alternatives = buildCandidateOptions(row);
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

  return (
    <article className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
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
              {confidence > 0 ? (
                <span className="text-[11px] font-bold text-slate-500">
                  {confidence}% confidence
                </span>
              ) : null}
            </div>
            <h4 className="mt-2 truncate text-lg font-black text-slate-950">
              {row.instrumentName ?? row.name}
            </h4>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            Remove
          </button>
        </div>

        <ReadOnlyFieldGrid row={row} uncertainFields={uncertainFields} />

        {row.reviewReason ? (
          <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {row.reviewReason}
          </p>
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
                required={needsMatchReview && !row.providerSymbol}
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

        {needsMatchReview && alternatives.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
              Likely matches
            </p>
            <div className="space-y-2">
              {alternatives.map((candidate) => (
                <button
                  key={
                    candidate.providerSymbol ??
                    `${candidate.instrumentName ?? "unknown"}-${candidate.exchange ?? "na"}`
                  }
                  type="button"
                  onClick={() => onSelectCandidate(candidate)}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">
                      {candidate.instrumentName ?? candidate.providerSymbol}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {formatListingLine(candidate)}
                    </p>
                    {candidate.isin ? (
                      <p className="mt-1 text-xs text-slate-500">
                        ISIN: {candidate.isin}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {row.providerSymbol ? (
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
              Selected match
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {row.instrumentName ?? row.name}
            </p>
            <p className="text-xs text-slate-500">{row.providerSymbol}</p>
          </div>
        ) : null}

        {purchaseDateError ? (
          <p className="text-sm font-semibold text-red-700">{purchaseDateError}</p>
        ) : null}

        <button
          type="button"
          onClick={onConfirm}
          disabled={
            (!row.providerSymbol && needsMatchReview) || purchaseDateError !== null
          }
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
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
          className="rounded-xl bg-slate-50 px-3 py-2"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
            {item.label}
          </p>
          <p className="mt-0.5 truncate text-sm font-bold text-slate-800">
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

  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
        {label}
      </span>
      <input
        value={textValue}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
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

function formatListingLine(candidate: ResolvedInstrument): string {
  const ticker =
    candidate.providerSymbol?.split(".")[0] ??
    candidate.instrumentName?.split(" ")[0] ??
    "—";
  const exchange = candidate.exchange ?? "—";
  const currency = candidate.providerSymbol?.endsWith(".US")
    ? "USD"
    : candidate.providerSymbol?.endsWith(".LSE")
      ? "GBP"
      : "EUR";

  return `${ticker} · ${exchange} · ${currency}`;
}

function buildCandidateOptions(row: ImportRow): ResolvedInstrument[] {
  const options: ResolvedInstrument[] = [];

  if (row.providerSymbol) {
    options.push({
      providerSymbol: row.providerSymbol,
      instrumentName: row.instrumentName ?? null,
      exchange: row.exchange ?? null,
      isin: row.isin ?? null,
      matchMethod: row.matchMethod ?? "unresolved",
      confidence: row.matchConfidence ?? 0.8,
      requiresConfirmation: false,
      warnings: [],
    });
  }

  for (const candidate of row.candidates ?? []) {
    if (!candidate.providerSymbol) continue;
    if (
      options.some((item) => item.providerSymbol === candidate.providerSymbol)
    ) {
      continue;
    }
    options.push(candidate);
  }

  return options.slice(0, 4);
}
