"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import NumericInput from "@/components/NumericInput";
import { HoldingIdentifierLabel } from "@/components/import/HoldingIdentifierHelp";
import {
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  applyCryptoSearchResultToHolding,
  type CryptoSearchResult,
} from "@/lib/services/portfolio/cryptoCatalog";
import {
  buildCryptoTradingPair,
  CRYPTO_PAIR_CURRENCIES,
  type CryptoPairCurrency,
} from "@/lib/types/cryptoHolding";
import {
  recognizeKnownCrypto,
  validateCryptoHoldingForSave,
  type CryptoFormField,
} from "@/lib/services/portfolio/cryptoHolding";
import {
  resolveCryptoDraftSearchQuery,
  searchCryptoCatalogForPair,
} from "@/lib/client/cryptoCatalogSearch";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type AddCryptoHoldingFormProps = {
  draft: StoredPortfolioHolding;
  isEditing: boolean;
  isSaving: boolean;
  onDraftChange: (draft: StoredPortfolioHolding) => void;
  onClose: () => void;
  onSubmit: (draft: StoredPortfolioHolding) => Promise<void> | void;
};

export function AddCryptoHoldingForm({
  draft,
  isEditing,
  isSaving,
  onDraftChange,
  onClose,
  onSubmit,
}: AddCryptoHoldingFormProps) {
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<CryptoFormField, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<CryptoSearchResult[]>([]);
  const [searchPending, setSearchPending] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const tradingPair = useMemo(() => {
    const symbol = draft.symbol.trim().toUpperCase();
    const pair = (draft.pairCurrency ?? "EUR") as CryptoPairCurrency;
    if (!symbol) {
      return "—";
    }
    return buildCryptoTradingPair(symbol, pair);
  }, [draft.pairCurrency, draft.symbol]);
  const searchQuery = useMemo(
    () => resolveCryptoDraftSearchQuery(draft),
    [draft],
  );
  const selectedSearchResult =
    searchResults.find(
      (result) =>
        result.providerSymbol === draft.providerSymbol ||
        (result.baseAsset === draft.symbol.trim().toUpperCase() &&
          result.requestedDisplayPair === tradingPair),
    ) ?? null;

  function updateDraft(partial: Partial<StoredPortfolioHolding>) {
    onDraftChange({ ...draft, ...partial });
  }

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setSearchPending(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setSearchPending(true);
      setSearchError(null);
      try {
        const response = await searchCryptoCatalogForPair({
          query,
          pairCurrency: draft.pairCurrency ?? "EUR",
        });
        if (!response.success) {
          setSearchResults([]);
          setSearchError(
            response.error ?? "Crypto catalog is temporarily unavailable.",
          );
          return;
        }
        setSearchResults(response.results);
        setSearchError(null);
      } catch {
        setSearchResults([]);
        setSearchError("Crypto catalog is temporarily unavailable.");
      } finally {
        setSearchPending(false);
      }
    }, 220);

    return () => window.clearTimeout(timeout);
  }, [draft.pairCurrency, searchQuery]);

  function handleSymbolChange(value: string) {
    const symbol = value.toUpperCase();
    const recognized = recognizeKnownCrypto({ symbol, name: draft.name });
    onDraftChange({
      ...draft,
      symbol,
      name: recognized?.name ?? draft.name,
      providerSymbol: null,
      providerId: null,
      providerName: null,
      providerDisplayName: null,
      exchange: null,
      pricingStatus: "needs_review",
    });
  }

  function handleNameChange(value: string) {
    const recognized = recognizeKnownCrypto({ name: value, symbol: draft.symbol });
    onDraftChange({
      ...draft,
      name: value,
      symbol: recognized?.symbol ?? draft.symbol,
      providerSymbol: null,
      providerId: null,
      providerName: null,
      providerDisplayName: null,
      exchange: null,
      pricingStatus: "needs_review",
    });
  }

  function selectSearchResult(result: CryptoSearchResult) {
    onDraftChange(applyCryptoSearchResultToHolding(draft, result));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSaving) return;

    const validation = validateCryptoHoldingForSave(draft);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setFormError(validation.message);
      return;
    }

    setFieldErrors({});
    setFormError(null);

    try {
      await onSubmit(draft);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not save this crypto holding. Your entries are kept.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-hero/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
        noValidate
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={appSectionLabelClass}>Crypto</p>
              <h2 className={`mt-2 ${appSectionTitleClass}`}>
                {isEditing ? "Edit crypto holding" : "Add crypto"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-slate-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-7 space-y-5">
            <CryptoField
              id="crypto-name"
              label="Cryptocurrency name"
              required
              value={draft.name}
              error={fieldErrors.name}
              onChange={handleNameChange}
            />
            <CryptoField
              id="crypto-symbol"
              label="Symbol"
              helpTerm="ticker"
              required
              value={draft.symbol}
              error={fieldErrors.symbol}
              onChange={handleSymbolChange}
              autoCapitalize="characters"
            />
            <CryptoAmountField
              id="crypto-amount"
              label="Amount"
              required
              value={draft.quantity}
              error={fieldErrors.amount}
              onChange={(value) => updateDraft({ quantity: value })}
            />
            <div className="block min-w-0">
              <HoldingIdentifierLabel term="currency">
                <span className="text-[15px] font-bold text-slate-800">
                  Pair currency
                </span>
              </HoldingIdentifierLabel>
              <select
                id="crypto-pair-currency"
                value={draft.pairCurrency ?? "EUR"}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    pairCurrency: event.target.value as CryptoPairCurrency,
                    providerSymbol: null,
                    providerId: null,
                    providerName: null,
                    providerDisplayName: null,
                    exchange: null,
                    pricingStatus: "needs_review",
                  })
                }
                className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-blue-400"
              >
                {CRYPTO_PAIR_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </select>
              {fieldErrors.pairCurrency ? (
                <FieldError message={fieldErrors.pairCurrency} />
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={appSectionLabelClass}>Trading pair</p>
              <p className={`mt-1 ${appSectionTitleClass}`}>{tradingPair}</p>
              <p className={`mt-1 ${appSectionMetaClass}`}>
                Portfolio base currency: {draft.portfolioCurrency ?? "EUR"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-500" />
                <p className={appSectionLabelClass}>Crypto search</p>
              </div>
              {searchPending ? (
                <p className={`mt-2 ${appSectionMetaClass}`}>Searching EODHD CC coverage…</p>
              ) : searchError ? (
                <p className="mt-2 text-sm font-medium text-amber-800">
                  Crypto catalog temporarily unavailable. You can still save manually, but live pricing may need review.
                </p>
              ) : searchQuery.trim() && searchResults.length === 0 ? (
                <p className={`mt-2 ${appSectionMetaClass}`}>
                  No matching crypto was found in EODHD CC coverage for this query.
                </p>
              ) : searchResults.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {searchResults.map((result) => {
                    const active =
                      result.providerSymbol != null &&
                      result.providerSymbol === draft.providerSymbol;
                    return (
                      <button
                        key={`${result.baseAsset}:${result.requestedDisplayPair}:${result.providerSymbol ?? "unavailable"}`}
                        type="button"
                        onClick={() => selectSearchResult(result)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? "border-slate-900 bg-navy-hero text-white"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`text-sm font-bold ${active ? "text-white" : "text-slate-950"}`}>
                              {result.name ?? result.baseAsset}
                            </p>
                            <p className={`mt-1 text-xs font-semibold ${active ? "text-white/80" : "text-slate-600"}`}>
                              {result.baseAsset} · {result.requestedDisplayPair}
                            </p>
                            {result.providerSymbol ? (
                              <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-slate-500"}`}>
                                {result.providerSymbol}
                              </p>
                            ) : (
                              <p className={`mt-1 text-xs ${active ? "text-white/70" : "text-amber-700"}`}>
                                Pair not currently resolvable for live pricing.
                              </p>
                            )}
                          </div>
                          {active ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {selectedSearchResult ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <p className={appSectionLabelClass}>Live pricing source</p>
                <p className={`mt-1 ${appSectionTitleClass}`}>EODHD</p>
                {selectedSearchResult.providerSymbol ? (
                  <>
                    <p className={`mt-1 ${appSectionMetaClass}`}>
                      Provider symbol: {selectedSearchResult.providerSymbol}
                    </p>
                    <p className={`mt-1 ${appSectionMetaClass}`}>
                      {selectedSearchResult.conversionApplied
                        ? `${selectedSearchResult.sourcePair} converted to ${selectedSearchResult.requestedDisplayPair}`
                        : `${selectedSearchResult.requestedDisplayPair} is a direct CC pair`}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm font-medium text-amber-800">
                    This query matched the asset, but the selected trading pair is not currently resolvable for live pricing.
                  </p>
                )}
              </div>
            ) : null}

            <CryptoAmountField
              id="crypto-average-price"
              label="Average purchase price (optional)"
              value={draft.purchasePrice}
              error={fieldErrors.averagePurchasePrice}
              onChange={(value) => updateDraft({ purchasePrice: value })}
              optional
            />
            <CryptoField
              id="crypto-platform"
              label="Platform or wallet (optional)"
              value={draft.platform ?? ""}
              onChange={(value) => updateDraft({ platform: value || null })}
            />

            {formError ? (
              <p className="text-sm font-semibold text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-navy-hero px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              "Save crypto holding"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
      {message}
    </p>
  );
}

function CryptoField({
  id,
  label,
  value,
  onChange,
  required = false,
  error,
  autoCapitalize,
  helpTerm,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  autoCapitalize?: "characters";
  helpTerm?: "ticker" | "isin" | "exchange" | "currency";
}) {
  const labelText = (
    <span className="text-[15px] font-bold text-slate-800">
      {label}
      {required ? " *" : ""}
    </span>
  );

  return (
    <div className="block min-w-0">
      {helpTerm ? (
        <HoldingIdentifierLabel term={helpTerm}>{labelText}</HoldingIdentifierLabel>
      ) : (
        <label htmlFor={id} className="block">
          {labelText}
        </label>
      )}
      <input
        id={id}
        required={required}
        value={value}
        autoCapitalize={autoCapitalize}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-blue-400"
      />
      {error ? <FieldError message={error} /> : null}
    </div>
  );
}

function CryptoAmountField({
  id,
  label,
  value,
  onChange,
  required = false,
  optional = false,
  error,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  required?: boolean;
  optional?: boolean;
  error?: string;
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-[15px] font-bold text-slate-800">
        {label}
        {required ? " *" : optional ? "" : ""}
      </span>
      <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
        <NumericInput
          id={id}
          required={required}
          value={value}
          min={0}
          placeholder="0"
          onChange={onChange}
          className="min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none"
        />
      </span>
      {error ? <FieldError message={error} /> : null}
    </label>
  );
}