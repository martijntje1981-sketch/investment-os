import type { MacroTopicGroup } from "@/lib/services/news/newsMacroGroups";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import {
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";

export function NewsMacroGroupsSection({
  groups,
}: {
  groups: MacroTopicGroup[];
}) {
  return (
    <section aria-labelledby="news-macro-heading" className="min-w-0 space-y-4">
      <div>
        <h2 id="news-macro-heading" className={appSectionTitleClass}>
          Macro
        </h2>
        <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
          Rates, inflation, central banks, geopolitics, currencies, and commodities.
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-[16px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          No macro coverage in the current brief.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.id} className="min-w-0 space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-700">
              {group.label}
            </h3>
            <ul className="space-y-2">
              {group.items.slice(0, 3).map((item) => (
                <li key={item.id}>
                  <NewsCompactArticleRow item={item} compact />
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}
