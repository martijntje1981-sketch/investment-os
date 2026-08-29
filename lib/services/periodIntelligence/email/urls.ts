import { REVIEW_PATH, SETTINGS_PATH } from "@/lib/navigation/appRoutes";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";

export function periodReportSiteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.tobailey.com";
  return raw.replace(/\/$/, "");
}

export function periodReportViewUrl(
  kind: PeriodIntelligenceKind,
  periodKey: string,
): string {
  const origin = periodReportSiteOrigin();
  if (kind === "monthly") {
    return `${origin}${REVIEW_PATH}?period=monthly&month=${encodeURIComponent(periodKey)}`;
  }
  return `${origin}${REVIEW_PATH}?period=weekly`;
}

export function periodReportPdfUrl(kind: PeriodIntelligenceKind, periodKey: string): string {
  return periodReportViewUrl(kind, periodKey);
}

export function periodReportSettingsUrl(): string {
  return `${periodReportSiteOrigin()}${SETTINGS_PATH}#reports-email`;
}
