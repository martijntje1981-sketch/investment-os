"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import {
  fetchExamplePortfolioStatus,
  peekExamplePortfolioStatus,
  subscribeExamplePortfolioStatus,
} from "@/lib/client/examplePortfolioStatusCache";
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
function bannerFromPayload(userSub: string | null): BannerStatus | null {
  const payload = peekExamplePortfolioStatus(userSub);
  if (!payload?.status) return null;
  return {
    showBanner: Boolean(payload.status.showBanner),
    bannerLabel: payload.status.bannerLabel ?? null,
    kind: payload.status.kind ?? "none",
    daysRemaining: payload.status.daysRemaining,
    startedAt: payload.status.startedAt,
    expiresAt: payload.status.expiresAt,
  };
}

export function ExamplePortfolioBanner() {
  const pathname = usePathname();
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [status, setStatus] = useState<BannerStatus | null>(null);

  const load = useCallback(async () => {
    if (!userSub) {
      setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
      return;
    }
    try {
      const payload = await fetchExamplePortfolioStatus({ userSub });
      if (!payload.success || !payload.status) {
        setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
        return;
      }
      setStatus({
        showBanner: Boolean(payload.status.showBanner),
        bannerLabel: payload.status.bannerLabel ?? null,
        kind: payload.status.kind ?? "none",
        daysRemaining: payload.status.daysRemaining,
        startedAt: payload.status.startedAt,
        expiresAt: payload.status.expiresAt,
      });
    } catch {
      setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
    }
  }, [userSub]);

  useEffect(() => {
    if (!authReady || !userSub) {
      setStatus({ showBanner: false, bannerLabel: null, kind: "none" });
      return;
    }

    const peeked = bannerFromPayload(userSub);
    if (peeked) setStatus(peeked);

    const unsubscribe = subscribeExamplePortfolioStatus(() => {
      const next = bannerFromPayload(userSub);
      if (next) setStatus(next);
    });

    void load();

    const retryIds = [600, 1_500, 3_000].map((ms) =>
      window.setTimeout(() => {
        void load();
      }, ms),
    );

    return () => {
      unsubscribe();
      for (const id of retryIds) window.clearTimeout(id);
    };
  }, [authReady, load, pathname, userSub]);

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
