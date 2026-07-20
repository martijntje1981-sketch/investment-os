"use client";

import type { MarketNewsCategoryFilter } from "@/lib/navigation/newsHubRoutes";
import { MARKET_NEWS_CATEGORY_FILTERS } from "@/lib/navigation/newsHubRoutes";

export function MarketCategoryFilters({
  activeCategory,
  onCategoryChange,
}: {
  activeCategory: MarketNewsCategoryFilter;
  onCategoryChange: (category: MarketNewsCategoryFilter) => void;
}) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1"
      role="group"
      aria-label="Market news categories"
    >
      {MARKET_NEWS_CATEGORY_FILTERS.map((filter) => {
        const active = activeCategory === filter.id;
        return (
          <button
            key={filter.id}
            type="button"
            onClick={() => onCategoryChange(filter.id)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.08em] transition ${
              active
                ? "bg-blue-700 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
