import { AlertCircle, Clock3 } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import type { NewsDataStatus } from "@/lib/types/newsContent";

export function NewsDataStatusBanner({
  dataStatus,
  fetchedAt,
  isStale,
}: {
  dataStatus: NewsDataStatus;
  fetchedAt: string;
  isStale?: boolean;
}) {
  if (isStale) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Showing the last successful news refresh from{" "}
          {formatNewsRefreshedAt(fetchedAt)} while live sources reconnect.
        </p>
      </div>
    );
  }

  if (dataStatus.feedsState === "unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Verified news feeds are unavailable right now. No placeholder headlines are shown.
        </p>
      </div>
    );
  }

  if (dataStatus.feedsState === "partial") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Some news sources are temporarily unavailable. Showing verified content from{" "}
          {dataStatus.sourceCount} active source
          {dataStatus.sourceCount === 1 ? "" : "s"}.
        </p>
      </div>
    );
  }

  if (dataStatus.eventsState === "provider_unavailable") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Economic calendar data is unavailable. Upcoming events will appear only when verified
          dates can be loaded.
        </p>
      </div>
    );
  }

  return null;
}
