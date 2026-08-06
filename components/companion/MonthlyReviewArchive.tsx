"use client";

import Link from "next/link";

import type { MonthlyReviewArchiveItem } from "@/lib/services/portfolio/companion/snapshotTypes";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";

type MonthlyReviewArchiveProps = {
  items: MonthlyReviewArchiveItem[];
  selectedYearMonth: string | null;
  loading?: boolean;
};

function directionLabel(direction: MonthlyReviewArchiveItem["direction"]): string {
  if (direction === "up") return "Up";
  if (direction === "down") return "Down";
  if (direction === "flat") return "Steady";
  return "Review";
}

export function MonthlyReviewArchive({
  items,
  selectedYearMonth,
  loading = false,
}: MonthlyReviewArchiveProps) {
  return (
    <section
      className={`${appCardClass} ${appCardPaddingClass}`}
      aria-labelledby="monthly-archive-heading"
    >
      <h2
        id="monthly-archive-heading"
        className="text-base font-bold tracking-[-0.02em] text-slate-950"
      >
        Monthly Reviews
      </h2>

      {loading ? (
        <p className={`mt-3 ${appSectionMetaClass}`} role="status">
          Loading saved reviews…
        </p>
      ) : items.length === 0 ? (
        <p className={`mt-3 ${appSectionMetaClass}`} role="status">
          Your first monthly review will appear after a completed month of
          portfolio history.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => {
            const selected = item.yearMonth === selectedYearMonth;
            return (
              <li key={item.id}>
                <Link
                  href={`/review?period=monthly&month=${encodeURIComponent(item.yearMonth)}`}
                  className={`flex min-h-[48px] items-center justify-between gap-3 py-3 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    selected ? "text-brand-navy" : "text-slate-800"
                  }`}
                  aria-current={selected ? "page" : undefined}
                >
                  <span className="min-w-0">
                    {item.label}
                    {item.isDemo ? (
                      <span className="ml-2 text-[12px] font-semibold text-amber-800">
                        Demo
                      </span>
                    ) : null}
                  </span>
                  <span className={`shrink-0 text-[12px] font-bold ${appSectionMetaClass}`}>
                    {directionLabel(item.direction)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
