"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import NumericInput from "@/components/NumericInput";
import {
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  buildCryptoTradingPair,
  CRYPTO_PAIR_CURRENCIES,
  type CryptoPairCurrency,
} from "@/lib/types/cryptoHolding";
import {
  isKnownCryptoSymbol,
  recognizeKnownCrypto,
  validateCryptoHoldingForSave,
  type CryptoFormField,
} from "@/lib/services/portfolio/cryptoHolding";
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

  const tradingPair = useMemo(() => {
    const symbol = draft.symbol.trim().toUpperCase();
    const pair = (draft.pairCurrency ?? "EUR") as CryptoPairCurrency;
    if (!symbol) {
      return "—";
    }
    return buildCryptoTradingPair(symbol, pair);
  }, [draft.pairCurrency, draft.symbol]);

  const showUnknownBanner =
    draft.symbol.trim().length > 0 && !isKnownCryptoSymbol(draft.symbol);

  function updateDraft(partial: Partial<StoredPortfolioHolding>) {
    onDraftChange({ ...draft, ...partial });
  }

  function handleSymbolChange(value: string) {
    const symbol = value.toUpperCase();
    const recognized = recognizeKnownCrypto({ symbol, name: draft.name });
    updateDraft({
      symbol,
      name: recognized?.name ?? draft.name,
    });
  }

  function handleNameChange(value: string) {
    const recognized = recognizeKnownCrypto({ name: value, symbol: draft.symbol });
    updateDraft({
      name: value,
      symbol: recognized?.symbol ?? draft.symbol,
    });
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
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
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
            <label className="block min-w-0">
              <span className="text-[15px] font-bold text-slate-800">
                Pair currency
              </span>
              <select
                id="crypto-pair-currency"
                value={draft.pairCurrency ?? "EUR"}
                onChange={(event) =>
                  updateDraft({
                    pairCurrency: event.target.value as CryptoPairCurrency,
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
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className={appSectionLabelClass}>Trading pair</p>
              <p className={`mt-1 ${appSectionTitleClass}`}>{tradingPair}</p>
              <p className={`mt-1 ${appSectionMetaClass}`}>
                Portfolio base currency: {draft.portfolioCurrency ?? "EUR"}
              </p>
            </div>

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

            {showUnknownBanner ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                <p className="text-sm font-bold text-amber-950">
                  Live price unavailable
                </p>
                <p className="mt-2 text-sm leading-relaxed text-amber-900">
                  This asset has not yet been matched to a reliable price source.
                </p>
              </div>
            ) : null}

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
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  autoCapitalize?: "characters";
}) {
  return (
    <label className="block min-w-0" htmlFor={id}>
      <span className="text-[15px] font-bold text-slate-800">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        id={id}
        required={required}
        value={value}
        autoCapitalize={autoCapitalize}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none focus:border-blue-400"
      />
      {error ? <FieldError message={error} /> : null}
    </label>
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