"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check } from "lucide-react";

import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";
import {
  findExchangeOption,
  formatExchangeInputValue,
  getCommonExchangeOptions,
  searchExchanges,
  type ExchangeOption,
} from "@/lib/services/instruments/exchangeSearch";

type ExchangeFieldEditorProps = {
  exchange: string | null | undefined;
  providerSymbol?: string | null;
  onCommit: (exchangeCode: string | null, confirmed: boolean) => void;
  onFocusChange?: (active: boolean) => void;
  required?: boolean;
  allowFreeText?: boolean;
};

export function ExchangeFieldEditor({
  exchange,
  providerSymbol,
  onCommit,
  onFocusChange,
  required = false,
  allowFreeText = false,
}: ExchangeFieldEditorProps) {
  const listboxId = useId();
  const isTypingRef = useRef(false);
  const [exchangeInputValue, setExchangeInputValue] = useState(() =>
    formatExchangeInputValue(exchange),
  );
  const [selectedExchange, setSelectedExchange] = useState<ExchangeOption | null>(
    () => findExchangeOption(exchange),
  );
  const [exchangeSuggestions, setExchangeSuggestions] = useState<ExchangeOption[]>(
    [],
  );
  const [isSearchingExchanges, setIsSearchingExchanges] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isTypingRef.current) return;

    const nextSelected = findExchangeOption(exchange);
    setSelectedExchange(nextSelected);
    setExchangeInputValue(formatExchangeInputValue(exchange));
  }, [exchange, providerSymbol]);

  useEffect(() => {
    const query = exchangeInputValue.trim();

    if (query.length < 2) {
      setExchangeSuggestions([]);
      setIsSearchingExchanges(false);
      return;
    }

    setIsSearchingExchanges(true);

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        const results = await searchExchanges(query, {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) {
          setExchangeSuggestions(results);
          setShowSuggestions(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("Exchange search failed", error);
          setExchangeSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearchingExchanges(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [exchangeInputValue]);

  function handleInputChange(nextValue: string) {
    isTypingRef.current = true;
    setValidationMessage(null);
    setExchangeInputValue(nextValue);
    setShowSuggestions(true);

    if (
      selectedExchange &&
      nextValue !== selectedExchange.label &&
      nextValue !== selectedExchange.code
    ) {
      setSelectedExchange(null);
    }
  }

  function handleExchangeSelect(option: ExchangeOption) {
    isTypingRef.current = false;
    setSelectedExchange(option);
    setExchangeInputValue(option.label);
    setExchangeSuggestions([]);
    setShowSuggestions(false);
    setValidationMessage(null);
    onFocusChange?.(false);
    onCommit(option.code, true);
  }

  function commitFreeTextExchange(trimmed: string) {
    const normalized = normalizeExchange(trimmed) ?? trimmed.toUpperCase();
    setValidationMessage(null);
    onCommit(normalized, false);
  }

  function handleBlur() {
    window.setTimeout(() => {
      setShowSuggestions(false);

      if (selectedExchange) {
        isTypingRef.current = false;
        onFocusChange?.(false);
        return;
      }

      const trimmed = exchangeInputValue.trim();
      if (!trimmed) {
        if (required) {
          setValidationMessage("Select a listed exchange to match this holding.");
        } else {
          onCommit(null, false);
        }
        isTypingRef.current = false;
        onFocusChange?.(false);
        return;
      }

      const matched = findExchangeOption(trimmed);
      if (matched) {
        isTypingRef.current = false;
        setSelectedExchange(matched);
        setExchangeInputValue(matched.label);
        onCommit(matched.code, true);
        onFocusChange?.(false);
        return;
      }

      if (allowFreeText) {
        isTypingRef.current = false;
        commitFreeTextExchange(trimmed);
        onFocusChange?.(false);
        return;
      }

      isTypingRef.current = false;
      onFocusChange?.(false);
      setValidationMessage(
        "No exchange found. Try the exchange name or code.",
      );
    }, 120);
  }

  const showEmptyState =
    showSuggestions &&
    exchangeInputValue.trim().length >= 2 &&
    !isSearchingExchanges &&
    exchangeSuggestions.length === 0;

  const purchaseExchangeConfirmed = Boolean(selectedExchange);

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.1em] text-slate-400">
          Purchase exchange
        </span>
        {purchaseExchangeConfirmed ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800">
            <Check className="h-3 w-3" aria-hidden />
            Confirmed
          </span>
        ) : null}
      </span>
      <div className="relative">
        <input
          type="text"
          role="combobox"
          value={exchangeInputValue}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={showSuggestions && exchangeSuggestions.length > 0}
          aria-describedby={
            purchaseExchangeConfirmed ? "purchase-exchange-confirmed" : undefined
          }
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => {
            onFocusChange?.(true);
            if (exchangeInputValue.trim().length >= 2) {
              setShowSuggestions(true);
              return;
            }
            if (allowFreeText) {
              setExchangeSuggestions(getCommonExchangeOptions());
              setShowSuggestions(true);
            }
          }}
          onBlur={handleBlur}
          className={`w-full min-h-[48px] rounded-xl border px-4 py-3 text-sm font-bold outline-none ${
            purchaseExchangeConfirmed
              ? "border-emerald-300 bg-emerald-50/50 focus:border-emerald-400"
              : "border-slate-200 bg-slate-50 focus:border-blue-400"
          }`}
        />

        {purchaseExchangeConfirmed ? (
          <p
            id="purchase-exchange-confirmed"
            className="mt-1.5 text-xs font-semibold text-emerald-800"
          >
            {selectedExchange!.label} selected as purchase venue.
          </p>
        ) : null}

        {isSearchingExchanges ? (
          <p className="mt-1.5 text-xs font-semibold text-slate-500">
            Searching exchanges…
          </p>
        ) : null}

        {showEmptyState ? (
          <p className="mt-1.5 text-xs font-semibold text-slate-600">
            {allowFreeText
              ? "No exchange match found. You can keep your text or leave this blank."
              : "No exchange found. Try the exchange name or code."}
          </p>
        ) : null}

        {validationMessage ? (
          <p className="mt-1.5 text-xs font-semibold text-red-700">
            {validationMessage}
          </p>
        ) : null}

        {showSuggestions && exchangeSuggestions.length > 0 ? (
          <ul
            id={listboxId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {exchangeSuggestions.map((option) => (
              <li key={option.code} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleExchangeSelect(option)}
                  className="flex w-full flex-col items-start px-4 py-2.5 text-left hover:bg-blue-50"
                >
                  <span className="text-sm font-bold text-slate-900">
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500">{option.code}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </label>
  );
}
