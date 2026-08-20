"use client";

import { useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

import {
  appHeroPrimaryButtonClass,
  appSecondaryButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { canDownloadPeriodReportPdf } from "@/lib/services/periodIntelligence/pdf/pdfAccess";
import { periodReportPdfFilename } from "@/lib/services/periodIntelligence/pdf/filename";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import type { ProductAccess } from "@/lib/services/productAccess";

type PeriodReportPdfActionProps = {
  review: PeriodIntelligenceReview | null;
  access: ProductAccess;
  archiveYearMonth?: string | null;
  variant?: "default" | "hero";
};

export function PeriodReportPdfAction({
  review,
  access,
  archiveYearMonth = null,
  variant = "default",
}: PeriodReportPdfActionProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!review || (review.kind !== "weekly" && review.kind !== "monthly")) {
    return null;
  }

  const label =
    review.kind === "monthly" ? "Download monthly report" : "Download weekly report";

  const isHero = variant === "hero";

  if (!canDownloadPeriodReportPdf(access)) {
    return (
      <p
        className={
          isHero
            ? "text-[15px] font-medium leading-relaxed text-white"
            : "text-[15px] font-medium leading-relaxed text-slate-600"
        }
      >
        PDF download is included with Complete.{" "}
        <Link
          href={access.upgradeHref}
          className={
            isHero
              ? "inline-flex min-h-[44px] items-center font-semibold text-white underline underline-offset-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
              : appTextLinkClass
          }
        >
          {access.upgradeCtaLabel}
        </Link>
      </p>
    );
  }

  if (!review.ready) {
    return null;
  }

  async function handleDownload() {
    if (!review || busy) return;
    setBusy(true);
    setError(null);
    try {
      const useArchive =
        review.kind === "monthly" &&
        Boolean(archiveYearMonth) &&
        /^\d{4}-\d{2}$/.test(archiveYearMonth ?? "");
      const response = useArchive
        ? await fetch(`/api/review/monthly/${archiveYearMonth}/pdf`, {
            credentials: "same-origin",
          })
        : await fetch("/api/review/pdf", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ review }),
          });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          payload?.error ??
            "The PDF could not be created. Your review is still available here.",
        );
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = periodReportPdfFilename(review);
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(
        "The PDF could not be created. Your review is still available here.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void handleDownload()}
        disabled={busy}
        aria-busy={busy}
        className={isHero ? appHeroPrimaryButtonClass : appSecondaryButtonClass}
        data-testid="period-report-pdf-download"
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        {busy ? "Preparing PDF…" : label}
      </button>
      {error ? (
        <p
          className={
            isHero
              ? "text-sm font-semibold text-rose-200"
              : "text-sm font-semibold text-rose-700"
          }
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
