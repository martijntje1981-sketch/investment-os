"use client";

import { useState, type ReactNode } from "react";

export function NewsBriefingSection<T extends { id?: string }>({
  id,
  title,
  description,
  allItems,
  previewLimit = 5,
  emptyTitle,
  emptyDescription,
  renderItem,
}: {
  id: string;
  title: string;
  description: string;
  allItems: T[];
  previewLimit?: number;
  emptyTitle: string;
  emptyDescription: string;
  renderItem: (item: T) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleItems = expanded ? allItems : allItems.slice(0, previewLimit);
  const hasMore = allItems.length > previewLimit;

  return (
    <section aria-labelledby={id} className="min-w-0 space-y-3">
      <div>
        <h2 id={id} className="text-lg font-black tracking-[-0.02em] text-slate-950">
          {title}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{description}</p>
      </div>

      {allItems.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          <span className="font-semibold text-slate-800">{emptyTitle}</span>
          {" — "}
          {emptyDescription}
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {visibleItems.map((item, index) => (
              <li key={item.id ?? `${id}-${index}`}>{renderItem(item)}</li>
            ))}
          </ul>
          {hasMore && !expanded ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Show more ({allItems.length - previewLimit})
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}
