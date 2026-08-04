"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { EXAMPLE_STATUS_CHANGED_EVENT } from "@/lib/client/exampleFirstRun";
import {
  buildTrialExperienceView,
  TRIAL_UPGRADE_HREF,
} from "@/lib/client/trialExperience";
import type { ExampleStatusKind } from "@/lib/services/examplePortfolio/resolveExampleStatus";

type BannerStatus = {
  showBanner: boolean;
  bannerLabel: string | null;
  kind: string;
  daysRemaining?: number;
  startedAt?: string | null;
  expiresAt?: string | null;
};

/**
 * Compact fixed bar under the header for active Premium trials (example portfolios).
 * Status comes from the server entitlement resolver — not stale metadata alone.
 */
export function ExamplePortfolioBanner() {
  const pathname = usePathname();
  const [status, setStatus] = useState<BannerStatus | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/example-portfolio/status", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) {
        setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
        return;
      }
      const payload = (await response.json()) as {
        success?: boolean;
        status?: BannerStatus;
      };
      if (!payload.success || !payload.status) {
        setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
        return;
      }
      setStatus(payload.status);
    } catch {
      setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
    }
  }, []);

  useEffect(() => {
    void load();

    const onStatusChanged = () => {
      void load();
    };
    window.addEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);

    const retryIds = [600, 1_500, 3_000].map((ms) =>
      window.setTimeout(() => {
        void load();
      }, ms),
    );

    return () => {
      window.removeEventListener(EXAMPLE_STATUS_CHANGED_EVENT, onStatusChanged);
      for (const id of retryIds) window.clearTimeout(id);
    };
  }, [load, pathname]);

  const trialView = buildTrialExperienceView({
    kind: (status?.kind as ExampleStatusKind | "none") ?? "none",
    expiresAt: status?.expiresAt ?? null,
    daysRemaining: status?.daysRemaining ?? 0,
  });

  const show =
    Boolean(status?.showBanner) && Boolean(trialView.indicatorLabel);

  useEffect(() => {
    if (!show) {
      document.documentElement.removeAttribute("data-example-banner");
      return;
    }
    document.documentElement.setAttribute("data-example-banner", "true");
    return () => {
      document.documentElement.removeAttribute("data-example-banner");
    };
  }, [show]);

  if (!show || !trialView.indicatorLabel) return null;

  const urgent = trialView.isFinal48Hours;

  return (
    <div
      className={`fixed inset-x-0 top-14 z-[55] border-b px-3 py-2 backdrop-blur sm:top-16 sm:px-4 ${
        urgent
          ? "border-amber-300/80 bg-amber-50/95"
          : "border-brand/25 bg-brand-soft/95"
      }`}
      role="status"
      aria-live="polite"
      data-testid="example-portfolio-banner"
      data-trial-phase={trialView.phase}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <Link
          href={TRIAL_UPGRADE_HREF}
          className={`min-w-0 text-[12px] font-semibold underline-offset-2 hover:underline sm:text-[13px] ${
            urgent ? "text-amber-950" : "text-brand-navy"
          }`}
        >
          {trialView.indicatorLabel}
        </Link>
        <Link
          href={TRIAL_UPGRADE_HREF}
          className={`inline-flex min-h-[36px] items-center rounded-lg px-3 py-1.5 text-[12px] font-bold text-white transition sm:text-[13px] ${
            urgent
              ? "bg-amber-800 hover:bg-amber-900"
              : "bg-navy-hero hover:bg-navy-card"
          }`}
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}
