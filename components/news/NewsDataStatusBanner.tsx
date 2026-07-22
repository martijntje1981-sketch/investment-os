import { AlertCircle, Clock3 } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import {
  NEWS_STALE_REFRESH_MESSAGE_PREFIX,
  NEWS_UNAVAILABLE_MESSAGE,
  resolveNewsPageWarning,
} from "@/lib/services/news/newsSourceHealth";
import type { NewsApiResponse, NewsDataStatus } from "@/lib/types/newsContent";

export function NewsDataStatusBanner({
  dataStatus,
  fetchedAt,
  isStale,
  verifiedItemCount = 0,
  sourceErrorCount = 0,
}: {
  dataStatus: NewsDataStatus;
  fetchedAt: string;
  isStale?: boolean;
  verifiedItemCount?: number;
  sourceErrorCount?: number;
}) {
  if (isStale) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          {NEWS_STALE_REFRESH_MESSAGE_PREFIX}{" "}
          {formatNewsRefreshedAt(fetchedAt)} while live sources reconnect.
        </p>
      </div>
    );
  }

  if (dataStatus.feedsState === "cached" && dataStatus.eodhdLastUpdated) {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
        <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Wire headlines last updated {formatNewsRefreshedAt(dataStatus.eodhdLastUpdated)}.
          Live refresh is temporarily unavailable.
        </p>
      </div>
    );
  }

  const warning = resolveNewsPageWarning({
    dataStatus,
    sourceErrorCount,
    verifiedItemCount,
    isStale,
  });

  if (!warning.show || !warning.message) {
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

  const tone =
    dataStatus.feedsState === "unavailable"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${tone}`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{warning.message ?? NEWS_UNAVAILABLE_MESSAGE}</p>
    </div>
  );
}

export function countNewsHubVerifiedItems(payload: NewsApiResponse): number {
  return (
    payload.portfolioNews.length +
    payload.macroNews.length +
    payload.marketVideos.length +
    (payload.dividendNews?.length ?? 0) +
    (payload.analystNews?.length ?? 0)
  );
}
