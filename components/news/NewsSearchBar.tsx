"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";

import {
  NEWS_SEARCH_PLACEHOLDER,
  NEWS_SEARCH_SCOPE_FILTERS,
  type NewsSearchScopeFilter,
} from "@/lib/services/news/newsSearchFilter";

export function NewsSearchBar({
  query,
  scopeFilter,
  resultCount,
  isActive,
  onQueryChange,
  onScopeFilterChange,
  onClear,
}: {
  query: string;
  scopeFilter: NewsSearchScopeFilter;
  resultCount: number;
  isActive: boolean;
  onQueryChange: (query: string) => void;
  onScopeFilterChange: (scope: NewsSearchScopeFilter) => void;
  onClear: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  useEffect(() => {
    if (expanded) {
      inputRef.current?.focus();
    }
  }, [expanded]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      if (query.trim()) {
        onClear();
        return;
      }

      setExpanded(false);
      inputRef.current?.blur();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClear, query]);

  function openSearch() {
    setExpanded(true);
  }

  function handleClear() {
    onClear();
    inputRef.current?.focus();
  }

  if (!expanded) {
    return (
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={openSearch}
          aria-label="Search verified news"
          aria-expanded={false}
          aria-controls={inputId}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Search verified news"
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          Search verified news
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={NEWS_SEARCH_PLACEHOLDER}
            autoComplete="off"
            enterKeyHint="search"
            className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-10 text-sm text-slate-900 outline-none ring-blue-500 placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2"
          />
          {query ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => {
            if (isActive) {
              onClear();
            }
            setExpanded(false);
          }}
          aria-label="Close search"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        className="mt-3 flex flex-wrap gap-2"
        role="group"
        aria-label="News search filters"
      >
        {NEWS_SEARCH_SCOPE_FILTERS.map((filter) => {
          const active = scopeFilter === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              aria-pressed={active}
              onClick={() => onScopeFilterChange(filter.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.08em] transition sm:px-4 sm:py-2 sm:text-xs ${
                active
                  ? "bg-slate-950 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {isActive ? (
        <p className="mt-3 text-xs font-semibold text-slate-500 sm:text-sm">
          {resultCount} matching result{resultCount === 1 ? "" : "s"}
        </p>
      ) : null}
    </section>
  );
}
