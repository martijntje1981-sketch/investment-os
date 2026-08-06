"use client";

import type { NewsHubTab } from "@/lib/navigation/newsHubRoutes";
import { NEWS_HUB_TABS } from "@/lib/navigation/newsHubRoutes";

export function NewsHubTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: NewsHubTab;
  onTabChange: (tab: NewsHubTab) => void;
}) {
  return (
    <div
      className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-[#F4F7FB]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:rounded-[24px] sm:border sm:bg-white sm:px-3 sm:py-2"
      role="tablist"
      aria-label="Market news and upcoming events"
    >
      <div className="grid grid-cols-2 gap-2">
        {NEWS_HUB_TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-2xl px-4 py-3 text-left transition ${
                active
                  ? "bg-slate-950 text-white shadow-lg"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-black">{tab.label}</span>
              <span
                className={`mt-1 block text-[11px] leading-5 ${
                  active ? "text-slate-300" : "text-slate-500"
                }`}
              >
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
