"use client";

import { useId, useState, type ReactNode } from "react";
import {
  appSectionBodyClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { newsShowMoreButtonClass } from "@/components/news/newsCardStyles";

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
  const listId = useId().replace(/:/g, "");
  const regionId = `${id}-list-${listId}`;
  const visibleItems = expanded ? allItems : allItems.slice(0, previewLimit);
  const hasMore = allItems.length > previewLimit;

  return (
    <section aria-labelledby={id} className="min-w-0 space-y-3">
      <div>
        <h2 id={id} className={appSectionTitleClass}>
          {title}
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>{description}</p>
      </div>

      {allItems.length === 0 ? (
        <p
          className={`rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 ${appSectionBodyClass}`}
        >
          <span className="font-semibold text-slate-800">{emptyTitle}</span>
          {" — "}
          {emptyDescription}
        </p>
      ) : (
        <>
          <ul id={regionId} className="space-y-2">
            {visibleItems.map((item, index) => (
              <li key={item.id ?? `${id}-${index}`}>{renderItem(item)}</li>
            ))}
          </ul>
          {hasMore ? (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={regionId}
              onClick={() => setExpanded((current) => !current)}
              className={newsShowMoreButtonClass}
            >
              {expanded
                ? "Show less"
                : `Show more (${allItems.length - previewLimit})`}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
}

export function NewsExpandableList<T extends { id?: string }>({
  id,
  allItems,
  previewLimit = 5,
  renderItem,
}: {
  id: string;
  allItems: T[];
  previewLimit?: number;
  renderItem: (item: T) => ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const listId = useId().replace(/:/g, "");
  const regionId = `${id}-list-${listId}`;
  const visibleItems = expanded ? allItems : allItems.slice(0, previewLimit);
  const hasMore = allItems.length > previewLimit;

  if (allItems.length === 0) {
    return null;
  }

  return (
    <>
      <ul id={regionId} className="space-y-2">
        {visibleItems.map((item, index) => (
          <li key={item.id ?? `${id}-${index}`}>{renderItem(item)}</li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={regionId}
          onClick={() => setExpanded((current) => !current)}
          className={newsShowMoreButtonClass}
        >
          {expanded
            ? "Show less"
            : `Show more (${allItems.length - previewLimit})`}
        </button>
      ) : null}
    </>
  );
}
